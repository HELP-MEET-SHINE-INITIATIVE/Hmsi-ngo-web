# HMSI Datadog-to-Jira Corrective-Action Synchronization
## Secure Script and API Payload Template

**Purpose:** Convert selected Datadog restoration and public-boundary alerts into bounded Jira corrective-action records without copying sensitive payloads, automatically closing work, or bypassing HMSI governance.

**Implementation status:** Reference template only. No Datadog webhook, Jira project, service account, issue, or production integration was configured.

> **Security rule:** Datadog alerts are untrusted input. The receiver must authenticate the source, allowlist monitor IDs, scrub fields before logging or forwarding, deduplicate by stable alert identity, and fail closed when authorization or audit persistence is unavailable.

## 1. End-to-end flow

| Stage | Control | Output |
|---|---|---|
| 1. Datadog alert | Datadog webhook sends bounded custom JSON | HTTPS POST to receiver |
| 2. Authentication | Gateway signature or allowlisted private ingress verifies source | Accepted or rejected request |
| 3. Validation | Schema, environment, monitor, severity, and transition are validated | Normalized alert envelope |
| 4. Scrubbing | Raw messages, log samples, names, emails, locations, tokens, and arbitrary scope are removed | Privacy-safe event |
| 5. Deduplication | Stable key combines Datadog monitor, alert cycle, transition, and environment | Existing or new action decision |
| 6. Jira lookup | Search by immutable external alert key in the governed project | Existing issue or create path |
| 7. Jira mutation | Create or update only allowed fields; never auto-close | Jira issue key |
| 8. Audit | Record accepted/rejected/scrubbed/created/updated/failed event | Audit reference |
| 9. Response | Return 2xx only after durable handling; return 5xx for retryable failures | Datadog retry or success |

Datadog documents webhook POST delivery, custom headers, custom JSON payload variables, and retries for 5xx or internal errors. It documents a 15-second individual-request timeout and retries for missed connections.[1] The receiver should therefore complete validation and enqueue or persist work quickly, using an outbox if Jira calls may exceed the request budget.

## 2. Required environment variables

| Variable | Purpose | Required |
|---|---|:---:|
| `DATADOG_WEBHOOK_SHARED_SECRET` | Secret used by an approved ingress/gateway to authenticate Datadog delivery | Yes |
| `DATADOG_ALLOWED_MONITOR_IDS` | Comma-separated allowlist of monitor IDs | Yes |
| `JIRA_BASE_URL` | Approved Jira Cloud base URL | Yes |
| `JIRA_PROJECT_KEY` | Governance project key, for example `HMSI` | Yes |
| `JIRA_CORRECTIVE_ACTION_ISSUE_TYPE_ID` | Jira issue type ID discovered from create metadata | Yes |
| `JIRA_SERVICE_ACCOUNT_EMAIL` | Dedicated non-human integration identity | Yes |
| `JIRA_API_TOKEN` | Secret used only by the server-side Jira adapter | Yes |
| `JIRA_CUSTOMFIELD_EXTERNAL_ALERT_KEY` | Jira field ID for idempotency key | Yes |
| `JIRA_CUSTOMFIELD_SOURCE_EXERCISE` | Jira field ID for source/system | Yes |
| `JIRA_CUSTOMFIELD_CONTROL_DOMAIN` | Jira field ID for control domain | Yes |
| `JIRA_CUSTOMFIELD_EVIDENCE_REF` | Jira field ID for bounded evidence reference | Yes |
| `JIRA_CUSTOMFIELD_AUDIT_REF` | Jira field ID for audit reference | Yes |
| `JIRA_CUSTOMFIELD_VALIDATION_RESULT` | Jira field ID for validation status | Yes |
| `JIRA_CUSTOMFIELD_RISK_ACCEPTED` | Jira field ID for risk acceptance | Conditional |
| `SYNC_DRY_RUN` | When `true`, validate and audit but do not mutate Jira | Yes; default `true` |
| `SYNC_MAX_BATCH` | Maximum records per worker run | Yes |

Do not place these values in a Datadog payload, browser code, Jira issue, repository, or ordinary log. Store them in the approved secret manager and rotate them under change control.

## 3. Datadog custom webhook payload

Configure the Datadog Webhooks integration with a custom JSON payload using only the variables required for the governed mapping. Datadog supports variables such as `$ALERT_ID`, `$ALERT_TITLE`, `$ALERT_STATUS`, `$ALERT_TRANSITION`, `$ALERT_PRIORITY`, `$ALERT_SCOPE`, `$ALERT_METRIC`, `$DATE_POSIX`, `$ALERT_CYCLE_KEY`, and `$LINK`.[1]

```json
{
  "source": "datadog",
  "schema_version": "1",
  "monitor_id": "$ALERT_ID",
  "monitor_title": "$ALERT_TITLE",
  "alert_status": "$ALERT_STATUS",
  "alert_transition": "$ALERT_TRANSITION",
  "alert_priority": "$ALERT_PRIORITY",
  "metric": "$ALERT_METRIC",
  "alert_scope": "$ALERT_SCOPE",
  "alert_cycle_key": "$ALERT_CYCLE_KEY",
  "occurred_at_posix": "$DATE_POSIX",
  "datadog_event_url": "$LINK",
  "environment": "production",
  "component": "hmsi-news-restoration"
}
```

Do not include `$EVENT_MSG`, `$LOGS_SAMPLE`, `$INCIDENT_MSG`, `$INCIDENT_FIELDS`, `$SECURITY_SIGNAL_ATTRIBUTES`, contributor details, article body, raw alert query, or arbitrary user-provided scope unless the receiver has a documented, field-specific scrubbing rule and a clear need. For this use case, the safer default is to omit them.

## 4. Normalized event contract

```ts
export type AlertTransition =
  | "Triggered"
  | "Re-Triggered"
  | "Recovered"
  | "No Data"
  | "Re-No Data"
  | "Renotify";

export type SafeSeverity = "critical" | "high" | "medium" | "low";

export interface SafeDatadogAlert {
  schemaVersion: "1";
  source: "datadog";
  monitorId: string;
  monitorTitle: string;
  alertTransition: AlertTransition;
  severity: SafeSeverity;
  environment: "production" | "staging" | "development";
  component: "hmsi-news-restoration" | "hmsi-public-boundary";
  alertCycleKey: string;
  occurredAt: string;
  datadogEventUrl?: string;
  reasonCategory:
    | "public_boundary_violation"
    | "audit_write_failure"
    | "restoration_conflict"
    | "unauthorized_attempt"
    | "validation_failure"
    | "review_backlog"
    | "reconciliation_drift";
}
```

Normalization must reject unknown monitor IDs, invalid environments, unsupported components, unknown transitions, malformed timestamps, unrecognized reason categories, missing alert-cycle keys, and unbounded strings. The external URL must be HTTPS and restricted to an approved Datadog hostname.

## 5. Privacy-safe scrubbing

```ts
const SAFE_MONITORS = new Set([
  "DDM-RESTORE-001",
  "DDM-RESTORE-002",
  "DDM-RESTORE-004",
  "DDM-RESTORE-005",
  "DDM-RESTORE-006",
]);

const SAFE_REASONS = new Set([
  "public_boundary_violation",
  "audit_write_failure",
  "restoration_conflict",
  "unauthorized_attempt",
  "validation_failure",
  "review_backlog",
  "reconciliation_drift",
]);

export function normalizeAndScrub(input: Record<string, unknown>): SafeDatadogAlert {
  const monitorId = boundedString(input.monitor_id, 64);
  if (!SAFE_MONITORS.has(monitorId)) throw new Error("monitor_not_allowlisted");

  const environment = boundedString(input.environment, 32);
  if (!["production", "staging", "development"].includes(environment)) {
    throw new Error("invalid_environment");
  }

  const component = boundedString(input.component, 64);
  if (!["hmsi-news-restoration", "hmsi-public-boundary"].includes(component)) {
    throw new Error("invalid_component");
  }

  const reasonCategory = boundedString(input.reason_category, 64);
  if (!SAFE_REASONS.has(reasonCategory)) throw new Error("invalid_reason_category");

  const alertCycleKey = boundedString(input.alert_cycle_key, 128);
  const occurredAt = parsePosixTimestamp(input.occurred_at_posix);

  return {
    schemaVersion: "1",
    source: "datadog",
    monitorId,
    monitorTitle: boundedString(input.monitor_title, 160),
    alertTransition: parseTransition(input.alert_transition),
    severity: mapSeverity(input.alert_priority, reasonCategory),
    environment: environment as SafeDatadogAlert["environment"],
    component: component as SafeDatadogAlert["component"],
    alertCycleKey,
    occurredAt,
    datadogEventUrl: parseApprovedDatadogUrl(input.datadog_event_url),
    reasonCategory: reasonCategory as SafeDatadogAlert["reasonCategory"],
  };
}
```

`boundedString`, `parseTransition`, `mapSeverity`, `parsePosixTimestamp`, and `parseApprovedDatadogUrl` must reject overlong, control-character, non-string, and unapproved values. The original request body must never be serialized into the Jira issue, ordinary logs, alert messages, or exception text.

## 6. Idempotency and Jira mapping

Use a deterministic external key:

```ts
export function externalAlertKey(alert: SafeDatadogAlert): string {
  return [
    "datadog",
    alert.environment,
    alert.monitorId,
    alert.alertCycleKey,
    alert.alertTransition.toLowerCase(),
  ].join(":");
}
```

For `Triggered`, `Re-Triggered`, and `No Data`, create or update an open Jira corrective-action issue. For `Recovered`, add a bounded recovery comment or update a recovery field only if the issue exists. Never transition the issue to `Closed`, `Validated`, or `Done` automatically. Closure remains a human governance decision after independent validation.

| Datadog event | Jira action | Default priority | Status treatment |
|---|---|---|---|
| Public-boundary violation | Create/update | P0 | Keep open; page incident path |
| Audit-write failure | Create/update | P0 | Keep open; block destructive work |
| Unauthorized attempt | Create/update | P1 | Keep open; security review |
| Restoration conflict | Create/update | P1 | Keep open; private-review path |
| Validation failure | Create/update | P1 | Keep open; require retest |
| Reconciliation drift | Create/update | P1 | Keep open; block closure |
| Review backlog | Create/update | P2 | Escalate by age |
| Recovered | Update existing only | Existing | Do not close |

Atlassian’s Jira Cloud Create issue endpoint is `POST /rest/api/3/issue` and uses a JSON `fields` object. Atlassian notes that issue fields available for creation come from create metadata, and descriptions/multiline fields use Atlassian Document Format.[2] Discover field and issue-type IDs through the Jira metadata API; do not guess IDs.

## 7. Jira create payload template

```json
{
  "fields": {
    "project": { "key": "HMSI" },
    "issuetype": { "id": "<JIRA_CORRECTIVE_ACTION_ISSUE_TYPE_ID>" },
    "summary": "[Datadog] Public-boundary validation failure — production",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "A governed Datadog alert requires corrective-action review. See bounded fields and evidence references below."
            }
          ]
        }
      ]
    },
    "priority": { "name": "Highest" },
    "labels": [
      "source-datadog",
      "hmsi-retention-governance",
      "requires-human-validation"
    ],
    "customfield_external_alert_key": "datadog:production:DDM-RESTORE-001:corr-synthetic-001:triggered",
    "customfield_source_exercise": "Datadog emergency restoration monitoring",
    "customfield_control_domain": "Public boundary",
    "customfield_evidence_ref": "evidence://restricted/audit-synthetic-001",
    "customfield_audit_ref": "audit://datadog-ingest/evt-synthetic-001",
    "customfield_validation_result": "Not run"
  }
}
```

Replace symbolic custom-field names with the actual Jira field IDs from create metadata. The payload must not include article title, article body, contributor name, email, phone, exact location, private review token, raw log sample, or complete alert query.

## 8. TypeScript reference receiver

```ts
import crypto from "node:crypto";

const json = (res: any, status: number, body: unknown) => {
  res.status(status).setHeader("content-type", "application/json").end(JSON.stringify(body));
};

export async function datadogWebhook(req: any, res: any) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  try {
    if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
    if (!verifyGatewaySignature(req, process.env.DATADOG_WEBHOOK_SHARED_SECRET ?? "")) {
      await audit({ requestId, event: "rejected", reason: "invalid_source_auth" });
      return json(res, 401, { error: "unauthorized" });
    }

    const alert = normalizeAndScrub(req.body);
    const key = externalAlertKey(alert);
    const decision = await idempotency.begin(key, requestId);

    if (decision === "duplicate") {
      await audit({ requestId, event: "duplicate", externalAlertKey: key });
      return json(res, 200, { ok: true, duplicate: true });
    }

    await audit({
      requestId,
      event: "accepted",
      externalAlertKey: key,
      monitorId: alert.monitorId,
      reasonCategory: alert.reasonCategory,
      severity: alert.severity,
    });

    if (process.env.SYNC_DRY_RUN !== "false") {
      await idempotency.complete(key, { dryRun: true });
      return json(res, 200, { ok: true, dryRun: true, externalAlertKey: key });
    }

    const issue = await jiraUpsertCorrectiveAction(alert, key);
    await audit({
      requestId,
      event: issue.created ? "jira_created" : "jira_updated",
      externalAlertKey: key,
      jiraIssueKey: issue.key,
    });
    await idempotency.complete(key, { jiraIssueKey: issue.key });

    return json(res, 200, {
      ok: true,
      jiraIssueKey: issue.key,
      externalAlertKey: key,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const safeReason = classifySafeError(error);
    await audit({ requestId, event: "failed", reason: safeReason });
    return json(res, isRetryable(error) ? 500 : 422, {
      error: isRetryable(error) ? "retryable_sync_failure" : "rejected_alert",
      requestId,
    });
  }
}
```

The example assumes the webhook reaches an authenticated gateway that verifies the source. If Datadog’s configured webhook path cannot provide trustworthy source authentication by itself, place the receiver behind a private ingress, API gateway, or signed relay. Do not treat a user-controlled JSON field as proof that the request came from Datadog.

## 9. Jira update and recovery behavior

Before creating an issue, search the governed project for the exact external alert key. If found, update bounded fields and add a short comment containing the new transition, UTC time, and Datadog event reference. If no issue exists for a `Recovered` transition, create no new corrective action; record an orphan-recovery audit event and route it to an operations queue.

A Jira update should not modify owner, validator, risk acceptance, validation result, or closure fields unless a separate governance workflow explicitly authorizes it. The integration may set source, severity, reason category, alert status, and bounded evidence references.

## 10. Retry, failure, and outbox behavior

| Failure | HTTP response | Handling |
|---|---:|---|
| Invalid source authentication | 401 | Reject; audit; no retry expected |
| Invalid schema or monitor not allowlisted | 422 | Reject; audit; no Jira call |
| Duplicate event | 200 | Return idempotent success; no duplicate issue |
| Jira 429 or 5xx | 500 | Persist outbox; allow Datadog retry; exponential worker retry |
| Jira 401/403 | 500 initially | Page integration owner; disable mutation; do not loop indefinitely |
| Jira 400 field error | 422 after bounded diagnosis | Quarantine payload; alert configuration owner |
| Audit ledger unavailable | 500 | Fail closed; do not mutate Jira unless policy explicitly allows durable fallback |
| Timeout before result known | 500 | Use idempotency key; reconcile before retrying |
| Datadog recovered without open issue | 200 | Record orphan recovery; no issue creation |

Datadog retries 5xx responses, so the receiver must persist a durable idempotency record before making an external mutation. A timeout with an unknown Jira result must not be treated as proof that no issue was created.

## 11. Security and privacy controls

The integration service account must have only the Jira project and issue permissions required to create or update corrective-action records. It must not have global administration, user administration, deletion, workflow administration, or unrestricted browsing rights. Issue security should limit records to approved governance groups.

The receiver must redact request bodies from framework access logs, disable raw exception serialization, cap payload sizes, validate content types, reject unexpected fields where practical, and prevent header or URL secrets from appearing in logs. Datadog links must be restricted to approved hosts, and Jira links must be constructed from the configured base URL rather than copied from untrusted input.

The Jira issue is an operational pointer, not the audit ledger. The immutable HMSI audit system remains the source of truth for state transitions, suppression exceptions, approvals, retries, and deletion or restoration decisions.

## 12. Acceptance tests

| Test | Expected result |
|---|---|
| Valid allowlisted alert | Normalizes and creates one Jira issue in execution mode |
| Same alert delivered twice | One Jira issue and one mutation; second delivery returns duplicate success |
| Invalid gateway signature | 401, no Jira call, bounded rejection audit |
| Unknown monitor ID | 422, no Jira call |
| Raw sensitive fields included | Scrubbed; values absent from logs, audit projection, and Jira payload |
| Public-boundary violation | P0 issue; no automatic closure |
| Recovered event with open issue | Bounded update/comment; status remains open |
| Recovered event without issue | No issue creation; orphan-recovery audit event |
| Jira 500 | 5xx to Datadog, outbox retained, retry safe |
| Jira timeout after possible creation | Reconciliation by external key before retry |
| Jira 403 | No repeated mutation loop; integration alert raised |
| Audit ledger unavailable | Fail closed; no Jira mutation |
| Dry-run enabled | Validation/audit only; zero Jira mutations |
| Missing required Jira field ID | Startup/configuration failure before accepting live events |
| Attempted auto-close | Rejected by policy and test |
| Restricted sensitive record | Jira issue contains only bounded category/reference; confidential evidence remains outside Jira |

## 13. Deployment sequence

1. Confirm the Jira Cloud project, issue type, custom-field IDs, issue-security scheme, service identity, and approved governance users.
2. Create the receiver in staging with `SYNC_DRY_RUN=true` and synthetic Datadog events.
3. Verify payload scrubbing, source authentication, monitor allowlisting, audit persistence, and duplicate handling.
4. Use Jira create metadata to confirm every field and ADF description shape.[2]
5. Run the acceptance tests, including Jira 429/5xx, timeout, 401/403, and unknown-result simulations.
6. Obtain operations, engineering, privacy, security, and governance approval.
7. Enable a single low-risk staging monitor and inspect the full outbox-to-Jira path.
8. Enable production delivery only after staged evidence is reviewed.
9. Keep automatic issue closure disabled and review the first production events manually.

## 14. References

[1]: https://docs.datadoghq.com/integrations/webhooks/ "Datadog Webhooks"  
[2]: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/ "Atlassian Jira Cloud REST API v3 — Issues"
