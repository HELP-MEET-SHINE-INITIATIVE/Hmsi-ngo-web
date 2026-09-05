# HMSI Retention Override Monitoring and Alerting Dashboard Specification

**Purpose:** Define a privacy-safe monitoring and alerting design for failed retention overrides, suppression exceptions, approval bottlenecks, destructive-operation safeguards, and retention-service health.

**Target platforms:** Datadog and Prometheus/Grafana. The metrics and event contracts are platform-neutral; the query examples are implementation mappings.

**Status:** Implementation-ready monitoring specification; thresholds require calibration against staging baselines before production paging.

> **Privacy boundary:** Observability must show operational patterns, not people. Do not place volunteer names, emails, phone numbers, raw feedback, free-text narratives, precise locations, CRM record URLs, access tokens, approval text, or direct identifiers in metric labels, dashboard titles, alert messages, or ordinary logs.

## 1. Monitoring objectives

The dashboard must answer five operational questions:

| Objective | Required signal |
|---|---|
| Are unauthorized or invalid overrides being attempted? | Denied-action rate by bounded reason and role class |
| Are approvals becoming a bottleneck? | Queue depth, age bands, and approval latency |
| Are suppression exceptions protecting sensitive data? | Open exception count, age, risk band, and unresolved outcomes |
| Could a destructive action proceed unsafely? | Blocked preflights, missing approvals, hold gates, unknown provider results |
| Is the automation healthy? | Run success, batch duration, provider latency, audit-write failures, reconciliation drift |

The dashboard is not an investigative record browser. Detailed case evidence remains in the restricted audit system and approved privacy queues.

## 2. Telemetry contract

### 2.1 Common event envelope

Every retention or suppression operation should emit a structured event with this minimum envelope:

```json
{
  "event_name": "retention_action_denied",
  "event_version": "1.0",
  "occurred_at": "2026-08-25T20:00:00Z",
  "environment": "staging",
  "service": "hmsi-retention-policy",
  "run_id": "run_01J...",
  "batch_id": "batch_01J...",
  "action": "delete",
  "object_class": "normalized_feedback",
  "actor_type": "human",
  "role_class": "team_lead",
  "scope_class": "programme",
  "reason_code": "missing_approval_reference",
  "result": "rejected",
  "approval_required": true,
  "approval_present": false,
  "audit_write_result": "accepted",
  "provider": "salesforce",
  "duration_ms": 42,
  "record_count_band": "1-10"
}
```

`run_id`, `batch_id`, and object reference hashes may be retained in the restricted audit store, but must not be used as high-cardinality dashboard labels. Use them only for trace correlation or a restricted drill-down link.

### 2.2 Allowed labels/tags

Use a small, bounded vocabulary:

```text
environment:staging|production
provider:salesforce|hubspot
service:hmsi-retention-policy|hmsi-suppression-service
action:review|override|delete|anonymise|apply_suppression|release_suppression|reconcile
result:accepted|completed|rejected|skipped|failed|unknown
reason_code:<allowlisted_code>
role_class:coordinator|team_lead|programme_director|privacy_reviewer|privacy_approver|security_reviewer|service
record_class:normalized_feedback|aggregate_read_model|restricted_support|safeguarding|security_incident
risk_band:low|medium|high|critical
provider_error_class:timeout|rate_limit|auth|validation|conflict|unknown|none
```

Do not use `user_id`, `email`, `phone`, `volunteer_id`, `crm_record_id`, `approval_reference`, `free_text`, `location`, or raw `exception_reason` as labels. If an event must be correlated to an individual case, use a keyed HMAC reference in the restricted audit system and never expose it as a metric dimension.

## 3. Metric catalogue

Use a common `hmsi_retention_` namespace. Counters are monotonic; gauges represent current state; histograms measure latency or age.

### 3.1 Override attempts and failures

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `hmsi_retention_override_attempts_total` | Counter | action, result, role_class, reason_code, provider | All override attempts |
| `hmsi_retention_override_denied_total` | Counter | action, role_class, reason_code, provider | Authorization or safety-denied actions |
| `hmsi_retention_override_approval_missing_total` | Counter | action, provider | Attempts without valid approval |
| `hmsi_retention_override_self_approval_total` | Counter | action, provider | Self-approval or non-independent approval attempts |
| `hmsi_retention_override_scope_denied_total` | Counter | action, role_class, provider | Scope mismatch or role mismatch |
| `hmsi_retention_override_preflight_blocked_total` | Counter | action, gate, provider | Final preflight prevented mutation |
| `hmsi_retention_override_duration_seconds` | Histogram | action, provider, result | End-to-end policy evaluation latency |

### 3.2 Approval bottlenecks

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `hmsi_retention_approval_queue_depth` | Gauge | action, risk_band, provider | Open approval requests |
| `hmsi_retention_approval_age_seconds` | Histogram | action, risk_band | Age of open approval request |
| `hmsi_retention_approval_latency_seconds` | Histogram | action, risk_band, result | Time from request to decision |
| `hmsi_retention_approval_expired_total` | Counter | action, provider | Requests expired before decision |
| `hmsi_retention_approval_rejected_total` | Counter | action, reason_code, provider | Rejected requests |
| `hmsi_retention_approval_rework_total` | Counter | action, reason_code | Requests returned for missing evidence or correction |
| `hmsi_retention_approval_sla_breach_total` | Counter | action, risk_band | Requests beyond approved service target |

### 3.3 Suppression exceptions

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `hmsi_suppression_exceptions_open` | Gauge | reason_code, risk_band, provider | Current unresolved exceptions |
| `hmsi_suppression_exception_created_total` | Counter | reason_code, risk_band, provider | New exceptions |
| `hmsi_suppression_exception_resolved_total` | Counter | outcome, risk_band, provider | Closed exceptions by outcome |
| `hmsi_suppression_exception_age_seconds` | Histogram | risk_band, reason_code | Age of open exception |
| `hmsi_suppression_release_denied_total` | Counter | reason_code, provider | Release requests blocked |
| `hmsi_suppression_two_person_missing_total` | Counter | risk_band, provider | High-risk release without independent second approver |
| `hmsi_suppression_export_blocked_total` | Counter | export_class, reason_code | Unsafe export blocked by suppression policy |
| `hmsi_suppression_small_cell_blocked_total` | Counter | aggregation_level, provider | Small-cell protection events |

### 3.4 Automation and provider health

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `hmsi_retention_runs_total` | Counter | mode, result, provider | Retention run outcomes |
| `hmsi_retention_batches_total` | Counter | action, result, provider | Batch outcomes |
| `hmsi_retention_batch_duration_seconds` | Histogram | action, provider, result | Batch duration |
| `hmsi_retention_provider_requests_total` | Counter | provider, operation, result, error_class | Adapter calls |
| `hmsi_retention_provider_request_duration_seconds` | Histogram | provider, operation | Provider latency |
| `hmsi_retention_reconciliation_drift` | Gauge | provider, record_class | Source/provider count or state discrepancy |
| `hmsi_retention_unknown_provider_result_total` | Counter | provider, operation | Provider result cannot be confirmed |
| `hmsi_retention_audit_write_failure_total` | Counter | event_type, provider | Audit event write failures |
| `hmsi_retention_run_lock_contention_total` | Counter | environment | Concurrent-run prevention events |
| `hmsi_retention_retry_total` | Counter | provider, operation, error_class | Retried provider or workflow calls |

## 4. Dashboard specification

Create one executive summary dashboard and three restricted operational dashboards. The executive view must use aggregate counts and bands only.

### 4.1 Dashboard A — Retention Governance Overview

**Audience:** Programme director, privacy lead/DPO, security lead, compliance reviewer.

| Panel | Visualization | Query/measure | Alert relationship |
|---|---|---|---|
| Override attempts | Timeseries | Attempts, accepted, rejected by day | Sudden-denial monitor |
| Failed override rate | Query value + timeseries | Denied / total attempts | Page only for sustained anomaly |
| Approval queue depth | Query value | Open approvals by risk band | Bottleneck warning/critical |
| Approval age bands | Stacked bar | `<24h`, `24–72h`, `>72h`, `>7d` | SLA-breach monitor |
| Suppression exceptions | Timeseries | Open/created/resolved | Critical-age alert |
| High-risk release attempts | Query value | High-risk release requests and missing-2P count | Immediate privacy alert |
| Preflight blocks | Table by gate | Hold, rights, incident, correction, approval, reconciliation | Safety trend |
| Unknown provider results | Query value | Unknown results by provider | Critical operations alert |
| Audit-write failures | Query value | Failed audit writes | Stop-ship/critical |
| Run health | Status tiles | Last successful run, last completed batch, dry-run mode | Scheduler alert |

### 4.2 Dashboard B — Approval Operations

**Audience:** Privacy reviewers, privacy approvers, programme directors.

Panels should show queue depth by action and risk band, median and p95 approval latency, oldest open request by age band, requests approaching SLA, expired requests, rejection/rework rate, and second-approver availability. Do not show names or full request narratives in the dashboard. A restricted case-management link may be provided only to authorized reviewers.

### 4.3 Dashboard C — Suppression and Privacy Exceptions

**Audience:** Privacy lead/DPO, safeguarding lead for restricted scope, security lead for incident scope.

Panels should show suppression applications by reason code, unresolved exceptions by risk band, small-cell blocks, cross-filter blocks, confidential-route blocks, exception age, outcomes, and export blocks. The dashboard must not permit a user to click through from an aggregate panel to raw feedback without a separate restricted authorization check.

### 4.4 Dashboard D — Automation and Provider Reliability

**Audience:** Engineering, CRM administrator, retention operator, security lead.

Panels should show run success/failure, dry-run versus execution mode, batch duration, provider request latency, provider error classes, rate-limit events, reconciliation drift, run-lock contention, retries, unknown outcomes, and audit-write failures.

## 5. Datadog implementation

### 5.1 Metric submission

Emit metrics through DogStatsD or the Datadog Metrics API from the policy service. Use bounded tags only. Example pseudocode:

```ts
metrics.increment("hmsi.retention.override.denied", 1, [
  `environment:${env}`,
  `provider:${provider}`,
  `action:${action}`,
  `role_class:${roleClass}`,
  `reason_code:${reasonCode}`,
]);

metrics.histogram("hmsi.retention.approval.latency", latencySeconds, [
  `environment:${env}`,
  `action:${action}`,
  `risk_band:${riskBand}`,
]);
```

Normalize metric names to the chosen Datadog naming convention. Do not interpolate identifiers into metric names or tags.

### 5.2 Datadog monitors

Thresholds below are starting values and must be calibrated with staging baselines.

| Monitor | Suggested query/condition | Severity | Initial action |
|---|---|---|---|
| Audit write failure | `sum(last_5m):sum:hmsi.retention.audit_write_failure > 0` | Critical | Halt destructive mode; page security/privacy and engineering |
| Unknown provider result | `sum(last_15m):sum:hmsi.retention.unknown_provider_result > 0` | Critical | Pause retries; open reconciliation incident |
| High-risk suppression release without 2P | `sum(last_15m):sum:hmsi.suppression.two_person_missing > 0` | Critical | Block release; page privacy lead |
| Approval queue critical | `max(last_15m):sum:hmsi.retention.approval.queue_depth{risk_band:high,action:delete} > 10` | Critical | Assign independent approvers; notify privacy lead |
| Approval SLA breach | `sum(last_1h):sum:hmsi.retention.approval.sla_breach > 0` | Warning/Critical by risk | Escalate owner; review oldest request |
| Denial anomaly | `sum(last_15m):sum:hmsi.retention.override.denied > baseline + 3σ` | Warning | Investigate credential, role, or UI/API regression |
| Provider error rate | `errors / requests > 5% for 15m` | Warning | Inspect provider status and backoff |
| Reconciliation drift | `abs(max(last_15m):hmsi.retention.reconciliation.drift) > 0` | Warning/Critical by class | Freeze dependent batches |
| Run missing | `count(last_24h):hmsi.retention.run.success < 1` | Warning | Inspect scheduler and service health |
| Run lock contention | `sum(last_15m):hmsi.retention.run_lock_contention > 3` | Warning | Check overlapping schedules or stuck worker |

Use multi-alert grouping by `provider`, `action`, and `risk_band` only where cardinality remains bounded. Exclude `run_id`, record hashes, and actor IDs from grouping.

### 5.3 Datadog log pipeline

Parse only structured events from the retention service. Create processors that:

1. Drop or redact fields matching email, phone, token, URL, raw narrative, CRM record ID, or free-text fields.
2. Normalize `reason_code`, `role_class`, `action`, `result`, and `provider` to allowlists.
3. Add environment and service tags from trusted runtime configuration.
4. Route restricted audit events to a restricted index with shorter operational access and longer compliance retention.
5. Exclude raw payloads from APM span attributes and error messages.

## 6. Prometheus/Grafana implementation

### 6.1 Prometheus exposition examples

Expose metrics at `/metrics` from the policy service:

```text
# HELP hmsi_retention_override_denied_total Denied retention override attempts.
# TYPE hmsi_retention_override_denied_total counter
hmsi_retention_override_denied_total{environment="production",provider="salesforce",action="delete",role_class="team_lead",reason_code="missing_approval_reference"} 4

# HELP hmsi_retention_approval_queue_depth Open approval requests.
# TYPE hmsi_retention_approval_queue_depth gauge
hmsi_retention_approval_queue_depth{environment="production",action="delete",risk_band="high"} 3

# HELP hmsi_retention_approval_age_seconds Age of open approval requests.
# TYPE hmsi_retention_approval_age_seconds histogram
hmsi_retention_approval_age_seconds_bucket{environment="production",action="delete",risk_band="high",le="86400"} 7
```

Use bounded labels. Never expose identifiers as labels.

### 6.2 Recording rules

```yaml
groups:
  - name: hmsi-retention-recording
    interval: 1m
    rules:
      - record: hmsi:override_denial_rate5m
        expr: |
          sum by (environment, provider, action) (rate(hmsi_retention_override_denied_total[5m]))
          /
          clamp_min(sum by (environment, provider, action) (rate(hmsi_retention_override_attempts_total[5m])), 1)

      - record: hmsi:approval_queue_high_risk
        expr: |
          sum by (environment, provider, action) (
            hmsi_retention_approval_queue_depth{risk_band="high"}
          )

      - record: hmsi:approval_p95_age_seconds
        expr: |
          histogram_quantile(
            0.95,
            sum by (environment, action, le) (
              rate(hmsi_retention_approval_age_seconds_bucket[15m])
            )
          )

      - record: hmsi:suppression_exception_open_high_risk
        expr: |
          sum by (environment, provider) (
            hmsi_suppression_exceptions_open{risk_band=~"high|critical"}
          )

      - record: hmsi:provider_error_rate15m
        expr: |
          sum by (environment, provider, operation) (rate(hmsi_retention_provider_requests_total{result="failed"}[15m]))
          /
          clamp_min(sum by (environment, provider, operation) (rate(hmsi_retention_provider_requests_total[15m])), 1)
```

### 6.3 Prometheus alert rules

```yaml
groups:
  - name: hmsi-retention-alerts
    rules:
      - alert: HmsiRetentionAuditWriteFailure
        expr: sum by (environment) (rate(hmsi_retention_audit_write_failure_total[5m])) > 0
        for: 2m
        labels:
          severity: critical
          owner: privacy-security
        annotations:
          summary: "HMSI retention audit writes are failing"
          description: "Destructive retention processing must remain paused until audit writes recover."

      - alert: HmsiRetentionUnknownProviderResult
        expr: sum by (environment, provider, operation) (rate(hmsi_retention_unknown_provider_result_total[15m])) > 0
        for: 5m
        labels:
          severity: critical
          owner: retention-operations
        annotations:
          summary: "HMSI provider result is unknown"
          description: "Do not blindly retry; reconcile provider state before resuming."

      - alert: HmsiHighRiskSuppressionReleaseMissingTwoPersonApproval
        expr: sum by (environment, provider) (rate(hmsi_suppression_two_person_missing_total[15m])) > 0
        for: 1m
        labels:
          severity: critical
          owner: privacy
        annotations:
          summary: "High-risk suppression release lacked independent two-person approval"
          description: "Release must remain blocked and the authorization path must be investigated."

      - alert: HmsiRetentionApprovalQueueBottleneck
        expr: hmsi:approval_queue_high_risk > 10
        for: 30m
        labels:
          severity: warning
          owner: privacy-operations
        annotations:
          summary: "High-risk retention approval queue is blocked"
          description: "Assign independent approvers and inspect oldest requests by age band."

      - alert: HmsiRetentionProviderErrorRateHigh
        expr: hmsi:provider_error_rate15m > 0.05
        for: 15m
        labels:
          severity: warning
          owner: retention-operations
        annotations:
          summary: "Retention provider error rate exceeds 5%"
          description: "Inspect provider error class, rate limits, and adapter health."
```

Use Alertmanager grouping by `alertname`, `provider`, `operation`, and `environment`. Do not group or route by record reference, actor ID, email, or raw reason text.

## 7. Alert routing and runbooks

| Alert class | Primary owner | Secondary owner | Required immediate response |
|---|---|---|---|
| Audit-write failure | Engineering | Privacy/security | Pause destructive mode; preserve event queue; verify append-only store |
| Unknown provider result | Retention operations | Security/privacy | Stop retries; reconcile provider state manually or through a safe job |
| Missing two-person approval | Privacy lead | Security lead | Keep action blocked; inspect approval workflow and permissions |
| Hold/rights/incident gate failure | Privacy or safeguarding | Engineering | Block batch; validate protection flags and restricted route |
| Approval bottleneck | Privacy operations | Programme director | Assign independent approver; inspect SLA and rework causes |
| Export suppression block | Privacy lead | Data/reporting owner | Do not publish export; review aggregate query and suppression rule |
| Provider error spike | Engineering | CRM administrator | Check status, quotas, credentials, backoff, and recent deployments |

Alert messages should contain only environment, provider, action, risk band, metric values, dashboard URL, and runbook URL. The restricted case reference belongs in the audit system, not the paging payload.

## 8. SLO and threshold calibration

Initial targets should be treated as proposed, not production commitments:

| Service objective | Initial target |
|---|---|
| Audit event write success | 99.99% for accepted events |
| High-risk actions without two-person approval | 0 |
| Destructive actions while a protected gate is active | 0 |
| Unknown provider results unresolved beyond one business day | 0 |
| High-risk approval requests beyond approved SLA | 0 without an exception owner |
| Suppressed cells exposed in aggregate output | 0 |
| Retention scheduler successful run | At least one within each approved run window |

Calibrate alert thresholds from at least two weeks of staging or controlled production-like telemetry. Avoid paging on ordinary user mistakes; page on sustained anomalies, bypass attempts, or evidence that a safety boundary failed.

## 9. Access control and privacy safeguards

Dashboard access should mirror the HMSI RBAC matrix. Programme leadership receives aggregate views. Privacy and safeguarding roles receive restricted exception views. Engineering receives service-health and bounded failure data, not raw volunteer content. Only authorized audit/compliance personnel can inspect detailed audit evidence, and access to the audit dashboard itself must generate an audit event.

Use separate Datadog roles, index permissions, Grafana folders, data sources, and alert-notification channels for executive, operational, privacy, safeguarding, and security views. Keep production and staging dashboards separate. Use service accounts for metric emission and read-only dashboard access where possible.

## 10. Validation and acceptance tests

| Test | Expected result |
|---|---|
| Emit denied self-approval event | Counter increases; bounded reason tag appears; no identifier is logged |
| Trigger missing second approver | Critical privacy alert fires; release remains blocked |
| Simulate audit-write failure | Destructive mode pauses; alert fires; event is queued safely |
| Simulate provider timeout | Retry metric increments; no immediate deletion retry after unknown result |
| Create high-risk approval backlog | Queue and age panels update; bottleneck alert fires after threshold |
| Apply small-cell suppression | Suppression counter updates; aggregate panel remains suppressed |
| Attempt unsafe export | Export-block metric increments; no report artifact is published |
| Replay identical event | Metrics are not double-counted if event idempotency is part of the telemetry collector |
| Inject an email or CRM ID into log payload | Redaction test removes or rejects the field |
| Remove dashboard viewer permission | Restricted panels and audit drill-down are inaccessible |
| Query high-cardinality labels | Lint/CI check fails if forbidden labels are present |
| Stop scheduler | Missing-run alert fires within the approved window |

## 11. Implementation sequence

First instrument the retention policy service with the common event envelope, bounded labels, counters, gauges, and histograms. Next, build the executive and operational dashboards in staging using synthetic fixtures. Then implement alert routing and runbooks, execute the acceptance tests, and calibrate thresholds against observed staging behavior. Finally, obtain privacy, security, and engineering sign-off before enabling production paging or execution-mode integrations.

The monitoring layer must never be the only safeguard. A missing metric, dashboard outage, or alert-routing failure must not make a destructive operation eligible. The policy service remains fail-closed when audit, approval, hold, suppression, or reconciliation checks cannot be confirmed.

## References

[1]: ./hmsi-retention-rbac-override-suppression-matrix.md "HMSI RBAC Matrix for Retention Overrides and Suppression Exceptions"

[2]: ./hmsi-retention-audit-logging-specification.md "HMSI Retention Audit Logging Specification"

[3]: ./hmsi-staged-retention-automation-scripts.md "HMSI Staged Retention Automation Scripts and Workflow Rules"

[4]: ./hmsi-staged-retention-acceptance-test-checklist.md "HMSI Staged Retention State Machine Acceptance Test Checklist"

[5]: https://docs.datadoghq.com/metrics/ "Datadog Metrics Documentation"

[6]: https://prometheus.io/docs/concepts/metric_types/ "Prometheus Metric Types"

[7]: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ "Prometheus Alerting Rules Documentation"

[8]: https://grafana.com/docs/grafana/latest/alerting/ "Grafana Alerting Documentation"
