# HMSI Supabase Connection Pooling and Statement Timeout Configuration

## Purpose and boundary

This guide maps the HMSI volunteer assignment load profiles to Supabase connection pooling and PostgreSQL timeout controls. It is a configuration guide, not a promise that a specific Supabase compute tier can sustain a given concurrency level. Final limits must be calibrated against the project’s actual database maximum connections, Supavisor pool size, region, query plans, autoscaling behavior, and other Supabase services.

Do not apply these changes to production during a load test. Use a disposable staging project, a separate pooler connection, namespaced fixtures, disabled or sink-routed notifications, and a recorded rollback owner.

Supabase recommends using the Data API for frontend traffic, pooler transaction mode for temporary/serverless application clients, and session mode for persistent clients on IPv4-only networks.[1] Supabase also cautions that pool sizing should generally remain below 40% of Database Max Connections when the project heavily uses PostgREST, or up to approximately 80% when PostgREST demand is not dominant; these are starting generalizations, not universal targets.[2]

## Choose the connection path

| HMSI workload | Recommended path | Reason | Important constraint |
|---|---|---|---|
| Browser portal and ordinary API reads | Supabase Data API with RLS | The browser does not hold database credentials | Measure PostgREST/`authenticator` usage separately from backend connections |
| Next.js serverless or short-lived workers | Supavisor transaction mode, port `6543` | Many transient clients share database connections | Disable prepared statements in the driver; session settings do not persist per client transaction |
| Persistent backend process with long-lived sessions | Supavisor session mode, port `5432`, or direct connection where appropriate | Session semantics are preserved | Avoid opening one pool per request or per serverless invocation |
| Migrations, `pg_dump`, and administrative single sessions | Direct connection, normally port `5432` | Native administrative operations and session-level settings | Use only from an approved network with SSL and a short-lived credential |

The current HMSI source primarily uses the Supabase JavaScript client and server-side admin client. That path should not be changed to a direct Postgres pool merely to raise concurrency. If a direct Node `pg` pool is introduced for a specific worker, keep it separate from browser/API traffic and account for every replica.

## Supabase Dashboard settings

In the Supabase Dashboard, open **Project Settings → Database → Connection pooling** and record the current **Database Max Connections**, **Pool Size**, and **Max Client Connections** before changing them. Supabase documents that Supavisor and PgBouncer share the pool-size setting, and the total pooler usage must remain within the project’s available connection budget.[1] [2]

Use this staged tuning sequence:

| Step | Starting action | Gate to continue |
|---|---|---|
| Baseline | Record current max connections, pool size, PostgREST usage, Auth/Storage usage, and p95 query latency | No unexplained connection leak or long `idle in transaction` session |
| Smoke | Leave the configured pool unchanged; run 10 synthetic clients | No RLS leakage; p95 API latency under the smoke budget |
| Peak | Increase pool size in small increments only if pool wait is the bottleneck | Pool wait falls without starving Auth, Storage, or PostgREST |
| Burst | Prefer admission control and bounded queueing over an oversized pool | No database saturation; fail-closed mutations when dependencies are uncertain |
| Soak | Hold the selected pool size for the full soak run | No growth in idle sessions, pool wait, or timeout rate |

Do not blindly set the pool to the test concurrency. Pool size is the number of database-side connections, not the number of simultaneous HTTP clients. A pool of 20 can serve many short queries, while 20 long-running or blocked transactions can exhaust it.

## Application-side pool settings

If HMSI adds a persistent Node `pg` client for a worker, use a small per-instance pool and calculate the aggregate ceiling:

```ts
// Example only; install and review `pg` before using this path.
import pg from 'pg';

const maxInstances = Number(process.env.HMSI_MAX_INSTANCES ?? 4);
const poolMax = Number(process.env.HMSI_DB_POOL_MAX ?? 4);
const databaseUrl = process.env.SUPABASE_POOLER_TRANSACTION_URL;

if (!databaseUrl) throw new Error('SUPABASE_POOLER_TRANSACTION_URL is required');
if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
  throw new Error('Only a PostgreSQL pooler URL is accepted');
}

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: poolMax,
  min: 0,
  idleTimeoutMillis: Number(process.env.HMSI_DB_IDLE_TIMEOUT_MS ?? 10_000),
  connectionTimeoutMillis: Number(process.env.HMSI_DB_CONNECTION_TIMEOUT_MS ?? 1_000),
  maxLifetimeSeconds: Number(process.env.HMSI_DB_MAX_LIFETIME_SECONDS ?? 300),
  // Do not use the service key or any credential in application logs.
  application_name: 'hmsi-volunteer-staging',
  ssl: { rejectUnauthorized: true },
});

export const aggregatePoolCeiling = maxInstances * poolMax;
```

For transaction pooling, disable prepared statements in the chosen driver. With `pg`, the example does not assign statement names, so queries are sent without named prepared statements. Confirm the driver’s behavior before deployment. Supabase specifically notes that transaction mode does not support prepared statements.[1]

Use this starting staging contract:

```dotenv
HMSI_MAX_INSTANCES=4
HMSI_DB_POOL_MAX=4
HMSI_DB_IDLE_TIMEOUT_MS=10000
HMSI_DB_CONNECTION_TIMEOUT_MS=1000
HMSI_DB_MAX_LIFETIME_SECONDS=300
HMSI_DB_QUERY_TIMEOUT_MS=2500
HMSI_DB_LOCK_TIMEOUT_MS=500
HMSI_DB_IDLE_IN_TRANSACTION_TIMEOUT_MS=5000
HMSI_MUTATION_GATE_INITIAL_STATE=paused
HMSI_MUTATION_GATE_FAIL_CLOSED=true
HMSI_SYNC_DRY_RUN=true
HMSI_JIRA_MUTATION_ENABLED=false
```

The aggregate application-side ceiling in this example is 16 client connections. It is not a recommendation for every Supabase plan; compare it with the project’s pool size and reserve capacity for Supabase services.

## Statement, lock, and idle-transaction timeouts

Supabase documents four timeout scopes: session, function, global, and role. Session-level settings work with direct connections or Supavisor session mode, but not with the Supabase Client API or transaction mode. Role-level settings affect API calls and require a PostgREST configuration reload.[3]

For the HMSI portal workload, prefer function-level or role-level controls for Data API operations and per-query timeout options for a direct backend worker. Avoid changing the global database timeout until the impact on migrations, Auth, Storage, Realtime, and administrative work has been reviewed.

### Role-level API timeout

If the workload uses the authenticated Data API and the database owner approves the change, apply an additive role-level setting in staging:

```sql
alter role authenticated set statement_timeout = '2500ms';
select pg_reload_conf();
notify pgrst, 'reload config';

select rolname, rolconfig
from pg_roles
where rolname in ('anon', 'authenticated', 'service_role');
```

Supabase’s documented default for `authenticated` is 8 seconds; verify the current project value rather than assuming it.[3] A 2.5-second starting budget is appropriate only for short assignment-feed and state-transition queries after query plans have been checked. Do not use this setting for long administrative jobs.

### Function-level timeout for an RPC

For a transactional proof-submission or assignment-transition RPC, constrain the function rather than changing the whole database:

```sql
create or replace function public.submit_volunteer_proof(
  p_assignment_id uuid,
  p_drive_url text,
  p_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
set statement_timeout = '2500ms'
as $$
begin
  -- Implement ownership, URL allowlisting, conditional status transition,
  -- proof insert, and audit insert in one reviewed transaction.
  -- The body is intentionally omitted until deployed columns are reconciled.
  raise exception 'REFERENCE_ONLY_NOT_DEPLOYABLE';
end;
$$;
```

The function body must not accept a service-role bypass as proof of volunteer ownership. The caller’s `auth.uid()` and RLS policies must remain part of the authorization decision.

### Direct backend session settings

For a persistent staging worker using direct or session-mode access, set conservative settings after the connection is acquired and before the transaction begins:

```sql
set statement_timeout = '2500ms';
set lock_timeout = '500ms';
set idle_in_transaction_session_timeout = '5000ms';
show statement_timeout;
show lock_timeout;
show idle_in_transaction_session_timeout;
```

PostgreSQL defines `statement_timeout` as the maximum duration of a statement, `lock_timeout` as the maximum time waiting for a lock, and `idle_in_transaction_session_timeout` as protection against sessions left idle inside a transaction.[4] Set the lock timeout lower than the statement timeout so blocked assignment mutations fail quickly and the mutation gate can remain closed rather than allowing a queue of stuck sessions.

## Profile mapping

| HMSI profile | Pooling approach | Query timeout | Lock timeout | Fail-closed rule |
|---|---|---:|---:|---|
| Smoke: 10 clients | Existing Supavisor/Data API path | 2.5 s | 0.5 s | Any RLS/auth error fails the run |
| Peak: 100 clients | Transaction pooler or Data API; small per-instance app pool | 2.5 s | 0.5 s | Pool wait or Redis uncertainty blocks mutations |
| Burst: 250 clients | Admission control plus transaction pooler; do not simply enlarge DB pool | 2.0 s | 0.3 s | `429`/`503` allowed; zero duplicate external mutations |
| Soak: 50 clients for 60 min | Stable pool size and bounded connection lifetime | 2.5 s | 0.5 s | No connection leak, timeout drift, or RLS leakage |

These are initial test budgets. A timeout is not a performance target by itself; confirm that the query is indexed, the RLS predicate is selective, and the failure response is safe and observable.

## Verification SQL

Run read-only checks before and after each test stage. The following queries are bounded and exclude query text and personal identifiers from the reported result:

```sql
select
  state,
  wait_event_type,
  wait_event,
  count(*) as sessions
from pg_stat_activity
where application_name = 'hmsi-volunteer-staging'
group by state, wait_event_type, wait_event
order by sessions desc;

select
  count(*) filter (where state = 'active') as active_sessions,
  count(*) filter (where state = 'idle') as idle_sessions,
  count(*) filter (where state like 'idle in transaction%') as idle_in_transaction_sessions
from pg_stat_activity
where application_name = 'hmsi-volunteer-staging';

select rolname, rolconfig
from pg_roles
where rolname in ('anon', 'authenticated', 'service_role');

show statement_timeout;
show lock_timeout;
show idle_in_transaction_session_timeout;
```

Supabase recommends `pg_stat_activity` for observing live connections and diagnosing blocked or idle-in-transaction sessions.[2] Do not export `query`, `client_addr`, email addresses, assignment IDs, proof links, Redis keys, or access tokens into load-test artifacts.

## Prometheus/Grafana signals

At minimum, graph application-side pool size, in-use connections, idle connections, waiters, acquisition wait p95/p99, query p95/p99, timeout counts, lock-timeout counts, `401/403/409/429/5xx` counts, RLS leakage count, duplicate mutation count, audit mismatch count, and Redis idempotency availability. Use fixed labels only: `environment`, `route`, `operation`, `result`, and `status_class`.

Starting alert suggestions for staging are:

| Alert | Starting threshold | Action |
|---|---|---|
| Pool saturation | In-use ≥ 90% for 5 min | Stop load increase; inspect waiters and long transactions |
| Pool wait | p95 > 250 ms for 5 min | Reduce concurrency or increase pool cautiously after capacity review |
| Statement timeout | > 2% of assignment operations for 5 min | Pause mutation gate and inspect query plans/locks |
| Lock timeout | Any sustained increase | Pause mutation gate; identify blocker; do not terminate sessions blindly |
| RLS leakage | Any nonzero result | Immediate stop; revoke test access and investigate |
| Duplicate mutation | Any nonzero result | Immediate stop; keep gate paused and reconcile external keys |
| Idle transaction | Any session > 5 s | Stop test progression and clean up the owning worker |

## Rollback

Record the original Supabase pool size, role settings, application pool values, and test namespace before changing anything. Restore role-level settings with the exact pre-test values, reload PostgREST if required, and return the application to the last known-good pool configuration. Do not use `pg_terminate_backend` as a routine cleanup command; cancel or terminate only an identified disposable test session under the incident runbook.

After rollback, rerun a small smoke test and confirm that the mutation gate is paused or explicitly reopened according to the fail-closed runbook. Do not interpret an empty volunteer feed as proof of RLS correctness without a positive/negative identity test.

## References

[1]: https://supabase.com/docs/guides/database/connecting-to-postgres "Supabase: Connect to Postgres"  
[2]: https://supabase.com/docs/guides/database/connection-management "Supabase: Connection management"  
[3]: https://supabase.com/docs/guides/database/postgres/timeouts "Supabase: Timeouts"  
[4]: https://www.postgresql.org/docs/current/runtime-config-client.html "PostgreSQL: Client Connection Defaults"  
