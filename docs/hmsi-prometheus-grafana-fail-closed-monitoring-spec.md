# HMSI Prometheus and Grafana Monitoring Specification

## Fail-Closed Mutation Gate, Redis Health, and Webhook Drop Monitoring

**Audience:** Platform engineering, security operations, incident response, privacy, and governance reviewers  
**Environment:** Staging-first design with production adaptation controls  
**Telemetry principle:** Patterns, not people. Metrics, labels, logs, alerts, and dashboards must not contain secrets, raw webhook bodies, personal identifiers, donor/member/worker data, article text, or arbitrary provider message content.

> This specification describes technical observability and alerting controls. It does not by itself establish SOC 2 compliance, GDPR compliance, or an independent auditor’s assurance opinion.

## 1. Monitoring objectives

The monitoring system must answer five operational questions quickly and without exposing sensitive content:

| Question | Primary signals | Required action |
|---|---|---|
| Is the mutation gate safe? | Gate state, blocked decisions, audit failures, control version | Keep or force the gate paused when state is unknown |
| Is Redis trustworthy? | Command latency, connection errors, replication/topology, lock contention, memory pressure | Block mutation when a durable idempotency decision cannot be proven |
| Are webhooks being accepted or dropped? | Received, authenticated, validated, rejected, rate-limited, queued, expired | Distinguish provider retry behavior from ingestion loss |
| Are duplicate or unknown outcomes increasing? | Duplicate rate, lock contention, unknown Jira outcomes, reconciliation backlog | Prevent blind retries and page the integration owner |
| Can operators prove what happened? | Audit writes, evidence manifests, alert firing, configuration fingerprints | Preserve bounded evidence and maintain incident traceability |

## 2. Reference telemetry architecture

The service exposes `/metrics` on an internal-only endpoint. Prometheus scrapes the service through a Kubernetes ServiceMonitor or an equivalent target configuration. Prometheus evaluates recording and alerting rules. Alertmanager groups and routes alerts to platform operations, security, integration ownership, or governance review. Grafana reads Prometheus for dashboards and may link to the approved incident runbook; it does not perform mutations.

The application emits metrics after applying label allowlists and cardinality limits. A separate exporter may collect Redis provider health, but it must use a restricted identity and must not export arbitrary key names or command arguments. Kubernetes metrics may be joined by namespace and workload labels only; do not join by pod UID, user ID, request ID, article ID, donor ID, or external event key.

## 3. Metric naming and label contract

All custom metrics use the `hmsi_` prefix and Prometheus type suffixes. Labels are fixed, low-cardinality values:

| Label | Allowlist | Prohibited values |
|---|---|---|
| `environment` | `staging`, `production` | Customer, branch, hostname, account ID |
| `service` | `mutation_gate` | Dynamic service names |
| `route` | `datadog_webhook` | URL query strings, arbitrary paths |
| `result` | Small enumerated set such as `accepted`, `duplicate`, `blocked`, `rejected`, `retryable`, `completed` | Error messages, provider text |
| `reason_code` | Enumerated control codes | Raw exception message or payload field |
| `dependency` | `redis`, `jira`, `audit`, `datadog` | Hostnames, URLs, issue titles |
| `operation` | `acquire`, `release`, `complete`, `reconcile`, `upsert` | Arbitrary command or key name |
| `state` | `open`, `paused`, `unknown`, `ready`, `degraded` | Free-form status text |
| `status_class` | `2xx`, `4xx`, `5xx`, `timeout`, `network_error` | Full status message or request body |
| `provider` | `datadog`, `jira`, `redis` | Tenant or account identifiers |

Do not label metrics with `request_id`, `event_id`, `alert_cycle_key`, `external_alert_key`, Redis key, email, IP address, monitor title, Jira issue key, or user identity. Those belong only in restricted, redacted audit records where the control requires a correlation reference.

## 4. Application metrics

### 4.1 Mutation-gate metrics

```text
hmsi_mutation_gate_state{environment,service,state}
hmsi_mutation_gate_state_changes_total{environment,service,from_state,to_state,reason_code}
hmsi_mutation_gate_admission_total{environment,service,result,reason_code}
hmsi_mutation_gate_blocked_seconds{environment,service}
hmsi_mutation_gate_open_approval_total{environment,service,result}
hmsi_mutation_gate_synthetic_probe_total{environment,service,result}
```

`hmsi_mutation_gate_state` is a gauge with one active state set to `1`. `hmsi_mutation_gate_blocked_seconds` is a counter or duration gauge selected consistently by the implementation; the preferred representation is a counter recording accumulated blocked time. A state change to `unknown` must be normalized to `paused` for admission purposes while still being visible as an incident reason.

### 4.2 Webhook metrics

```text
hmsi_webhook_requests_total{environment,service,route,result,reason_code}
hmsi_webhook_request_duration_seconds_bucket{environment,service,route,result,le}
hmsi_webhook_bytes_total{environment,service,route,result}
hmsi_webhook_rate_limited_total{environment,service,route,reason_code}
hmsi_webhook_expired_total{environment,service,route,reason_code}
hmsi_webhook_queue_depth{environment,service,route}
hmsi_webhook_queue_age_seconds{environment,service,route}
```

The histogram must use bounded buckets such as `0.01`, `0.025`, `0.05`, `0.1`, `0.25`, `0.5`, `1`, `2.5`, `5`, and `10` seconds. `hmsi_webhook_bytes_total` must be aggregate volume only; it must not expose bodies or content categories.

### 4.3 HMAC, validation, and scrubbing metrics

```text
hmsi_webhook_authentication_total{environment,service,result,reason_code}
hmsi_webhook_validation_total{environment,service,result,reason_code}
hmsi_webhook_scrub_total{environment,service,result,reason_code}
hmsi_webhook_clock_skew_seconds_bucket{environment,service,result,le}
```

Typical `reason_code` values are `signature_invalid`, `signature_missing`, `timestamp_stale`, `invalid_json`, `schema_rejected`, `field_not_allowlisted`, `payload_too_large`, `scrub_failed`, and `accepted`. Do not expose the failing field name if that field could contain personal or confidential data.

### 4.4 Redis metrics

```text
hmsi_redis_commands_total{environment,service,operation,result}
hmsi_redis_command_duration_seconds_bucket{environment,service,operation,result,le}
hmsi_redis_connection_state{environment,service,state}
hmsi_redis_connection_errors_total{environment,service,reason_code}
hmsi_redis_reconnect_total{environment,service,result}
hmsi_redis_idempotency_decisions_total{environment,service,operation,result}
hmsi_redis_lock_contention_total{environment,service}
hmsi_redis_lock_age_seconds_bucket{environment,service,le}
hmsi_redis_unknown_outcome_total{environment,service,reason_code}
hmsi_redis_replication_lag_seconds{environment,service}
hmsi_redis_memory_used_bytes{environment,service}
hmsi_redis_memory_fragmentation_ratio{environment,service}
hmsi_redis_evicted_keys_total{environment,service}
hmsi_redis_rejected_connections_total{environment,service,reason_code}
```

`operation` should be limited to `acquire`, `complete`, `release`, `lookup`, `health`, and `reconcile`. `result` should be limited to `success`, `duplicate`, `in_progress`, `unavailable`, `timeout`, `error`, and `not_found`. Never export Redis key names, values, command arguments, or arbitrary ACL usernames.

### 4.5 Jira, audit, and evidence metrics

```text
hmsi_jira_requests_total{environment,service,operation,result,status_class}
hmsi_jira_request_duration_seconds_bucket{environment,service,operation,result,le}
hmsi_jira_unknown_outcome_total{environment,service,operation,reason_code}
hmsi_jira_reconciliation_total{environment,service,result}
hmsi_audit_writes_total{environment,service,result,reason_code}
hmsi_evidence_manifest_total{environment,service,result}
hmsi_evidence_verification_total{environment,service,result,reason_code}
hmsi_outbox_items{environment,service,state}
hmsi_outbox_oldest_age_seconds{environment,service,state}
```

Jira `operation` values are `create`, `update`, `reconcile`, and `health`. Do not use Jira project, issue, summary, or external key as a label. Audit failure is a mutation-blocking signal.

## 5. Prometheus recording rules

Prometheus recording rules precompute expensive or repeatedly used expressions. Prometheus supports recording and alerting rules evaluated at regular intervals.[1]

```yaml
groups:
  - name: hmsi-mutation-gate-recording
    interval: 30s
    rules:
      - record: hmsi:webhook_acceptance_ratio:5m
        expr: |
          sum(rate(hmsi_webhook_requests_total{result="accepted"}[5m]))
          /
          clamp_min(sum(rate(hmsi_webhook_requests_total[5m])), 1)

      - record: hmsi:webhook_drop_ratio:5m
        expr: |
          sum(rate(hmsi_webhook_requests_total{result=~"rejected|blocked|rate_limited|expired"}[5m]))
          /
          clamp_min(sum(rate(hmsi_webhook_requests_total[5m])), 1)

      - record: hmsi:redis_command_latency_p95:5m
        expr: |
          histogram_quantile(
            0.95,
            sum by (environment, service, operation, result, le) (
              rate(hmsi_redis_command_duration_seconds_bucket[5m])
            )
          )

      - record: hmsi:redis_command_latency_p99:5m
        expr: |
          histogram_quantile(
            0.99,
            sum by (environment, service, operation, result, le) (
              rate(hmsi_redis_command_duration_seconds_bucket[5m])
            )
          )

      - record: hmsi:idempotency_duplicate_ratio:15m
        expr: |
          sum(rate(hmsi_redis_idempotency_decisions_total{result="duplicate"}[15m]))
          /
          clamp_min(sum(rate(hmsi_redis_idempotency_decisions_total[15m])), 1)

      - record: hmsi:jira_mutation_count:5m
        expr: |
          sum(rate(hmsi_jira_requests_total{operation=~"create|update"}[5m]))

      - record: hmsi:audit_write_failure_ratio:15m
        expr: |
          sum(rate(hmsi_audit_writes_total{result="failure"}[15m]))
          /
          clamp_min(sum(rate(hmsi_audit_writes_total[15m])), 1)
```

The exact definition of `drop_ratio` must be agreed with the provider delivery contract. A `4xx` validation rejection is not the same as a network drop, so dashboards must show them separately even if the SLO aggregates them.

## 6. Alerting rules

Prometheus alerting rules send alerts to Alertmanager, which groups, silences, and inhibits related alerts.[2] The thresholds below are starting points for staging validation and require calibration against real baseline measurements.

```yaml
groups:
  - name: hmsi-mutation-gate-alerts
    interval: 30s
    rules:
      - alert: HMSIMutationGatePaused
        expr: hmsi_mutation_gate_state{state="paused"} == 1
        for: 2m
        labels:
          severity: high
          team: platform
          control_id: CC7.2
        annotations:
          summary: "HMSI mutation gate is paused"
          description: "External mutation is blocked; inspect the linked incident runbook."
          runbook_url: "https://<hmsi-runbook-host>/split-brain-redis-webhook-flood-recovery"

      - alert: HMSIMutationGateUnknown
        expr: hmsi_mutation_gate_state{state="unknown"} == 1
        for: 30s
        labels:
          severity: critical
          team: security
          control_id: CC7.2
        annotations:
          summary: "HMSI mutation gate state is unknown"
          description: "Treat the gate as paused and investigate control-plane integrity."

      - alert: HMSIRedisUnavailableFailClosed
        expr: |
          sum(rate(hmsi_redis_connection_errors_total{reason_code=~"timeout|unavailable|network_error"}[5m])) > 0
          and sum(rate(hmsi_jira_requests_total{operation=~"create|update"}[5m])) > 0
        for: 1m
        labels:
          severity: critical
          team: platform
          control_id: CC7.2
        annotations:
          summary: "Redis is unavailable while Jira mutations continue"
          description: "This violates the fail-closed invariant; pause mutation immediately."

      - alert: HMSIRedisLatencySpike
        expr: |
          hmsi:redis_command_latency_p95:5m{operation=~"acquire|complete|lookup"} > 0.25
          or hmsi:redis_command_latency_p99:5m{operation=~"acquire|complete|lookup"} > 1
        for: 5m
        labels:
          severity: high
          team: platform
          control_id: A1.2
        annotations:
          summary: "Redis idempotency latency is elevated"
          description: "Check partition, topology, connection pool, and provider health before mutation is reopened."

      - alert: HMSIRedisPartitionIndicators
        expr: |
          hmsi_redis_connection_state{state!="ready"} == 1
          or hmsi_redis_replication_lag_seconds > 5
          or hmsi_redis_lock_contention_total > 100
        for: 2m
        labels:
          severity: critical
          team: platform
          control_id: CC7.2
        annotations:
          summary: "Redis partition or authority uncertainty indicators detected"
          description: "Keep mutation paused and use the split-brain recovery runbook."

      - alert: HMSIWebhookDropRateHigh
        expr: hmsi:webhook_drop_ratio:5m > 0.05
        for: 5m
        labels:
          severity: high
          team: integration
          control_id: CC7.2
        annotations:
          summary: "Webhook drop or rejection rate exceeds 5 percent"
          description: "Separate provider delivery loss from intentional validation rejection."

      - alert: HMSIWebhookFloodRateHigh
        expr: sum(rate(hmsi_webhook_requests_total[5m])) > 25
        for: 5m
        labels:
          severity: high
          team: integration
          control_id: CC7.2
        annotations:
          summary: "Webhook ingress rate exceeds staging or canary budget"
          description: "Throttle the isolated route and keep external mutation bounded."

      - alert: HMSIIdempotencyUnknownOutcome
        expr: sum(rate(hmsi_redis_unknown_outcome_total[5m])) > 0
        for: 1m
        labels:
          severity: critical
          team: integration
          control_id: CC7.2
        annotations:
          summary: "Unknown idempotency outcome detected"
          description: "Do not retry blindly; reconcile the deterministic external key first."

      - alert: HMSIAuditWriteFailure
        expr: sum(rate(hmsi_audit_writes_total{result="failure"}[5m])) > 0
        for: 1m
        labels:
          severity: critical
          team: security
          control_id: CC7.3
        annotations:
          summary: "Audit ledger write failure"
          description: "Mutation must remain blocked until audit integrity is restored."

      - alert: HMSIJiraUnknownOutcome
        expr: sum(rate(hmsi_jira_unknown_outcome_total[5m])) > 0
        for: 1m
        labels:
          severity: critical
          team: integration
          control_id: CC7.2
        annotations:
          summary: "Jira mutation outcome is unknown"
          description: "Search by deterministic external key before any retry."

      - alert: HMSIOutboxAgeHigh
        expr: hmsi_outbox_oldest_age_seconds{state=~"unknown|retryable|reconciliation_required"} > 900
        for: 5m
        labels:
          severity: high
          team: integration
          control_id: CC7.2
        annotations:
          summary: "HMSI reconciliation outbox is aging"
          description: "Review backlog without replaying events automatically."
```

The alert that detects Jira mutations while Redis is unavailable is deliberately a control-violation alert. It should page security and platform operations simultaneously and should trigger an application-level emergency pause where that action is implemented and approved.

## 7. Grafana dashboard specification

Create one dashboard named **HMSI — Fail-Closed Mutation Gate** with a staging/production variable and a fixed 15-minute, 1-hour, 6-hour, and 24-hour time-range selector. Grafana dashboard variables must only query fixed allowlisted values; never derive variables from arbitrary label values such as issue keys or event IDs.

### Row 1 — Safety state

| Panel | Visualization | Query / content | Threshold |
|---|---|---|---|
| Mutation gate state | State timeline | `hmsi_mutation_gate_state` | Green `open`; amber `paused`; red `unknown` |
| Gate blocks | Stat + sparkline | `sum(increase(hmsi_mutation_gate_admission_total{result="blocked"}[$__range]))` | Informational; correlate with incident |
| Control violation | Stat | Jira mutation rate while Redis errors are nonzero | Must remain zero |
| Last synthetic probe | Table | Result, timestamp, bounded reason, evidence reference | Must be recent and passing before reopen |

### Row 2 — Redis health and latency

| Panel | Visualization | Query / content | Threshold |
|---|---|---|---|
| Redis p95/p99 command latency | Time series | `hmsi:redis_command_latency_p95:5m` and p99 | Warning 250 ms; critical 1 s |
| Connection state | State timeline | `hmsi_redis_connection_state` | Any non-ready state is incident context |
| Idempotency decisions | Stacked time series | `rate(hmsi_redis_idempotency_decisions_total[5m])` by result | Unavailable/timeout requires pause |
| Lock contention | Time series | `rate(hmsi_redis_lock_contention_total[5m])` | Baseline-dependent; alert on sustained spike |
| Replication lag | Time series | `hmsi_redis_replication_lag_seconds` | Warning 5 s; critical provider-specific |
| Memory and evictions | Time series | Used bytes, fragmentation, evictions | Alert before eviction threatens completion records |

### Row 3 — Webhook health

| Panel | Visualization | Query / content | Threshold |
|---|---|---|---|
| Webhook throughput | Time series | `sum(rate(hmsi_webhook_requests_total[5m]))` | Compare to route budget |
| Accepted vs rejected | Stacked time series | Requests by bounded result | No single aggregate-only view |
| Drop/rejection ratio | Gauge and time series | `hmsi:webhook_drop_ratio:5m` | Warning 2%; critical 5%, calibrated |
| Request latency | Heatmap | Histogram by route/result | Identify provider or ingress degradation |
| Queue depth and age | Time series | Queue depth and oldest age | Critical when reconciliation backlog ages |
| Rate-limited requests | Stat | `increase(hmsi_webhook_rate_limited_total[$__range])` | Correlate with flood alert |

### Row 4 — External mutation and recovery

| Panel | Visualization | Query / content | Threshold |
|---|---|---|---|
| Jira creates/updates | Time series | `hmsi_jira_requests_total` by operation/result | Zero while gate is paused or Redis is unavailable |
| Unknown outcomes | Stat + table | Count and bounded reason code | Any nonzero requires reconciliation |
| Reconciliation backlog | Table | Outbox state, count, oldest age | No automatic retry from panel |
| Duplicate ratio | Time series | `hmsi:idempotency_duplicate_ratio:15m` | Sudden increase indicates flood/replay |

### Row 5 — Audit and privacy controls

| Panel | Visualization | Query / content | Threshold |
|---|---|---|---|
| Audit write result | Stacked time series | `hmsi_audit_writes_total` by result | Any failure is critical |
| Evidence verification | Stat | Signed manifest verification result | Must pass before reopening |
| Redaction failures | Stat | `hmsi_webhook_scrub_total{result="failure"}` | Any nonzero is critical |
| Label cardinality | Table | Prometheus series count for `hmsi_` metrics | Unexpected growth is an observability incident |

A dashboard annotation should mark gate pauses, configuration changes, Redis provider events, and chaos-test windows using bounded incident IDs. The annotation payload must contain no raw event data.

## 8. Alert routing and inhibition

Alertmanager should route by `severity`, `team`, `environment`, and `control_id`. Group by environment, service, and incident class rather than by dynamic identifiers. A Redis partition should inhibit secondary alerts such as latency, lock contention, and outbox age only when the primary partition alert is firing; the inhibited alerts must remain visible in the incident timeline.

| Alert class | Primary route | Secondary route | Operator expectation |
|---|---|---|---|
| Gate unknown or Redis partition | Platform on-call | Security on-call | Pause mutation, throttle ingress, inspect topology |
| Audit write failure | Security on-call | Governance reviewer | Keep mutation paused; verify ledger/evidence path |
| Webhook flood/drop | Integration on-call | Platform on-call | Separate provider failure from intentional rejection |
| Jira unknown outcome | Integration on-call | Incident commander | Reconcile by deterministic external key |
| Label/cardinality growth | Platform on-call | Privacy reviewer | Stop metric emission change and inspect labels |

Grafana may display alert state, but Alertmanager remains the source of notification routing and inhibition. No dashboard panel should contain a button that directly replays, retries, reopens, deletes, or mutates a Jira record.

## 9. SLO and error-budget framework

Use separate SLOs so good availability does not hide an integrity failure:

| SLO | Starting target | Measurement |
|---|---:|---|
| Authenticated webhook processing availability | 99.5% | Accepted or safely rejected with a bounded response, excluding planned maintenance |
| Webhook drop rate | < 0.5% | Network/ingress loss only; validation rejects reported separately |
| Redis idempotency decision availability | 99.9% | Successful acquire/duplicate/complete decision, not merely TCP reachability |
| Duplicate external mutation rate | 0 | Count of duplicate Jira creates/updates by deterministic key |
| Unknown-outcome reconciliation time | 99% within 15 minutes | Time from unknown outcome to resolved external-key state |
| Audit write success | 99.99% | Append-only audit write success before mutation authorization |

A single duplicate external mutation or evidence-integrity failure should trigger a security review even if the availability SLO remains within budget.

## 10. Deployment and verification sequence

Start in staging with `JIRA_MUTATION_ENABLED=false`, `SYNC_DRY_RUN=true`, `MUTATION_GATE_INITIAL_STATE=PAUSED`, and `SYNTHETIC_ONLY=true`. Verify that Prometheus scrapes the service, recording rules evaluate, Alertmanager receives a synthetic test alert, and Grafana panels render without high-cardinality labels.

Next, run synthetic probes for invalid HMAC, stale timestamps, schema rejection, Redis timeout, Redis partition, duplicate delivery, lock contention, completion write failure, Jira timeout, and audit write failure. The expected result for every uncertainty case is a blocked or safely retryable response and zero Jira mutation.

Only after the probes pass may a reviewer enable a single synthetic Jira mutation route. Reopen the gate for a canary interval, observe the dashboards, and close the gate again. Production adaptation requires independent review of thresholds, routing, retention, secret scopes, and provider-specific Redis failover behavior.

## 11. Privacy and security guardrails

Prometheus is not an event archive. Metrics must remain aggregate, bounded, and low-cardinality. Grafana users should receive role-based read access, with edit and alert-management privileges restricted to platform operators. Alertmanager receivers must use approved TLS endpoints and must not forward raw payloads.

The telemetry pipeline must reject or redact logs that contain HMAC signatures, Redis URLs, passwords, API tokens, authorization headers, raw webhook bodies, email addresses, phone numbers, IP addresses, article content, or Jira descriptions. If redaction fails, the application must fail closed for mutation and emit only a bounded failure code.

## 12. References

[1]: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/ "Prometheus, Defining recording rules"  
[2]: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ "Prometheus, Alerting rules"  
[3]: https://prometheus.io/docs/alerting/latest/overview/ "Prometheus, Alerting overview"  
[4]: https://grafana.com/docs/grafana/latest/datasources/prometheus/ "Grafana, Prometheus data source"  
[5]: https://grafana.com/docs/grafana/latest/alerting/ "Grafana, Alerting documentation"  
