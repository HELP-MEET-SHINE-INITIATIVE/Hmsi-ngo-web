# HMSI Supavisor Real-Time Dashboard Configuration

## Purpose

This configuration visualizes the connection pressure that can cause slow volunteer task reads, assignment write failures, and fail-closed mutation-gate pauses. It provides live Supavisor capacity, checkout queue wait, query timeout, and mutation-gate state in a single Grafana dashboard. The dashboard uses normalized HMSI metrics because the exact raw metric names exposed by a managed Supabase Metrics API, a self-hosted Supavisor `/metrics` endpoint, or a collector can vary by deployment.

Supavisor exposes Prometheus-format metrics for pool checkout queue time, connected clients, query durations/counts, and network usage; in a managed Supabase project, use the approved metrics endpoint or Grafana integration rather than attempting to scrape an internal endpoint.[1] Supabase’s connection monitoring shows both Supavisor and direct Postgres connections and recommends sizing the pool relative to actual workload and reserved service capacity.[2] [3]

## Metric adapter contract

The Prometheus rule file expects the following low-cardinality normalized metrics. The collector must translate the provider’s metrics into these names and must never include tenant identifiers, hostnames, user IDs, emails, proof URLs, assignment IDs, request IDs, query text, or client IP addresses as labels.

| Normalized metric | Type | Labels | Source meaning |
|---|---|---|---|
| `hmsi_supavisor_pool_clients` | Gauge | `environment`, `pool_mode` | Number of client connections held by Supavisor |
| `hmsi_supavisor_pool_database_connections` | Gauge | `environment`, `pool_mode` | Number of pooled database-side connections currently in use or held |
| `hmsi_supavisor_pool_size` | Gauge | `environment`, `pool_mode` | Configured database-side pool capacity |
| `hmsi_supavisor_checkout_queue_seconds_bucket` | Histogram | `environment`, `pool_mode`, `le` | Wait from client checkout request to pooled database connection acquisition |
| `hmsi_db_statement_timeout_total` | Counter | `environment`, `service`, `route` | PostgreSQL statement timeout outcomes returned by protected HMSI operations |
| `hmsi_db_query_total` | Counter | `environment`, `service`, `route`, `result` | Completed protected database operations for the denominator |

The existing `hmsi_mutation_gate_state` and `hmsi_mutation_gate_admission_total` metrics are reused to show whether the fail-closed control is open, paused, or unknown. A telemetry outage is itself safety-relevant: the configuration alerts when staging capacity metrics disappear and should treat production capacity as unknown until telemetry is restored.

## Files

| File | Purpose |
|---|---|
| `deploy/monitoring/supavisor-pool-alerts.yml` | Prometheus recording and alert rules |
| `deploy/grafana/hmsi-supavisor-realtime-dashboard.json` | Importable Grafana dashboard definition |

## Dashboard layout

The first row shows four decision metrics: pool utilization, p95 queue wait, p99 queue wait, and the protected-route statement-timeout ratio. The second row compares Supavisor client connections, database-side connections, and configured capacity, alongside queue latency percentile trends. The third row shows timeouts by route and the mutation gate state, including admission blocks by reason code.

| Panel | Normal state | Warning | Critical / response |
|---|---|---|---|
| Pool utilization | Below 80% | 80–89% | At or above 90% for five minutes; stop increasing load and inspect waiters |
| p95 queue wait | Below 100 ms | 100–250 ms | Above 250 ms for five minutes; inspect query latency and pool pressure |
| p99 queue wait | Below 500 ms | 500 ms–1 s | Above one second for two minutes; gate mutations if durable writes are timing out |
| Statement timeout ratio | Below 1% | 1–2% | Above 2% for five minutes; pause mutations and inspect plans/locks |
| Mutation gate | Explicit `open` only after approval | Paused with known reason | `unknown` or blocking due to database/Redis/audit uncertainty; do not reopen automatically |

The thresholds match the initial staging budgets in the HMSI pool-and-timeout guide; they must be recalibrated after a measured smoke and peak run. A full connection pool is not necessarily the root cause—CPU, memory, disk I/O, blocked sessions, and long queries can raise queue wait even when the configured capacity appears adequate.[2]

## Alert routing and fail-closed behavior

Route `HmsiSupavisorPoolSaturation` and `HmsiSupavisorCheckoutQueueLatencyHigh` to the database/application operations channel. Route pool exhaustion, p99 queue latency above one second, and statement timeouts above two percent to the primary incident channel with the mutation-gate owner. Inhibit lower-severity queue and timeout alerts when pool exhaustion is already firing, but do not inhibit a missing-metrics alert if the dashboard cannot prove capacity.

The critical alerts link to placeholder runbook URLs. Replace `runbooks.invalid` with the protected HMSI runbook host or the exact documentation links before deployment. Operators must pause the mutation gate and rate-limit ingress only when the condition affects durable idempotency, audit recording, or external mutation safety. They must not raise Supavisor pool size, change global database timeouts, or terminate sessions blindly as an alert response.

## Staging validation

First provision only the dashboard and recording rules in staging. Confirm the metric adapter emits all six normalized metrics with `environment=staging` and only the documented labels. Then run the synthetic smoke profile, followed by the peak profile. During each run, verify that panel values reflect the workload, a synthetic queue-delay test raises the queue alert, a controlled statement-timeout test raises the timeout alert, and a metric-source disablement produces the missing-metrics alert.

The validation must also confirm that no Grafana legend, alert annotation, Prometheus label, or log message contains a query, proof link, email, user ID, assignment ID, IP address, Supabase URL, pooler credential, or tenant external ID. Use synthetic data only and roll back the staging alert routes after testing if they are not part of the approved monitoring baseline.

## References

[1]: https://supabase.github.io/supavisor/monitoring/metrics/ "Supavisor Metrics"  
[2]: https://supabase.com/docs/guides/troubleshooting/monitor-supavisor-postgres-connections "Supabase: Monitor Postgres and Supavisor connections"  
[3]: https://supabase.com/docs/guides/database/connection-management "Supabase: Connection management"  
