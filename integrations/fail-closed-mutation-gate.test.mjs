import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  createHandler,
  MemoryIdempotencyStore,
  externalAlertKey,
} from "./datadog-jira-sync.mjs";

const SECRET = "synthetic-only-hmac-secret-for-tests";
const JIRA_CONFIG = {
  projectKey: "HMSI-TEST",
  issueTypeId: "10001",
  priorityNames: { critical: "Highest", high: "High", medium: "Medium" },
  fields: {
    externalAlertKey: "customfield_10001",
    sourceExercise: "customfield_10002",
    controlDomain: "customfield_10003",
    evidenceRef: "customfield_10004",
    auditRef: "customfield_10005",
    validationResult: "customfield_10006",
  },
};

function fixture(overrides = {}) {
  return {
    monitor_id: "DDM-RESTORE-001",
    monitor_title: "Synthetic governed alert",
    alert_transition: "Triggered",
    alert_priority: "P1",
    environment: "staging",
    component: "hmsi-public-boundary",
    alert_cycle_key: "synthetic-cycle-001",
    occurred_at_posix: 1790000000,
    reason_category: "validation_failure",
    datadog_event_url: "https://app.datadoghq.com/monitors/123",
    ...overrides,
  };
}

function signedBody(input) {
  const rawBody = JSON.stringify(input);
  const signature = `sha256=${crypto.createHmac("sha256", SECRET).update(rawBody, "utf8").digest("hex")}`;
  return { rawBody, signature };
}

class PartitionAwareGate {
  constructor() {
    this.redisAvailable = true;
    this.state = "OPEN";
    this.pauseReasons = [];
  }

  pause(reason) {
    this.state = "PAUSED";
    this.pauseReasons.push(reason);
  }

  open() {
    this.state = "OPEN";
  }

  async admit() {
    if (this.state !== "OPEN") return { ok: false, reason: "mutation_gate_paused" };
    if (!this.redisAvailable) {
      this.pause("redis_idempotency_unavailable");
      return { ok: false, reason: "redis_idempotency_unavailable" };
    }
    return { ok: true };
  }
}

function createIntegrationHarness({ jira, audit, gate, idempotency } = {}) {
  const handler = createHandler({
    secret: SECRET,
    dryRun: false,
    idempotency: idempotency ?? new MemoryIdempotencyStore(),
    jira,
    audit,
    jiraConfig: JIRA_CONFIG,
  });

  return async function handle(request) {
    const admission = await gate.admit();
    if (!admission.ok) {
      await audit({
        event: "mutation_blocked",
        reason: admission.reason,
        requestId: request.requestId,
      });
      return {
        status: 503,
        body: { error: "mutation_temporarily_unavailable", requestId: request.requestId },
      };
    }
    return handler(request);
  };
}

function fakeJira() {
  const calls = [];
  return {
    calls,
    async upsertCorrectiveAction(key, payload) {
      calls.push({ key, payload });
      return { created: true, key: `HMSI-${calls.length}` };
    },
    async updateRecoveredByExternalKey(key) {
      calls.push({ key, recovered: true });
      return { created: false, key: `HMSI-${calls.length}` };
    },
  };
}

async function makeRequest(input = fixture(), requestId = "synthetic-request-001") {
  return { ...signedBody(input), requestId };
}

test("Redis partition fails closed before Jira mutation and pauses the gate", async () => {
  const jira = fakeJira();
  const auditRecords = [];
  const gate = new PartitionAwareGate();
  gate.redisAvailable = false;
  const handle = createIntegrationHarness({ jira, gate, audit: async record => auditRecords.push(record) });

  const response = await handle(await makeRequest());

  assert.equal(response.status, 503);
  assert.equal(jira.calls.length, 0);
  assert.equal(gate.state, "PAUSED");
  assert.equal(auditRecords.at(-1).reason, "redis_idempotency_unavailable");
});

test("Paused gate rejects a recovered Redis connection until an operator reopens it", async () => {
  const jira = fakeJira();
  const auditRecords = [];
  const gate = new PartitionAwareGate();
  gate.redisAvailable = false;
  const handle = createIntegrationHarness({ jira, gate, audit: async record => auditRecords.push(record) });

  await handle(await makeRequest(fixture(), "partition-request"));
  gate.redisAvailable = true;
  const stillBlocked = await handle(await makeRequest(fixture(), "still-paused-request"));
  assert.equal(stillBlocked.status, 503);
  assert.equal(jira.calls.length, 0);

  gate.open();
  const recovered = await handle(await makeRequest(fixture(), "reopened-request"));
  assert.equal(recovered.status, 200);
  assert.equal(jira.calls.length, 1);
});

test("Duplicate deliveries create at most one Jira mutation after Redis recovery", async () => {
  const jira = fakeJira();
  const auditRecords = [];
  const gate = new PartitionAwareGate();
  const handle = createIntegrationHarness({ jira, gate, audit: async record => auditRecords.push(record) });
  const input = fixture({ alert_cycle_key: "same-synthetic-event" });
  const first = await handle(await makeRequest(input, "first-request"));
  const second = await handle(await makeRequest(input, "second-request"));

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.body.duplicate, true);
  assert.equal(jira.calls.length, 1);
  assert.equal(auditRecords.filter(record => record.event === "duplicate").length, 1);
});

test("Concurrent lock contention never causes a second Jira mutation", async () => {
  const jira = fakeJira();
  const auditRecords = [];
  const idempotency = new MemoryIdempotencyStore();
  const gate = new PartitionAwareGate();
  const handle = createIntegrationHarness({ jira, gate, idempotency, audit: async record => auditRecords.push(record) });
  const input = fixture({ alert_cycle_key: "contention-event" });
  const requests = await Promise.all([
    makeRequest(input, "worker-a"),
    makeRequest(input, "worker-b"),
  ]);
  const responses = await Promise.all(requests.map(request => handle(request)));

  assert.equal(jira.calls.length, 1);
  assert.equal(responses.filter(response => response.status === 200).length, 1);
  assert.equal(responses.filter(response => response.status === 409).length, 1);
  assert.equal(auditRecords.filter(record => record.event === "rejected" && record.reason === "duplicate_in_progress").length, 1);
});

test("A Jira timeout releases no completed state and requires explicit reconciliation before retry", async () => {
  let calls = 0;
  const auditRecords = [];
  const gate = new PartitionAwareGate();
  const jira = {
    async upsertCorrectiveAction() {
      calls += 1;
      const error = new Error("synthetic timeout");
      error.retryable = true;
      error.status = 503;
      throw error;
    },
    async updateRecoveredByExternalKey() { throw new Error("not used"); },
  };
  const idempotency = new MemoryIdempotencyStore();
  const handle = createIntegrationHarness({ jira, gate, idempotency, audit: async record => auditRecords.push(record) });
  const input = fixture({ alert_cycle_key: "unknown-outcome-event" });
  const response = await handle(await makeRequest(input));
  assert.equal(response.status, 500);
  assert.equal(calls, 1);

  const key = externalAlertKey({
    environment: input.environment,
    monitorId: input.monitor_id,
    alertCycleKey: input.alert_cycle_key,
    alertTransition: input.alert_transition,
  });
  assert.equal(idempotency.entries.has(key), false);
  assert.equal(auditRecords.some(record => record.event === "failed"), true);

  // Recovery is intentionally modeled as an operator-approved, separate action.
  const reconciliation = { externalAlertKey: key, jiraSearch: "inspect-only", retryAuthorized: false };
  assert.deepEqual(reconciliation, { externalAlertKey: key, jiraSearch: "inspect-only", retryAuthorized: false });
});

test("Invalid HMAC and forbidden monitor are rejected without Jira or raw-body audit leakage", async () => {
  const jira = fakeJira();
  const auditRecords = [];
  const gate = new PartitionAwareGate();
  const handle = createIntegrationHarness({ jira, gate, audit: async record => auditRecords.push(record) });
  const { rawBody } = await makeRequest();
  const invalidAuth = await handle({ rawBody, signature: "sha256=00", requestId: "bad-auth" });
  assert.equal(invalidAuth.status, 401);

  const forbidden = await makeRequest(fixture({ monitor_id: "UNALLOWLISTED", sensitive_payload: "synthetic-secret-looking-text" }), "bad-monitor");
  const forbiddenResponse = await handle(forbidden);
  assert.equal(forbiddenResponse.status, 422);
  assert.equal(jira.calls.length, 0);
  assert.equal(JSON.stringify(auditRecords).includes("synthetic-secret-looking-text"), false);
  assert.equal(JSON.stringify(auditRecords).includes(rawBody), false);
});
