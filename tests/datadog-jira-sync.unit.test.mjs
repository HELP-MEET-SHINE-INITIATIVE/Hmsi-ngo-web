import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  MemoryIdempotencyStore,
  buildJiraPayload,
  createHandler,
  externalAlertKey,
  normalizeAndScrub,
  verifyHmacSignature,
} from "../integrations/datadog-jira-sync.mjs";

const secret = "unit-test-secret";
const jiraConfig = {
  projectKey: "HMSI",
  issueTypeId: "10001",
  priorityNames: { critical: "Highest", high: "High", medium: "Medium", low: "Low" },
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
    source: "datadog",
    monitor_id: "DDM-RESTORE-001",
    monitor_title: "Public boundary validation failed",
    alert_status: "threshold breached",
    alert_transition: "Triggered",
    alert_priority: "P0",
    alert_cycle_key: "cycle-synthetic-001",
    occurred_at_posix: 1787729000,
    datadog_event_url: "https://app.datadoghq.com/event/123",
    environment: "staging",
    component: "hmsi-public-boundary",
    reason_category: "public_boundary_violation",
    article_body: "PRIVATE ARTICLE BODY MUST NOT ESCAPE",
    contributor_email: "person@example.invalid",
    access_token: "secret-token",
    ...overrides,
  };
}

function signed(body) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function createAuditSink() {
  const events = [];
  return { events, audit: async event => events.push(event) };
}

test("normalizeAndScrub removes sensitive fields and keeps bounded operational data", () => {
  const alert = normalizeAndScrub(fixture());
  assert.equal(alert.monitorId, "DDM-RESTORE-001");
  assert.equal(alert.reasonCategory, "public_boundary_violation");
  assert.equal(alert.severity, "critical");
  assert.equal("article_body" in alert, false);
  assert.equal("contributor_email" in alert, false);
  assert.equal("access_token" in alert, false);
});

test("normalizeAndScrub rejects unknown monitors and malformed inputs", () => {
  assert.throws(() => normalizeAndScrub(fixture({ monitor_id: "unknown-monitor" })), /Monitor is not allowlisted/);
  assert.throws(() => normalizeAndScrub(fixture({ alert_transition: "Published" })), /Unsupported alert transition/);
  assert.throws(() => normalizeAndScrub(fixture({ environment: "prod" })), /Environment is not allowed/);
});

test("HMAC verification is timing-safe and rejects tampering", () => {
  const body = JSON.stringify(fixture());
  assert.equal(verifyHmacSignature(body, signed(body), secret), true);
  assert.equal(verifyHmacSignature(body + " ", signed(body), secret), false);
  assert.equal(verifyHmacSignature(body, signed(body), "wrong-secret"), false);
});

test("external alert keys are deterministic", () => {
  const alert = normalizeAndScrub(fixture());
  assert.equal(externalAlertKey(alert), "datadog:staging:DDM-RESTORE-001:cycle-synthetic-001:triggered");
});

test("dry-run accepts a valid alert without calling Jira", async () => {
  const sink = createAuditSink();
  let jiraCalls = 0;
  const handler = createHandler({
    secret,
    dryRun: true,
    audit: sink.audit,
    jira: { upsertCorrectiveAction: async () => { jiraCalls += 1; return { key: "HMSI-1", created: true }; } },
    jiraConfig,
  });
  const body = JSON.stringify(fixture());
  const result = await handler({ rawBody: body, signature: signed(body), requestId: "req-dry-run" });
  assert.equal(result.status, 200);
  assert.equal(result.body.dryRun, true);
  assert.equal(jiraCalls, 0);
  assert.equal(sink.events.some(event => event.event === "dry_run"), true);
});

test("duplicate delivery is idempotent and calls Jira once", async () => {
  const sink = createAuditSink();
  const store = new MemoryIdempotencyStore();
  let jiraCalls = 0;
  const handler = createHandler({
    secret,
    dryRun: false,
    idempotency: store,
    audit: sink.audit,
    jira: {
      upsertCorrectiveAction: async (key, payload) => {
        jiraCalls += 1;
        assert.equal(payload.fields.customfield_10001, key);
        return { key: "HMSI-42", created: true };
      },
    },
    jiraConfig,
  });
  const body = JSON.stringify(fixture());
  const first = await handler({ rawBody: body, signature: signed(body), requestId: "req-1" });
  const second = await handler({ rawBody: body, signature: signed(body), requestId: "req-2" });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.body.duplicate, true);
  assert.equal(jiraCalls, 1);
});

test("invalid signature produces no Jira call and only bounded audit data", async () => {
  const sink = createAuditSink();
  let jiraCalls = 0;
  const handler = createHandler({
    secret,
    dryRun: false,
    audit: sink.audit,
    jira: { upsertCorrectiveAction: async () => { jiraCalls += 1; return { key: "HMSI-1" }; } },
    jiraConfig,
  });
  const body = JSON.stringify(fixture());
  const result = await handler({ rawBody: body, signature: "not-valid", requestId: "req-auth" });
  assert.equal(result.status, 401);
  assert.equal(jiraCalls, 0);
  assert.deepEqual(sink.events[0], { requestId: "req-auth", event: "rejected", reason: "invalid_source_auth" });
});

test("sensitive fields never appear in the Jira payload", () => {
  const alert = normalizeAndScrub(fixture());
  const key = externalAlertKey(alert);
  const payload = JSON.stringify(buildJiraPayload(alert, key, jiraConfig));
  assert.equal(payload.includes("PRIVATE ARTICLE BODY"), false);
  assert.equal(payload.includes("person@example.invalid"), false);
  assert.equal(payload.includes("secret-token"), false);
  assert.equal(payload.includes("customfield_10001"), true);
});

test("Jira failure returns retryable 500 and releases idempotency lock", async () => {
  const store = new MemoryIdempotencyStore();
  const sink = createAuditSink();
  const handler = createHandler({
    secret,
    dryRun: false,
    idempotency: store,
    audit: sink.audit,
    jira: { upsertCorrectiveAction: async () => { throw Object.assign(new Error("rate limited"), { status: 429, retryable: true }); } },
    jiraConfig,
  });
  const body = JSON.stringify(fixture());
  const first = await handler({ rawBody: body, signature: signed(body), requestId: "req-retry" });
  const second = await handler({ rawBody: body, signature: signed(body), requestId: "req-retry-2" });
  assert.equal(first.status, 500);
  assert.equal(first.body.error, "retryable_sync_failure");
  assert.equal(second.status, 500);
  assert.equal(sink.events.filter(event => event.event === "failed").length, 2);
});
