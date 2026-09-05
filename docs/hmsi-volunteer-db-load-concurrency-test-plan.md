# HMSI Volunteer Assignment Database Load and Concurrency Test Plan

## Scope

This plan evaluates the volunteer task feed and assignment mutation paths under peak synthetic traffic. It focuses on connection-pool saturation, RLS ownership filtering, assignment contention, idempotency, latency percentiles, error rates, and audit integrity. The included executable suite uses an in-memory synthetic adapter so it can run without credentials or database access. It is a behavioral gate, not a substitute for a measured disposable Supabase/PostgreSQL run.

The test must never target production. A real database run requires a disposable staging project, namespaced test records, a time-limited test identity, a separate database pool, and teardown limited to records created by the run.

## Executable suite

```bash
node --test tests/volunteer-db-load-concurrency.test.mjs
```

The current suite validates five invariants:

| Test | Invariant |
|---|---|
| Pool saturation | The number of concurrent connections never exceeds configured pool capacity and p95 wait remains below the synthetic budget |
| RLS ownership | Each volunteer sees only their own active, non-deleted assignments |
| Concurrent mutation | Duplicate concurrent actions produce one mutation and one audit event |
| Negative authorization | Cross-role and cross-owner mutations return `403` without an audit bypass |
| Telemetry privacy | Latency metrics contain bounded labels and no volunteer ID or email label |

## Workload model

Use these profiles for a disposable staging run after the synthetic suite passes. Thresholds are starting budgets and must be calibrated against the selected Supabase plan, region, query indexes, and baseline.

| Profile | Concurrent clients | Read/write mix | Duration | Starting pass criteria |
|---|---:|---:|---:|---|
| Smoke | 10 | 90% feed reads, 10% state changes | 60 seconds | No authorization leakage; p95 API < 500 ms; error rate < 1% |
| Peak | 100 | 85% feed reads, 10% state changes, 5% proof metadata writes | 10 minutes | Pool wait p95 < 250 ms; RLS query p95 < 300 ms; error rate < 2% |
| Burst | 250 | 80% feed reads, 15% state changes, 5% proof writes | 2 minutes | No pool exhaustion; no duplicate mutation; fail-closed on timeout |
| Soak | 50 | 90% feed reads, 8% state changes, 2% proof writes | 60 minutes | No progressive pool leak; p99 remains within 2x smoke baseline; no unbounded audit growth |

The workload should use a fixed set of synthetic volunteer identities, such as `load-volunteer-001` through `load-volunteer-050`, and a separate synthetic administrator identity. Do not generate real names, emails, phone numbers, Drive URLs, donor records, or production article references.

## Measurements

Collect these values per route and operation:

| Measurement | Meaning |
|---|---|
| Request throughput | Completed requests per second by bounded route and result |
| Pool utilization | In-use, idle, waiting, and maximum pool connections |
| Pool wait time | Time between request needing a connection and receiving one |
| Database query time | Time spent executing the RLS-protected query or mutation |
| API latency | End-to-end handler duration excluding client think time |
| Error rate | `401`, `403`, `409`, `429`, `5xx`, timeout, and network errors separately |
| RLS leakage count | Any row returned to a volunteer whose owner does not match the session |
| Duplicate mutation count | More than one successful mutation for the same idempotency key |
| Audit mismatch count | State change without exactly one corresponding bounded audit event |
| Pool leak count | Connections not returned after request completion or cancellation |

Metrics must use fixed labels such as `environment`, `route`, `operation`, `result`, `status_class`, and `pool_name`. Never label by volunteer ID, email, request ID, assignment ID, proof URL, Redis key, or external event key.

## Required database queries for staging measurement

For the real staging adapter, measure the actual connection pool from the application runtime and use bounded PostgreSQL catalog checks. Do not expose volunteer rows in diagnostic output. The following checks are illustrative and should be run through the approved database tooling:

```sql
select state, count(*)
from pg_stat_activity
where application_name = 'hmsi-volunteer-load'
group by state;

select wait_event_type, wait_event, count(*)
from pg_stat_activity
where application_name = 'hmsi-volunteer-load'
  and state <> 'idle'
group by wait_event_type, wait_event;
```

RLS behavior should be validated through authenticated disposable sessions, not by using the service-role key for the assertion. The service-role key may be used only by the server-side test harness when the test explicitly verifies application-layer checks; it must never be sent to a browser or load generator.

## Concurrency scenarios

### Feed-read fan-out

Run many simultaneous `GET /api/portal/tasks` calls across the fixed synthetic identities. Assert that each response contains only that identity’s assignments, deleted rows are absent, and a volunteer never receives another volunteer’s proof metadata.

### Duplicate lifecycle action

Send concurrent `PATCH /api/portal/tasks` requests with the same assignment, expected current status, and idempotency key. Assert that one state change occurs, stale or duplicate requests return a safe `409` or idempotent `200`, and exactly one audit event is written.

### Proof submission race

Send two concurrent proof submissions for the same assignment. Assert that the server either accepts one and rejects the other under a conditional state guard or treats the second as a safe idempotent retry. Never allow two active proof records to cause two completion transitions without explicit revision semantics.

### Administrator assignment burst

Send concurrent assignment creation requests for multiple eligible synthetic volunteers, including repeated idempotency keys. Assert that pending, inactive, deleted, and wrong-role volunteers are rejected; eligible assignments are unique; notifications are queued once; and audit events have no raw payload or proof link.

### Pool exhaustion and cancellation

Artificially delay a synthetic database operation until the pool reaches capacity, then cancel requests. Assert that waiting requests fail with a bounded retryable response, the mutation gate remains closed when durable idempotency is unavailable, and every acquired connection is returned.

## RLS assertions

The real staging run must prove the following matrix:

| Caller | Target data | Expected result |
|---|---|---|
| Approved volunteer A | A’s active assignment | Read allowed |
| Approved volunteer A | B’s assignment | Empty result or `403`; never data |
| Approved volunteer A | Deleted assignment | Not visible |
| Worker or member | Volunteer assignment endpoint | `403` |
| Anonymous caller | Any protected endpoint | `401` |
| Administrator | Eligible assignment register | Allowed with admin session and audit |
| Administrator | Private proof link | Allowed only through protected review route |
| Volunteer | Another volunteer’s proof | Empty result or `403`; never data |

RLS and server-side authorization must both be tested. Passing an application-layer check with the service client does not prove that direct authenticated database access is correctly isolated.

## Chaos and fail-closed checks

During the Burst profile, make the disposable Redis idempotency adapter unavailable or inject command timeouts. The expected behavior is zero Jira or other external mutations while idempotency is uncertain, a bounded retryable response, a gate state of `paused` or `unknown`, and an alert or audit record with only a safe reason code. Do not delete keys or flush the database to reset a test.

During a database connection-pool exhaustion event, feed reads may degrade with bounded errors, but assignment mutation must not report success unless the assignment row, idempotency record, audit event, and notification outbox state are durably recorded according to the transaction contract.

## Execution controls

Before a staging run, confirm the target hostname is a disposable environment, the database contains only namespaced fixtures, the load generator has no production credentials, the Jira project is isolated, and notification delivery is disabled or routed to a test sink. Set `SYNTHETIC_ONLY=true` and record the test run ID in the evidence ledger.

Stop the test immediately if a response contains another user’s row, a raw proof link appears in logs, a production hostname is detected, the pool exceeds its configured maximum, a duplicate external mutation occurs, or an audit write is missing. Preserve bounded evidence and do not rerun by blindly replaying the same external keys.

## References

[1]: https://www.postgresql.org/docs/current/monitoring-stats.html "PostgreSQL monitoring statistics"  
[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"  
[3]: https://nodejs.org/api/test.html "Node.js test runner"  
