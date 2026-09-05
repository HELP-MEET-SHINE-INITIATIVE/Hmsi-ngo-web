# HMSI Split-Brain Redis Recovery Runbook During an Active Webhook Flood

**Audience:** Security on-call, platform operations, integration owners, incident commander, and governance reviewer  
**Scope:** Datadog-to-HMSI webhook ingestion, Redis-backed idempotency, bounded Jira corrective-action synchronization, and recovery from a Redis split-brain or partition while duplicate webhook deliveries are increasing  
**Severity:** SEV-1 when more than one Redis primary may accept writes, idempotency decisions are inconsistent, or the system cannot prove that a Jira mutation is unique  
**Status:** Production runbook design; commands use placeholders where HMSI’s Redis provider, ingress controller, and deployment platform are not yet identified

> **Safety boundary:** This runbook may pause webhook mutation, inspect Redis topology, reconcile bounded Jira corrective-action records, and restore the integration. It must not publish news, restore archived content, delete HMSI records, close corrective actions automatically, flush Redis, reset a cluster broadly, or bypass HMSI approval controls.

> **Operator warning:** Do not paste real secret values into a shell, ticket, chat, screenshot, or command transcript. Every command below assumes that credentials are injected by an approved secret manager or operator profile. Replace angle-bracket placeholders only after confirming the environment and target.

## 1. Incident definition and objectives

A split-brain condition exists when independent Redis nodes or partitions can both appear writable, when Sentinel or Cluster views disagree about the current primary, or when clients are divided between different primaries after a network partition. During a webhook flood, the dangerous outcome is not merely lost cache data; it is a false idempotency decision that permits two workers to call Jira for the same deterministic event key.

Redis Sentinel uses quorum to detect failure, but a majority of Sentinels is required to authorize failover. Redis documentation also notes that asynchronous replication does not guarantee that every acknowledged write survives a failure.[1] Redis Cluster exposes node flags, link state, slots, and configuration epochs through `CLUSTER NODES`; a conflicting slot owner or incompatible epoch must be treated as an integrity incident rather than resolved by an improvised takeover.[2] The `CLUSTER FAILOVER TAKEOVER` option bypasses normal consensus and is explicitly dangerous in a minority partition; it must not be used in this runbook without an incident commander, security owner, and provider-specific recovery plan.[3]

The recovery objectives are ordered as follows:

| Objective | Required outcome |
|---|---|
| Stop additional external mutations | Webhook mutation gate is `PAUSED`; ingress is throttled or disabled if the flood continues |
| Preserve evidence | Request IDs, control IDs, topology snapshots, configuration versions, and bounded event fingerprints are retained |
| Establish one Redis authority | Only one approved primary or Sentinel-authoritative endpoint is writable for the integration |
| Prevent duplicate Jira work | No retry proceeds until completion state and external alert keys have been reconciled |
| Recover safely | Synthetic probes pass, the gate remains paused during validation, and production is reopened gradually |

## 2. Roles and communication bridge

The incident commander owns decisions and the incident timeline. The platform operator owns Redis and deployment commands. The integration owner owns the mutation gate, outbox, and Jira reconciliation. The security operator owns credential exposure assessment and HMAC rotation decisions. The governance reviewer verifies that audit and privacy controls remain intact. One person may hold more than one role only when a second independent reviewer records approval for every irreversible or high-risk action.

At incident start, open an incident record with a synthetic incident ID and state: `webhook flood + Redis authority uncertain + Jira mutation paused`. Do not include raw Datadog messages, request bodies, email addresses, worker identities, article content, or tokens.

## 3. Phase 0 — Declare and contain within five minutes

### 3.1 Record the initial facts

```bash
export INCIDENT_ID='INC-<UTC-DATE>-<SYNTHETIC-SEQUENCE>'
export ENVIRONMENT='production'
export CHANGE_REF='change/<approved-change-or-incident-ref>'
export REDIS_ENDPOINT='<approved-readonly-endpoint-or-provider-alias>'
export REDIS_PORT='6379'
export REDIS_TLS='--tls'
export REDIS_CLI_AUTH_MODE='<approved-secret-manager-profile>'
```

The variables above are identifiers and endpoint placeholders. Do not assign a password to `REDISCLI_AUTH` in shell history. Use the provider’s approved credential injection method or a short-lived operator session.

```bash
printf '%s incident=%s environment=%s state=declared reason="redis authority uncertain during webhook flood"\n' \
  "$(date -u +%FT%TZ)" "$INCIDENT_ID" "$ENVIRONMENT" | tee -a /secure/incident-log
```

The path `/secure/incident-log` is a placeholder for the approved incident evidence destination. It must be access-controlled and must not contain raw payloads.

### 3.2 Pause the HMSI mutation gate

Use the application’s approved administrative command or control-plane endpoint. The following is a provider-neutral command contract, not a command that can be executed unchanged:

```bash
hmsi-admin mutation-gate pause \
  --environment production \
  --reason "Redis authority uncertain during webhook flood" \
  --incident "$INCIDENT_ID" \
  --change "$CHANGE_REF" \
  --require-review security,platform
```

If HMSI exposes the gate through a deployment variable instead, use the platform’s reviewed configuration path:

```bash
hmsi-config set SYNC_DRY_RUN=true \
  --environment production \
  --reason "Redis split-brain containment" \
  --incident "$INCIDENT_ID" \
  --approved-by '<incident-commander>' \
  --reviewed-by '<independent-reviewer>'
```

After changing the gate, verify without sending a real webhook:

```bash
hmsi-admin mutation-gate status --environment production
curl --fail-with-body --silent --show-error \
  -H 'Authorization: Bearer <short-lived-admin-token>' \
  https://<hmsi-admin-host>/internal/mutation-gate/status \
  | jq '{environment,state,reason,changedAt,changedBy}'
```

The returned state must be `PAUSED`. If the state is missing or ambiguous, treat it as paused and keep the ingress disabled.

### 3.3 Stop or throttle the flood at ingress

If the provider supports disabling a specific webhook route, disable only the Datadog-to-HMSI route, not unrelated HMSI webhooks:

```bash
<provider-cli> webhook update <webhook-id> \
  --enabled=false \
  --reason "$INCIDENT_ID"
```

If route disablement is not available, apply a temporary rate limit or return `503` from the receiver while preserving a request ID:

```bash
hmsi-admin ingress throttle \
  --route '/api/integrations/datadog' \
  --max-rps 0 \
  --duration 15m \
  --reason "Redis split-brain containment" \
  --incident "$INCIDENT_ID"
```

Do not disable the entire public HMSI site or unrelated donation, authentication, newsroom, or portal routes. The containment target is the webhook mutation route only.

## 4. Phase 1 — Capture a read-only evidence snapshot

Capture topology from every known Redis node or provider endpoint. Use separate terminal sessions or an approved automation runner so one node’s answer is not mistaken for cluster truth. Commands below are read-only unless explicitly marked otherwise.

### 4.1 Standalone primary/replica or Sentinel deployment

```bash
redis-cli $REDIS_TLS -h "$REDIS_ENDPOINT" -p "$REDIS_PORT" INFO replication
redis-cli $REDIS_TLS -h "$REDIS_ENDPOINT" -p "$REDIS_PORT" ROLE
redis-cli $REDIS_TLS -h "$REDIS_ENDPOINT" -p "$REDIS_PORT" INFO server
redis-cli $REDIS_TLS -h "$REDIS_ENDPOINT" -p "$REDIS_PORT" INFO persistence
redis-cli $REDIS_TLS -h "$REDIS_ENDPOINT" -p "$REDIS_PORT" INFO stats
```

Record only fields needed for diagnosis. Redact client addresses, authentication material, command arguments, and any key names outside the HMSI synthetic prefix. Important fields include `role`, `master_replid`, `master_repl_offset`, `connected_slaves`/replica count, `master_link_status`, `master_last_io_seconds_ago`, `master_sync_in_progress`, `loading`, `aof_enabled`, `rdb_last_save_time`, and error counters.

For Sentinel, query each Sentinel from an independent network vantage point:

```bash
redis-cli --tls -h <sentinel-1> -p 26379 SENTINEL CKQUORUM <master-name>
redis-cli --tls -h <sentinel-1> -p 26379 SENTINEL MASTER <master-name>
redis-cli --tls -h <sentinel-1> -p 26379 SENTINEL REPLICAS <master-name>
redis-cli --tls -h <sentinel-2> -p 26379 SENTINEL MASTER <master-name>
redis-cli --tls -h <sentinel-3> -p 26379 SENTINEL MASTER <master-name>
```

Compare `ip`, `port`, `runid`, `config-epoch`, `flags`, and replica lists across Sentinels. A disagreement about the master address, epoch, or failure flags is evidence of control-plane inconsistency. Do not issue a failover command until the incident commander and provider runbook identify the authoritative quorum.

### 4.2 Redis Cluster deployment

Run topology commands against each reachable primary and at least one replica:

```bash
redis-cli --tls -h <node-a> -p 6379 CLUSTER INFO
redis-cli --tls -h <node-a> -p 6379 CLUSTER NODES
redis-cli --tls -h <node-a> -p 6379 ROLE
redis-cli --tls -h <node-a> -p 6379 INFO replication
redis-cli --tls -h <node-b> -p 6379 CLUSTER NODES
redis-cli --tls -h <node-c> -p 6379 CLUSTER NODES
```

Compare each node’s view for:

| Field | Split-brain indicator |
|---|---|
| `flags` | Two reachable nodes both report `myself,master` for the same logical shard, or conflicting `fail`/`connected` states |
| `link-state` | `disconnected` links between nodes that clients still treat as writable |
| `config-epoch` | Conflicting slot owners or a minority node claiming a newer epoch without quorum evidence |
| Slots | Same slot range claimed by competing primaries, or importing/migrating slots left unresolved |
| Replication | Replica points to a different primary than the majority view |
| `cluster_state` | `fail`, `fail?`, or inconsistent `ok` results across nodes |

`CLUSTER NODES` is for administrative inspection and debugging; clients normally use cluster-shard discovery for slot mapping.[2] Preserve the raw topology response only in a restricted incident store if required by security policy. The normal audit record should retain a scrubbed hash and selected fields.

### 4.3 Evidence manifest

```bash
mkdir -p "/secure/evidence/$INCIDENT_ID"
sha256sum /secure/evidence/$INCIDENT_ID/* 2>/dev/null | \
  awk '{print $1"  " $2}' > "/secure/evidence/$INCIDENT_ID/manifest.sha256"
```

Do not use this command to hash files containing secret values. The evidence collector should exclude environment files, shell history, credential caches, and raw webhook bodies before hashing.

## 5. Phase 2 — Confirm the webhook flood without exposing payloads

Use aggregate telemetry, not raw request content:

```bash
hmsi-admin metrics query \
  --metric 'webhook.requests_total' \
  --group-by environment,result_code,route \
  --window 15m \
  --environment production

hmsi-admin metrics query \
  --metric 'webhook.duplicate_or_retry_total' \
  --group-by environment,result_code \
  --window 15m \
  --environment production

hmsi-admin metrics query \
  --metric 'redis.idempotency_errors_total' \
  --group-by environment,error_class \
  --window 15m \
  --environment production
```

If provider access logs must be inspected, filter by route, status class, timestamp, and synthetic request ID. Do not output request bodies, authorization headers, email addresses, IP addresses, or arbitrary Datadog tags. Confirm whether the flood is provider retry behavior, an attack, a replay, or a service-side retry loop.

## 6. Phase 3 — Determine the authoritative Redis state

The incident commander must choose one authoritative source: the managed provider’s control plane, a Sentinel quorum with a majority, or a Redis Cluster view supported by a majority of primaries. A single node’s claim is insufficient.

### 6.1 Decision table

| Observation | Decision |
|---|---|
| Sentinel quorum is healthy and all Sentinels agree on one primary | Follow the provider’s standard failover/reconnect procedure; keep gate paused |
| Sentinel quorum is unavailable or Sentinels disagree | Do not force failover; engage provider escalation and maintain ingress pause |
| Redis Cluster has one consistent slot owner per range and majority connectivity | Use provider-approved recovery; verify epoch and replica alignment |
| Redis Cluster has competing slot owners or minority takeover evidence | Do not use `TAKEOVER`; isolate the minority and obtain provider/operator approval |
| Replication IDs/offsets diverge and write history cannot be established | Treat completion records as potentially incomplete; reconcile every in-flight external key before retry |
| Provider control plane confirms a single primary but clients use stale endpoints | Update service discovery/configuration, restart only the integration workers, and keep gate paused during validation |

### 6.2 Safe client endpoint verification

```bash
getent hosts <redis-service-dns>
nc -vz <redis-service-dns> 6379
redis-cli --tls -h <redis-service-dns> -p 6379 ROLE
redis-cli --tls -h <redis-service-dns> -p 6379 INFO replication | \
  grep -E '^(role|master_replid|master_repl_offset|connected_slaves|master_link_status):'
```

The `ROLE` result must agree with the provider-authoritative role. Do not reconnect workers to a node merely because it responds to `PING`.

## 7. Phase 4 — Isolate the losing or ambiguous partition

Isolation must occur through the approved provider control plane, security group, service mesh, or application endpoint configuration. Never improvise network changes on an unknown host during a live incident.

```bash
<provider-cli> redis endpoint quarantine <ambiguous-endpoint> \
  --reason "$INCIDENT_ID" \
  --require-approval '<incident-commander>,<security-owner>'

hmsi-admin integration workers pause \
  --service datadog-jira-sync \
  --environment production \
  --reason "$INCIDENT_ID"
```

If the provider exposes a documented, safe read-only mode for a former primary, use it only after confirming that it cannot serve writes to the integration. For Redis Cluster, the `READONLY` client command affects a client’s behavior and is not a substitute for server-side isolation. Do not assume that `READONLY` makes a split-brain node safe for idempotency decisions.

### Commands explicitly prohibited during this phase

```text
FLUSHALL
FLUSHDB
CLUSTER RESET HARD
CLUSTER FAILOVER TAKEOVER
DEL with a wildcard or broad key pattern
UNLINK with a wildcard or broad key pattern
CONFIG SET without an approved provider procedure
```

Broad deletion can destroy the only remaining duplicate-control evidence. A forced takeover can create a new write history in a minority partition. Configuration changes made without provider coordination can make later reconciliation impossible.

## 8. Phase 5 — Recover one authoritative Redis service

Follow the provider’s documented restoration or failover process. The application operator must not manually promote a node unless the provider procedure explicitly requires it and the incident commander records approval.

For Redis Cluster, a standard manual failover may be sent to a replica only when the replica is known by the majority and the provider confirms that consensus is available:

```bash
redis-cli --tls -h <approved-replica> -p 6379 CLUSTER FAILOVER
```

An `OK` response only means the request was accepted; verify completion with `ROLE`, `INFO REPLICATION`, and `CLUSTER NODES` after the provider-defined wait period.[3] If the primary is unreachable and the provider explicitly authorizes `FORCE`, record the approval and run it only on the selected replica:

```bash
redis-cli --tls -h <approved-replica> -p 6379 CLUSTER FAILOVER FORCE
```

Do not use `TAKEOVER` in this incident flow. If consensus is unavailable, keep the gate paused and escalate to the provider rather than manufacturing authority in a minority partition.

For Sentinel, do not manually edit `sentinel.conf` on one node as a shortcut. Confirm the Sentinel majority, current master, failover state, and provider-approved promotion first. Then restart or reconnect only the integration workers using the authoritative service-discovery endpoint.

After recovery, verify:

```bash
redis-cli --tls -h <authoritative-endpoint> -p 6379 ROLE
redis-cli --tls -h <authoritative-endpoint> -p 6379 INFO replication | \
  grep -E '^(role|master_replid|master_replid2|master_repl_offset|connected_slaves|master_link_status):'
redis-cli --tls -h <authoritative-endpoint> -p 6379 INFO persistence | \
  grep -E '^(aof_enabled|aof_last_bgrewrite_status|rdb_last_save_time|loading):'
```

The result must show one authoritative role, healthy replication as applicable, no ongoing loading or resynchronization that invalidates the probe window, and a stable endpoint identity.

## 9. Phase 6 — Reconcile idempotency and Jira outcomes

Do not reopen the mutation gate merely because Redis is reachable. First establish the set of events that may have been accepted during the partition. Use only deterministic event fingerprints and external alert keys.

```bash
hmsi-admin outbox list \
  --service datadog-jira-sync \
  --environment production \
  --state accepted,in_progress,unknown,retryable \
  --since '<incident-start-utc>' \
  --until '<incident-end-utc>' \
  --fields event_fingerprint,state,external_alert_key,audit_ref,attempt_count
```

For each `unknown` or `in_progress` event, search Jira by the deterministic external alert key. Do not search by free-form title alone, because titles may collide and can contain sensitive text.

```bash
hmsi-admin jira reconcile \
  --project '<approved-project-key>' \
  --external-key '<synthetic-or-redacted-key-reference>' \
  --incident "$INCIDENT_ID" \
  --mode inspect-only
```

If the Jira record exists, mark the idempotency event as reconciled and store the existing issue reference. Do not issue another mutation. If no Jira record exists, a reviewer may authorize exactly one bounded retry using the same external key:

```bash
hmsi-admin outbox retry-one \
  --event-ref '<approved-event-reference>' \
  --same-external-key \
  --require-approval '<integration-owner>,<security-owner>' \
  --incident "$INCIDENT_ID"
```

If the completion record is absent but the external record exists, prefer reconciliation over rebuilding Redis state from assumptions. If both Redis and Jira evidence are incomplete, remain paused and escalate; do not infer that no mutation occurred.

### Synthetic duplicate probe

Run only against a synthetic namespace and an approved Jira test project or dry-run adapter:

```bash
hmsi-admin verification probe idempotency \
  --environment production \
  --mode canary \
  --namespace "hmsi:verification:$INCIDENT_ID" \
  --synthetic-event "synthetic-$INCIDENT_ID" \
  --dry-run-jira
```

The expected result is one lock acquisition, one bounded completion record, a duplicate no-op on replay, conditional lock release, and no public HMSI side effect.

## 10. Phase 7 — Reopen gradually

The mutation gate stays paused until all of the following are true:

| Reopening condition | Evidence required |
|---|---|
| One Redis authority is proven | Provider status plus consistent `ROLE`/`CLUSTER NODES` or Sentinel views |
| Split-brain partition is isolated | Provider/network change reference and endpoint verification |
| Completion state is available or reconciled | Outbox review and deterministic Jira reconciliation report |
| Synthetic HMAC and schema probes pass | Probe IDs and scrubbed logs |
| Synthetic duplicate probe passes | One-mutation/no-second-mutation evidence |
| Audit ledger is writable | Append-only test and evidence reference |
| Alerting is functional | Test alert received by platform/security owner |
| Rollback is ready | Previous application/configuration version and owner recorded |

Re-enable one low-risk monitor or provider route first:

```bash
<provider-cli> webhook update <webhook-id> \
  --enabled=true \
  --scope '<single-low-risk-monitor>' \
  --reason "post-recovery canary" \
  --incident "$INCIDENT_ID"
```

Then observe authentication failures, Redis idempotency errors, duplicate rates, outbox age, Jira results, and audit writes for the agreed observation window. Expand in small groups only after the canary remains stable.

```bash
hmsi-admin mutation-gate open \
  --environment production \
  --reason "Redis authority restored and reconciliation complete" \
  --incident "$INCIDENT_ID" \
  --approved-by '<incident-commander>' \
  --reviewed-by '<independent-reviewer>'
```

If any control becomes unknown again, immediately pause the gate and return to reconciliation. Never keep the gate open solely because request latency or queue age is increasing.

## 11. Completion, evidence, and after-action review

Close the technical incident only after the flood has subsided, the integration has operated through a monitored observation window, all unknown outcomes are reconciled, and no duplicate Jira mutations were identified. The after-action report should include timeline, topology divergence, provider actions, gate transitions, flood metrics, event counts, Jira reconciliation outcomes, credential exposure assessment, evidence references, and corrective actions.

The final evidence package should contain only bounded records:

| Evidence | Include | Exclude |
|---|---|---|
| Topology snapshot | Node IDs or provider resource IDs, role flags, link state, epochs, timestamps | Passwords, client addresses unless required for security investigation, arbitrary commands with secrets |
| Webhook flood metrics | Counts by route, status, result, and time window | Request bodies, auth headers, personal identifiers |
| Reconciliation report | Event fingerprints, audit refs, Jira issue keys, outcome categories | Full Datadog payloads, article content, contributor details |
| Gate history | State, reason, approver, reviewer, timestamp | Session tokens and secret values |
| Recovery validation | Probe IDs, result codes, configuration fingerprints | Raw provider responses containing sensitive metadata |

## 12. References

[1]: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/ "Redis, High availability with Redis Sentinel"  
[2]: https://redis.io/docs/latest/commands/cluster-nodes/ "Redis, CLUSTER NODES command"  
[3]: https://redis.io/docs/latest/commands/cluster-failover/ "Redis, CLUSTER FAILOVER command"  
[4]: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ "Redis, Replication documentation"  
[5]: https://redis.io/docs/latest/commands/role/ "Redis, ROLE command"  
[6]: https://redis.io/docs/latest/commands/info/ "Redis, INFO command"  
