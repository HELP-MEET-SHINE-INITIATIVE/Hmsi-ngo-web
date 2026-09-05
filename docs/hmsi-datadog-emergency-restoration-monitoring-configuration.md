# HMSI Datadog Emergency Content Restoration Monitoring
## Alert and Dashboard Configuration Specification

**Audience:** HMSI engineering, security, editorial operations, privacy, safeguarding, and incident-management teams  
**Scope:** Emergency restoration attempts, validation failures, state conflicts, authorization failures, audit failures, and accidental public exposure  
**Platform:** Datadog Logs, Metrics, Monitors, Dashboards, Watchdog/Anomaly features where approved  
**Status:** Configuration-ready specification; no Datadog workspace was modified

> **Safety boundary:** This specification monitors restoration controls. It does not authorize restoration, publication, deletion, or suppression override actions.

---

## 1. Objectives

The monitoring design must allow HMSI to detect and respond to five conditions quickly:

1. A restoration attempt is rejected because the record is stale, conflicted, unauthorized, protected, or malformed.
2. Validation failures prevent a safe restoration or subsequent publication.
3. Emergency restoration requests accumulate without an independent review or decision.
4. Audit events, state updates, or public-query checks fail to provide reliable evidence.
5. A record appears publicly before a separate administrator publication action.

The dashboards should support operational decisions without exposing article bodies, volunteer names, email addresses, phone numbers, safeguarding details, raw feedback, direct CRM IDs, tokens, or precise locations.

---

## 2. Datadog prerequisites

Before enabling monitors, engineering must confirm that the HMSI service emits structured JSON logs and bounded metrics with the following stable dimensions:

| Requirement | Expected configuration |
|---|---|
| Service tag | `service:hmsi-news-api` |
| Environment tags | `env:staging`, `env:production` |
| Version tag | `version:<short-safe-release-id>` |
| Component tag | `component:news-restoration`, `component:editorial-publication`, or `component:audit-ledger` |
| Correlation ID | Random opaque request ID; never an email, title, or article body |
| Article identifier | HMAC-derived or provider-safe opaque identifier, not a raw public ID where avoidable |
| Actor dimension | Role class only, such as `actor_role:admin`, never a person’s name or email |
| Region/scope | Coarse operational scope only; no precise location |
| Log retention | Must be approved against the HMSI audit and privacy policy |

The Datadog Agent or server-side log transport must apply a sensitive-field scrubbing pipeline before data reaches ordinary logs. Any payload containing raw content, tokens, direct identifiers, or confidential safeguarding data must be rejected, redacted, or routed to the approved restricted audit store rather than indexed in Datadog.

---

## 3. Privacy-safe event contract

### 3.1 Restoration event fields

Every restoration event should contain the following fields:

```json
{
  "service": "hmsi-news-api",
  "env": "production",
  "event_type": "news_restoration",
  "event_action": "requested|accepted|rejected|completed|replay|conflict",
  "source_state": "archived",
  "target_state": "draft|pending_editorial_review",
  "actor_role": "admin|non_admin|service",
  "decision": "allowed|denied|blocked",
  "reason_code": "article_must_be_archived|restore_conflict|protected_record_gate",
  "article_key": "hmac:opaque-value",
  "correlation_id": "opaque-request-id",
  "audit_event_id": "opaque-event-id",
  "release_id": "4731dc2",
  "duration_ms": 84,
  "timestamp": "2026-08-26T12:00:00.000Z"
}
```

### 3.2 Validation event fields

```json
{
  "service": "hmsi-news-api",
  "event_type": "news_restoration_validation",
  "event_action": "failed|passed|skipped",
  "validation_name": "source_state|hold_check|privacy_check|image_check|audit_write|public_visibility",
  "decision": "allowed|denied|blocked",
  "reason_code": "primary_image_required|audit_write_failed|legal_hold_active",
  "actor_role": "admin|service",
  "article_key": "hmac:opaque-value",
  "correlation_id": "opaque-request-id",
  "timestamp": "2026-08-26T12:00:00.000Z"
}
```

### 3.3 Fields prohibited from ordinary Datadog telemetry

The following fields must not appear in metric tags, monitor messages, dashboard tables, or ordinary logs: article headline, article body, raw excerpt, contributor name, volunteer ID, email address, phone number, donor information, safeguarding narrative, free-text approval reason, session token, password, provider access token, exact GPS coordinates, or a raw CRM/Supabase primary key.

If an incident requires access to sensitive evidence, the Datadog event should reference the restricted audit event ID and instruct responders to use the approved restricted system.

---

## 4. Metrics

### 4.1 Counters

| Metric | Type | Tags | Purpose |
|---|---|---|---|
| `hmsi.news.restoration.attempts` | Count | `env`, `component`, `event_action`, `actor_role` | Total restoration requests and outcomes |
| `hmsi.news.restoration.rejections` | Count | `env`, `reason_code`, `actor_role` | Failed or blocked restoration attempts |
| `hmsi.news.restoration.validation_failures` | Count | `env`, `validation_name`, `reason_code` | Validation-gate failures |
| `hmsi.news.restoration.conflicts` | Count | `env`, `reason_code` | Optimistic-concurrency or stale-state conflicts |
| `hmsi.news.restoration.unauthorized` | Count | `env`, `actor_role`, `reason_code` | Unauthorized or malformed attempts |
| `hmsi.news.restoration.audit_failures` | Count | `env`, `component`, `reason_code` | Missing or failed audit writes |
| `hmsi.news.restoration.public_boundary_violations` | Count | `env`, `component` | Private content observed publicly |
| `hmsi.news.restoration.replays` | Count | `env`, `component` | Duplicate delivery or idempotent replay |
| `hmsi.news.publication.after_restore` | Count | `env`, `actor_role` | Separate publication after a restoration |

### 4.2 Gauges

| Metric | Purpose |
|---|---|
| `hmsi.news.restoration.pending` | Current emergency restoration requests awaiting action |
| `hmsi.news.restoration.pending_independent_review` | Requests missing an independent review |
| `hmsi.news.restoration.protected_blocked` | Current records blocked by holds, rights requests, incidents, or restrictions |
| `hmsi.news.restoration.audit_backlog` | Audit events waiting for durable acknowledgement |
| `hmsi.news.restoration.reconciliation_drift` | Difference between state changes and audit/public verification records |

### 4.3 Histograms

| Metric | Purpose |
|---|---|
| `hmsi.news.restoration.validation.duration_ms` | Validation latency |
| `hmsi.news.restoration.review_age_hours` | Time from request to independent review |
| `hmsi.news.restoration.decision_age_hours` | Time from request to final decision |
| `hmsi.news.restoration.audit_write.duration_ms` | Audit persistence latency |

Recommended histogram buckets for review and decision age are 1 hour, 4 hours, 12 hours, 24 hours, 48 hours, 72 hours, and 168 hours. These are starting points and require staging calibration.

---

## 5. Dashboard design

Create a Datadog dashboard named **HMSI Emergency Content Restoration — Governance** with restricted access to named engineering, editorial, privacy, safeguarding, and management groups.

### Panel A: Current operational status

Use query-value widgets for restoration attempts in the last hour, blocked attempts in the last hour, pending requests, pending independent reviews, audit backlog, and public-boundary violations. Apply red status to any non-zero public-boundary violation and to audit backlog above the approved threshold.

### Panel B: Restoration outcome trend

Use a timeseries for:

```text
sum:hmsi.news.restoration.attempts{env:$env}.as_count()
by {event_action}
```

Overlay rejected, accepted, completed, conflict, and replay outcomes. Keep `reason_code` available as a dashboard filter but do not expose article-level identifiers.

### Panel C: Rejection reason distribution

Use a toplist or treemap over the bounded `reason_code` tag. Recommended categories include `restore_conflict`, `article_must_be_archived`, `protected_record_gate`, `restricted_record_class`, `explicit_confirmation_required`, `restoration_reason_required`, `admin_authentication_required`, and `audit_write_failed`.

### Panel D: Approval bottleneck

Use a timeseries and table for pending restoration requests, pending independent reviews, p50 review age, p95 review age, and requests older than the agreed service objective. Break down by workflow stage, not by person.

### Panel E: Validation-gate health

Use a stacked timeseries for validation passes and failures by `validation_name`. Include source-state, hold, privacy, safeguarding, primary-image, audit-write, and public-visibility checks.

### Panel F: Public-boundary integrity

Use a single-status widget for `hmsi.news.restoration.public_boundary_violations`. Add a query showing published public records observed after an approved publication event, but do not show article titles or raw identifiers.

### Panel G: Audit integrity

Show accepted restoration events, completed restoration events, audit failures, reconciliation drift, and event ingestion delay. Include a monitor-status summary so operators can see when the observability path itself is degraded.

### Panel H: Provider and dependency health

Show API error rate, timeout rate, database update latency, audit-store latency, and authentication failures for the restoration service. These metrics must be separated from content decisions; a dependency failure should not be interpreted as editorial rejection.

---

## 6. Datadog monitors

The following monitors are starting configurations. Thresholds must be calibrated with staging data and formally approved before production paging.

### DDM-RESTORE-001: Public-boundary violation

**Severity:** Critical  
**Purpose:** Detect any private restoration record observed through a public route.

```text
sum(last_5m):sum:hmsi.news.restoration.public_boundary_violations{env:production}.as_count() > 0
```

**Message:**

```text
CRITICAL: HMSI private-news public-boundary violation detected.

Containment: stop further restoration/publication activity and open a severity-one incident.
Do not include article content or personal data in this alert.
Investigate correlation_id and restricted audit_event_id in the approved audit store.
@pagerduty-hmsi-critical @slack-hmsi-security-incident
```

### DDM-RESTORE-002: Audit write failure

**Severity:** Critical  
**Query:**

```text
sum(last_10m):sum:hmsi.news.restoration.audit_failures{env:production}.as_count() > 0
```

**Action:** Stop restoration publication actions until audit persistence is restored and reconciliation is complete.

### DDM-RESTORE-003: Rejection spike

**Severity:** High  
**Query:**

```text
sum(last_15m):sum:hmsi.news.restoration.rejections{env:production}.as_count() >= 5
```

**Action:** Review reason-code distribution. If the spike is caused by a release, open an engineering incident. If the spike is caused by protected-record gates, route to privacy/safeguarding review rather than attempting retries.

### DDM-RESTORE-004: Conflict spike

**Severity:** High  
**Query:**

```text
sum(last_15m):sum:hmsi.news.restoration.conflicts{env:production}.as_count() >= 3
```

**Action:** Inspect concurrent-update behavior and recent deployments. Do not force updates or replay a request without re-reading the current state.

### DDM-RESTORE-005: Unauthorized-attempt spike

**Severity:** High  
**Query:**

```text
sum(last_15m):sum:hmsi.news.restoration.unauthorized{env:production}.as_count() >= 5
```

**Action:** Security review. Check whether failures are user misunderstanding, stale sessions, permission drift, or suspicious activity. Do not place raw actor identifiers in the monitor notification.

### DDM-RESTORE-006: Validation failure rate

**Severity:** Warning, escalating to High  
**Query:**

```text
(sum(last_30m):sum:hmsi.news.restoration.validation_failures{env:production}.as_count())
/
(sum(last_30m):sum:hmsi.news.restoration.attempts{env:production}.as_count()) > 0.25
```

Require a minimum attempt count in implementation to avoid paging on a single request. A suggested staging baseline is 10 attempts; production thresholds require approval.

### DDM-RESTORE-007: Pending review bottleneck

**Severity:** Warning  
**Query:**

```text
max(last_1h):hmsi.news.restoration.pending_independent_review{env:production} >= 5
```

**Action:** Notify the editorial lead and programme owner. This is an operational capacity signal, not permission to weaken review standards.

### DDM-RESTORE-008: Review-age objective breach

**Severity:** Warning/High  
**Query pattern:**

```text
percentile(last_1h):hmsi.news.restoration.review_age_hours{env:production} by {workflow_stage} > 24
```

Use the agreed HMSI service objective. If the content is blocked by privacy or safeguarding review, route to the relevant owner and do not bypass the gate.

### DDM-RESTORE-009: Audit reconciliation drift

**Severity:** High  
**Query:**

```text
max(last_10m):hmsi.news.restoration.reconciliation_drift{env:production} > 0
```

**Action:** Freeze further automated restoration processing, compare state records with audit events, and reconcile by opaque article key and correlation ID.

### DDM-RESTORE-010: Restoration API dependency failure

**Severity:** High  
**Query pattern:**

```text
(sum(last_10m):sum:hmsi.news.restoration.attempts{env:production,decision:blocked}.as_count())
/
(sum(last_10m):sum:hmsi.news.restoration.attempts{env:production}.as_count()) > 0.5
```

Use alongside HTTP 5xx, database timeout, and audit-store error monitors. A dependency outage should fail closed and prevent publication.

---

## 7. Notification routing

| Alert class | Primary route | Secondary route | Expected response |
|---|---|---|---|
| Public-boundary violation | Security incident pager | Engineering lead and management | Immediate containment |
| Audit-write failure | Engineering pager | Privacy/data-governance owner | Stop mutation/publication and reconcile |
| Protected-record gate spike | Privacy/safeguarding channel | Editorial lead | Review cases; do not retry blindly |
| Conflict spike | Engineering channel | Editorial operations | Re-read and resolve concurrency issue |
| Unauthorized-attempt spike | Security channel | Portal administrator | Investigate permission/session behavior |
| Review backlog | Editorial operations | Programme lead | Allocate review capacity |
| Dependency failure | Engineering on-call | Incident owner | Fail closed and restore service |

Monitor messages should contain the monitor ID, environment, severity, bounded reason category, time window, and links to the dashboard and runbook. They should not contain article titles, raw article IDs, names, emails, phone numbers, or sensitive explanations.

---

## 8. Incident runbooks

### Public-boundary violation

Immediately declare a critical incident. Stop restoration and publication operations if the affected component cannot be isolated. Preserve the monitor event, correlation ID, audit event ID, release ID, and public route evidence. Do not delete or edit audit events. Ask engineering to verify the public query filter and current record state. Ask privacy and safeguarding leads to assess whether personal or confidential information was exposed. Resume operations only after containment, reconciliation, code/configuration review, and management incident-owner approval.

### Audit-write failure

Fail closed. Do not publish or restore additional content. Check audit-store health, credentials, schema compatibility, queue depth, and write latency. Reconcile accepted state mutations against available audit events. If the state mutation cannot be proven, treat it as unknown and escalate rather than guessing.

### Conflict rejection

Do not retry the same request blindly. Read the current record state and recent audit events. If the article is already in private review, continue the fresh-review workflow. If it is published, verify a separate authorized publication event. If it is rejected, held, or restricted, escalate to the appropriate owner. If the current state cannot be established, keep the item blocked.

### Validation-failure spike

Group failures by bounded `validation_name` and `reason_code`. A primary-image failure is an editorial correction; a protected-record failure is a privacy or safeguarding decision; an audit failure is an engineering incident. Avoid treating all validation failures as one class or retrying them indiscriminately.

### Approval bottleneck

Check the queue age, independent-review backlog, and staffing coverage. Assign qualified reviewers without changing permissions or removing review gates. If urgency is material, management may prioritize review, but the content must still pass the same safety and publication controls.

---

## 9. SLOs and starting thresholds

The following values are proposed starting points, not verified production commitments:

| Objective | Starting target |
|---|---:|
| Public-boundary violations | 0 |
| Audit-write failure rate | 0% for completed mutations |
| Restoration requests with a recorded outcome | ≥ 99% within 15 minutes |
| Reconciliation drift | 0 unresolved events older than 10 minutes |
| p95 restoration validation latency | < 1 second, excluding human review |
| p95 independent-review age | Management-defined; suggested initial target < 24 hours |
| Unauthorized attempts with no audit event | 0 |
| Idempotent replay duplicate mutations | 0 |

Thresholds must be calibrated in staging with synthetic traffic and reviewed after the first production reporting period. Do not use low-volume ratios without minimum-count guards.

---

## 10. Validation and acceptance tests

Before production monitor activation, run the following synthetic tests:

| Test | Expected signal | Expected response |
|---|---|---|
| Valid archived-to-draft restoration | Accepted and completed events; no public violation | No critical alert |
| Direct archived-to-published attempt | Validation rejection | No provider/public mutation; rejection recorded |
| Non-admin restoration attempt | Unauthorized counter | Security/authorization monitor evaluates correctly |
| Missing confirmation | Validation failure | No state change; bounded reason logged |
| Protected record | Protected-gate rejection | Privacy/safeguarding route; no retry loop |
| Stale-state conflict | Conflict counter | No overwrite; engineering signal if threshold exceeded |
| Duplicate restoration | Replay counter | Exactly one state mutation |
| Audit-store outage | Audit failure | Fail closed; critical alert |
| Public-query regression | Boundary violation counter | Immediate critical alert and containment |
| Review backlog fixture | Pending-review gauge rises | Operational warning only |
| Metric-label scrub test | No prohibited field indexed | Pipeline test passes |
| Monitor silence test | Alert delivery confirmed | Pager/Slack route receives synthetic alert |

The test evidence should include monitor IDs, timestamps, synthetic correlation IDs, expected/actual outcomes, screenshots or exported monitor results where approved, and sign-off from engineering plus the relevant editorial/privacy owner.

---

## 11. Access controls and governance

Dashboard access should be restricted by Datadog role and team. Editorial users need aggregate workflow and backlog views. Engineering needs service-health, error, trace, and audit-integrity views. Privacy and safeguarding users need protected-exception counts and links to the approved restricted audit store, not ordinary article content. Management needs aggregate trends and SLOs.

Only authorized engineers should modify monitors, metric schemas, pipelines, dashboard queries, notification destinations, or redaction rules. Changes require code review, a change ticket, rollback instructions, and post-change validation.

Monitor silencing must require a reason, owner, expiry time, and linked incident or maintenance window. Permanent silences are prohibited for public-boundary, audit-write, or unauthorized-action monitors.

---

## 12. Implementation sequence

1. Deploy the structured event contract and sensitive-field scrubbing in staging.
2. Confirm that synthetic restoration tests emit all required metrics and logs.
3. Create the dashboard with restricted access.
4. Create monitors in notification-only mode.
5. Run the acceptance tests and calibrate thresholds against staging baselines.
6. Obtain engineering, editorial, privacy, safeguarding, security, and management sign-off.
7. Enable warning notifications first, then high-severity paging.
8. Review the first reporting period and adjust thresholds through change control.

No production Datadog configuration should be enabled from this document alone. The live workspace, notification destinations, retention periods, and on-call ownership must be confirmed first.

## 13. Engineering handoff checklist

| Item | Owner | Complete |
|---|---|:---:|
| Structured restoration events implemented | Engineering | [ ] |
| Sensitive-field scrubbing tested | Security/engineering | [ ] |
| Metric names and tags approved | Engineering/privacy | [ ] |
| Dashboard access groups configured | Datadog administrator | [ ] |
| Synthetic monitors tested | Engineering | [ ] |
| Critical routing verified | Security/on-call | [ ] |
| Editorial backlog routing verified | Editorial lead | [ ] |
| Privacy/safeguarding escalation verified | Relevant leads | [ ] |
| SLO thresholds calibrated | Management/engineering | [ ] |
| Monitor silence policy approved | Security/management | [ ] |
| Production activation signed off | Named release owner | [ ] |
