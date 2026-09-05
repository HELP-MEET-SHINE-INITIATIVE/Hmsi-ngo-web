import crypto from "node:crypto";

const ALLOWED_MONITORS = new Set([
  "DDM-RESTORE-001",
  "DDM-RESTORE-002",
  "DDM-RESTORE-004",
  "DDM-RESTORE-005",
  "DDM-RESTORE-006",
]);

const ALLOWED_ENVIRONMENTS = new Set(["production", "staging", "development"]);
const ALLOWED_COMPONENTS = new Set(["hmsi-news-restoration", "hmsi-public-boundary"]);
const ALLOWED_REASONS = new Set([
  "public_boundary_violation",
  "audit_write_failure",
  "restoration_conflict",
  "unauthorized_attempt",
  "validation_failure",
  "review_backlog",
  "reconciliation_drift",
]);
const ALLOWED_TRANSITIONS = new Set([
  "Triggered",
  "Re-Triggered",
  "Recovered",
  "No Data",
  "Re-No Data",
  "Renotify",
]);

export class SyncError extends Error {
  constructor(code, message, { retryable = false, status = 422 } = {}) {
    super(message);
    this.name = "SyncError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

function boundedString(value, field, max = 160) {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    throw new SyncError("invalid_" + field, `Invalid ${field}`);
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
    throw new SyncError("invalid_" + field, `Invalid ${field}`);
  }
  return value;
}

function parseTransition(value) {
  const transition = boundedString(value, "alert_transition", 32);
  if (!ALLOWED_TRANSITIONS.has(transition)) {
    throw new SyncError("invalid_alert_transition", "Unsupported alert transition");
  }
  return transition;
}

function parsePosixTimestamp(value) {
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 4102444800) {
    throw new SyncError("invalid_timestamp", "Invalid event timestamp");
  }
  return new Date(seconds * 1000).toISOString();
}

function parseApprovedDatadogUrl(value) {
  if (value == null || value === "") return undefined;
  const raw = boundedString(value, "datadog_event_url", 512);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new SyncError("invalid_datadog_url", "Invalid Datadog event URL");
  }
  if (url.protocol !== "https:" || !/(^|\.)datadoghq\.com$/.test(url.hostname)) {
    throw new SyncError("invalid_datadog_url", "Unapproved Datadog event URL");
  }
  return url.toString();
}

function mapSeverity(priority, reasonCategory) {
  if (reasonCategory === "public_boundary_violation" || reasonCategory === "audit_write_failure") {
    return "critical";
  }
  if (reasonCategory === "unauthorized_attempt" || reasonCategory === "restoration_conflict" || reasonCategory === "validation_failure" || reasonCategory === "reconciliation_drift") {
    return "high";
  }
  if (typeof priority === "string" && priority.toUpperCase() === "P0") return "critical";
  if (typeof priority === "string" && priority.toUpperCase() === "P1") return "high";
  return "medium";
}

export function normalizeAndScrub(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SyncError("invalid_body", "Request body must be an object");
  }

  const monitorId = boundedString(input.monitor_id, "monitor_id", 64);
  if (!ALLOWED_MONITORS.has(monitorId)) {
    throw new SyncError("monitor_not_allowlisted", "Monitor is not allowlisted");
  }

  const environment = boundedString(input.environment, "environment", 32);
  if (!ALLOWED_ENVIRONMENTS.has(environment)) {
    throw new SyncError("invalid_environment", "Environment is not allowed");
  }

  const component = boundedString(input.component, "component", 64);
  if (!ALLOWED_COMPONENTS.has(component)) {
    throw new SyncError("invalid_component", "Component is not allowed");
  }

  const reasonCategory = boundedString(input.reason_category, "reason_category", 64);
  if (!ALLOWED_REASONS.has(reasonCategory)) {
    throw new SyncError("invalid_reason_category", "Reason category is not allowed");
  }

  const alertCycleKey = boundedString(input.alert_cycle_key, "alert_cycle_key", 128);
  const monitorTitle = boundedString(input.monitor_title, "monitor_title", 160);
  const alertTransition = parseTransition(input.alert_transition);
  const occurredAt = parsePosixTimestamp(input.occurred_at_posix);

  return Object.freeze({
    schemaVersion: "1",
    source: "datadog",
    monitorId,
    monitorTitle,
    alertTransition,
    severity: mapSeverity(input.alert_priority, reasonCategory),
    environment,
    component,
    alertCycleKey,
    occurredAt,
    datadogEventUrl: parseApprovedDatadogUrl(input.datadog_event_url),
    reasonCategory,
  });
}

export function externalAlertKey(alert) {
  return [
    "datadog",
    alert.environment,
    alert.monitorId,
    alert.alertCycleKey,
    alert.alertTransition.toLowerCase(),
  ].join(":");
}

export function verifyHmacSignature(rawBody, suppliedSignature, secret) {
  if (typeof rawBody !== "string" || typeof suppliedSignature !== "string" || typeof secret !== "string" || secret.length === 0) {
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const received = suppliedSignature.replace(/^sha256=/, "");
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export class MemoryIdempotencyStore {
  constructor() {
    this.entries = new Map();
  }

  begin(key, requestId) {
    const current = this.entries.get(key);
    if (current?.state === "completed") return { duplicate: true, entry: current };
    if (current?.state === "processing") {
      throw new SyncError("duplicate_in_progress", "Event is already being processed", { retryable: true, status: 409 });
    }
    this.entries.set(key, { state: "processing", requestId, startedAt: new Date().toISOString() });
    return { duplicate: false };
  }

  complete(key, result) {
    const current = this.entries.get(key);
    if (!current) throw new SyncError("idempotency_missing", "Idempotency entry was not initialized");
    this.entries.set(key, { ...current, state: "completed", completedAt: new Date().toISOString(), result });
  }

  release(key) {
    const current = this.entries.get(key);
    if (current?.state === "processing") this.entries.delete(key);
  }
}

export function buildJiraPayload(alert, key, config) {
  return {
    fields: {
      project: { key: config.projectKey },
      issuetype: { id: config.issueTypeId },
      summary: `[Datadog] ${alert.reasonCategory.replaceAll("_", " ")} — ${alert.environment}`,
      description: {
        type: "doc",
        version: 1,
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "A governed Datadog alert requires corrective-action review. See bounded fields and evidence references." }],
        }],
      },
      priority: { name: config.priorityNames[alert.severity] ?? "Medium" },
      labels: ["source-datadog", "hmsi-retention-governance", "requires-human-validation"],
      [config.fields.externalAlertKey]: key,
      [config.fields.sourceExercise]: "Datadog emergency restoration monitoring",
      [config.fields.controlDomain]: alert.component === "hmsi-public-boundary" ? "Public boundary" : "Recovery",
      [config.fields.evidenceRef]: `evidence://restricted/${key}`,
      [config.fields.auditRef]: `audit://datadog-ingest/${key}`,
      [config.fields.validationResult]: "Not run",
    },
  };
}

function safeAuditRecord(fields) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)));
}

export function createHandler({
  secret,
  dryRun = true,
  allowlistedMonitorIds = ALLOWED_MONITORS,
  idempotency = new MemoryIdempotencyStore(),
  jira,
  audit = async () => {},
  jiraConfig,
} = {}) {
  if (!(allowlistedMonitorIds instanceof Set)) throw new TypeError("allowlistedMonitorIds must be a Set");

  return async function handle({ method = "POST", rawBody, signature, requestId = crypto.randomUUID() }) {
    if (method !== "POST") return { status: 405, body: { error: "method_not_allowed" } };
    if (!verifyHmacSignature(rawBody, signature, secret)) {
      await audit(safeAuditRecord({ requestId, event: "rejected", reason: "invalid_source_auth" }));
      return { status: 401, body: { error: "unauthorized", requestId } };
    }

    let input;
    try {
      input = JSON.parse(rawBody);
    } catch {
      await audit(safeAuditRecord({ requestId, event: "rejected", reason: "invalid_json" }));
      return { status: 422, body: { error: "invalid_json", requestId } };
    }

    let alert;
    let key;
    try {
      alert = normalizeAndScrub(input);
      if (!allowlistedMonitorIds.has(alert.monitorId)) throw new SyncError("monitor_not_allowlisted", "Monitor is not allowlisted");
      key = externalAlertKey(alert);
      const decision = idempotency.begin(key, requestId);
      if (decision.duplicate) {
        await audit(safeAuditRecord({ requestId, event: "duplicate", externalAlertKey: key }));
        return { status: 200, body: { ok: true, duplicate: true, externalAlertKey: key } };
      }
      await audit(safeAuditRecord({
        requestId,
        event: "accepted",
        externalAlertKey: key,
        monitorId: alert.monitorId,
        severity: alert.severity,
        reasonCategory: alert.reasonCategory,
      }));
    } catch (error) {
      const safeReason = error instanceof SyncError ? error.code : "normalization_failed";
      await audit(safeAuditRecord({ requestId, event: "rejected", reason: safeReason }));
      return { status: error?.status ?? 422, body: { error: safeReason, requestId } };
    }

    try {
      if (dryRun) {
        idempotency.complete(key, { dryRun: true });
        await audit(safeAuditRecord({ requestId, event: "dry_run", externalAlertKey: key }));
        return { status: 200, body: { ok: true, dryRun: true, externalAlertKey: key } };
      }
      if (!jira || !jiraConfig) throw new SyncError("jira_not_configured", "Jira adapter is not configured", { retryable: true, status: 503 });
      const payload = buildJiraPayload(alert, key, jiraConfig);
      const issue = alert.alertTransition === "Recovered"
        ? await jira.updateRecoveredByExternalKey(key, alert)
        : await jira.upsertCorrectiveAction(key, payload, alert);
      idempotency.complete(key, { jiraIssueKey: issue?.key ?? null });
      await audit(safeAuditRecord({ requestId, event: issue?.created ? "jira_created" : "jira_updated", externalAlertKey: key, jiraIssueKey: issue?.key ?? "unknown" }));
      return { status: 200, body: { ok: true, jiraIssueKey: issue?.key ?? null, externalAlertKey: key } };
    } catch (error) {
      idempotency.release(key);
      const safeReason = error instanceof SyncError ? error.code : "jira_sync_failed";
      await audit(safeAuditRecord({ requestId, event: "failed", reason: safeReason, externalAlertKey: key }));
      return {
        status: error?.retryable || error?.status >= 500 ? 500 : (error?.status ?? 422),
        body: { error: error?.retryable || error?.status >= 500 ? "retryable_sync_failure" : safeReason, requestId },
      };
    }
  };
}
