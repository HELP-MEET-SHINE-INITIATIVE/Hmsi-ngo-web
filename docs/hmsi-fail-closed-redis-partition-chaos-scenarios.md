# HMSI Fail-Closed Mutation Gate: Redis Partition Chaos Scenarios

**Scope:** Synthetic staging or isolated test environment only.  
**Purpose:** Prove that Redis partitions, split-brain symptoms, stale topology, lock uncertainty, and recovery transitions cannot cause duplicate Jira mutations.  
**Safety boundary:** Do not run these experiments against production Redis, real Datadog monitors, real webhook payloads, or live HMSI content and user records.

## 1. Test contract

The system under test is the Datadog-to-HMSI webhook path: HTTPS ingress, HMAC authentication, schema validation, mutation gate, Redis idempotency, durable outbox, Jira adapter, and append-only audit ledger. All event IDs, alert cycle keys, monitor IDs, Jira records, Redis namespaces, and credentials must be synthetic and isolated.

A chaos experiment passes only when the mutation gate behaves conservatively and the final external mutation count is correct. Redis availability alone is not enough to reopen the gate; the system must also prove one authoritative Redis view, reconcile uncertain outcomes, pass synthetic HMAC and duplicate probes, and demonstrate audit writes.

## 2. Experiment safety controls

| Control | Requirement |
|---|---|
| Environment | Dedicated staging or disposable integration environment; never production |
| Data | Synthetic webhook bodies and synthetic Jira project/issue records only |
| Namespace | Unique Redis prefix such as `hmsi:chaos:<experiment-id>:` with automatic expiry |
| Blast radius | One integration worker group and one test webhook route |
| Gate | Mutation gate must start `OPEN` only inside the isolated test boundary and must default to `PAUSED` on harness failure |
| Stop condition | Any unexpected Jira mutation, raw payload leak, non-synthetic destination, or inability to restore network isolation stops the experiment |
| Approvals | Platform owner and security reviewer approve the experiment; incident commander owns live abort decisions |
| Evidence | Store metrics, result codes, topology fingerprints, and bounded audit references; exclude secrets and raw payloads |

Before every experiment, verify the harness can stop the worker, disable the test webhook route, and delete only the experiment namespace after evidence capture. Never use `FLUSHALL`, `FLUSHDB`, broad `DEL`, `CLUSTER RESET HARD`, or unapproved `CLUSTER FAILOVER TAKEOVER`.

## 3. Required test harness interfaces

The integration should expose test-only interfaces behind an isolated environment flag:

```ts
export interface ChaosHarness {
  gate: {
    status(): Promise<"OPEN" | "PAUSED">>;
    pause(reason: string): Promise<void>;
    open(reason: string): Promise<void>;
  };
  redis: {
    partition(target: "primary" | "replica" | "sentinel-quorum"): Promise<void>;
    heal(): Promise<void>;
    status(): Promise<{ reachable: boolean; authority: string; fingerprint: string }>;
  };
  webhook: {
    enable(): Promise<void>;
    disable(): Promise<void>;
    deliver(event: SyntheticEvent): Promise<ResponseSummary>;
  };
  jira: {
    countByExternalKey(key: string): Promise<number>;
    listSyntheticByExperiment(experimentId: string): Promise<ExternalRecord[]>;
  };
  evidence: {
    snapshot(experimentId: string): Promise<void>;
    assertNoSensitiveData(experimentId: string): Promise<void>;
  };
}
```

The production path should not expose arbitrary partition or gate controls. The harness should call a provider-specific chaos platform or isolated test network, and it should require an explicit experiment token that cannot be used by ordinary application identities.

## 4. Automated integration tests

The reference test file `integrations/fail-closed-mutation-gate.test.mjs` uses Node’s built-in test runner, a synthetic Jira adapter, a partition-aware gate, and the existing Datadog-to-Jira handler. It proves the application-layer contract without connecting to live Redis or Jira.

The core assertions are:

| Test | Expected assertion |
|---|---|
| Redis unavailable before processing | `503`, gate becomes `PAUSED`, Jira call count remains zero |
| Redis returns but gate remains paused | Still `503`; no mutation until explicit approved reopen |
| Duplicate after recovery | Two deliveries produce one Jira mutation and one duplicate no-op |
| Concurrent lock contention | One success and one safe retry/failure; exactly one Jira mutation |
| Jira timeout | No completion marker is assumed; explicit reconciliation is required before retry |
| Invalid HMAC or monitor | `401`/`422`; no Jira mutation; raw body and sensitive-looking fields absent from audit records |

Run the reference tests from the repository root:

```bash
node --test integrations/fail-closed-mutation-gate.test.mjs
```

If the project’s test runner is Vitest or Jest, retain the same assertions and fixture boundaries. The important invariant is not the runner; it is that a Redis uncertainty path cannot reach the Jira adapter.

## 5. Chaos scenario matrix

### CH-01 — Primary-to-replica network partition

**Hypothesis:** If the integration cannot establish a durable idempotency decision, the mutation gate pauses and no Jira request is made.

**Fault:** Isolate the test primary from the replica or from the integration subnet while maintaining enough connectivity to observe the provider’s state. Do not sever the operator’s recovery channel.

**Execution:**

```bash
export EXPERIMENT_ID="redis-partition-primary-<synthetic-sequence>"
hmsi-chaos start --experiment "$EXPERIMENT_ID" --target staging-redis --fault network-partition --scope integration-test
hmsi-admin mutation-gate status --environment staging
hmsi-admin verification deliver-synthetic --experiment "$EXPERIMENT_ID" --count 20 --concurrency 5
hmsi-admin metrics query --metric webhook.jira_mutations_total --experiment "$EXPERIMENT_ID"
```

**Pass criteria:** The gate is `PAUSED` or every request receives a safe retry response; Jira mutation count is zero while the idempotency decision is unavailable; audit records contain only bounded result codes; no raw bodies are logged.

**Rollback:**

```bash
hmsi-chaos heal --experiment "$EXPERIMENT_ID"
hmsi-admin mutation-gate status --environment staging
```

Do not open the gate yet. Continue with topology validation and reconciliation.

### CH-02 — Sentinel disagreement or quorum loss

**Hypothesis:** A minority Sentinel view cannot authorize a safe mutation path.

**Fault:** In the isolated test network, block communication between one Sentinel and the other two, or partition the Sentinel quorum from the application while leaving the Redis data plane reachable.

**Investigation:**

```bash
for s in <sentinel-a> <sentinel-b> <sentinel-c>; do
  redis-cli --tls -h "$s" -p 26379 SENTINEL CKQUORUM <master-name>
  redis-cli --tls -h "$s" -p 26379 SENTINEL MASTER <master-name>
done
```

**Pass criteria:** The application does not choose the minority Sentinel’s master as authoritative, the mutation gate remains paused when authority is ambiguous, and no manual takeover is attempted.

**Recovery:** Heal the network, confirm quorum from independent views, compare master address and config epoch, and run a synthetic idempotency probe while the gate remains paused.

### CH-03 — Redis Cluster conflicting topology views

**Hypothesis:** Conflicting slot owners or epochs prevent mutation until one authoritative topology is proven.

**Fault:** Partition Cluster nodes in the isolated test environment so one node has a stale or minority topology view.

**Investigation:**

```bash
for n in <cluster-node-a> <cluster-node-b> <cluster-node-c>; do
  echo "--- $n ---"
  redis-cli --tls -h "$n" -p 6379 CLUSTER INFO
  redis-cli --tls -h "$n" -p 6379 CLUSTER NODES
  redis-cli --tls -h "$n" -p 6379 ROLE
 done
```

**Pass criteria:** Conflicting slot ownership, `fail`, `fail?`, disconnected links, or unclear epochs keep the gate paused. The application does not issue `CLUSTER FAILOVER TAKEOVER` and does not treat `PING` success as proof of authority.

**Recovery:** Use the provider-approved failover path only after majority/authority is restored, then verify `ROLE`, `INFO REPLICATION`, and `CLUSTER NODES` consistency from multiple nodes.

### CH-04 — Lock acquired before partition, completion write lost

**Hypothesis:** A worker that may have called Jira but cannot write the completion record produces an unknown outcome that requires reconciliation.

**Fault:** Inject a failure between the Jira response and the Redis completion write. This must be implemented as a test adapter fault, not by deleting production keys.

**Execution:**

```bash
hmsi-chaos inject --experiment "$EXPERIMENT_ID" --point after-jira-before-completion --once
hmsi-admin verification deliver-synthetic --experiment "$EXPERIMENT_ID" --count 1
hmsi-admin outbox list --experiment "$EXPERIMENT_ID" --state unknown,in_progress
```

**Pass criteria:** The system records an unknown outcome, does not mark the event completed, pages the owner with a fingerprint only, and requires an inspect-only Jira search before a retry.

**Recovery:** Search the synthetic Jira project by deterministic external key. If found, record reconciliation and do not retry. If absent, require two-person authorization for one bounded retry with the same key.

### CH-05 — Webhook flood during Redis outage

**Hypothesis:** Flood volume increases queueing and retries but cannot turn Redis uncertainty into Jira mutation.

**Fault:** Generate synthetic deliveries at a bounded rate while Redis is unreachable or the gate is paused.

**Execution:**

```bash
hmsi-chaos redis partition --experiment "$EXPERIMENT_ID" --target integration
hmsi-chaos webhook flood --experiment "$EXPERIMENT_ID" --rate 25rps --duration 60s --synthetic
hmsi-admin metrics query --metric webhook.requests_total --experiment "$EXPERIMENT_ID"
hmsi-admin metrics query --metric webhook.jira_mutations_total --experiment "$EXPERIMENT_ID"
```

**Pass criteria:** Jira mutation count is zero during the outage; responses are bounded `503` or equivalent; alerting fires; logs show no raw event bodies; queue and retry state remain bounded.

**Abort:** Stop the synthetic flood if memory, CPU, outbox, or log volume exceeds the test budget.

### CH-06 — Heal Redis but leave the gate paused

**Hypothesis:** Recovery of the data plane does not automatically reopen mutation.

**Fault:** Heal the partition without changing the gate.

**Pass criteria:** Requests remain blocked until the operator explicitly validates topology, HMAC, duplicate suppression, audit writes, and reconciliation. This verifies that automatic recovery cannot bypass the safety review.

### CH-07 — Controlled reopen after reconciliation

**Hypothesis:** The gate reopens only after all required evidence is present.

**Execution:**

```bash
hmsi-admin verification run --environment staging --mode canary --experiment "$EXPERIMENT_ID"
hmsi-admin outbox reconcile --experiment "$EXPERIMENT_ID" --mode inspect-only
hmsi-admin mutation-gate open --environment staging --reason "synthetic recovery evidence complete" --experiment "$EXPERIMENT_ID"
hmsi-admin verification deliver-synthetic --experiment "$EXPERIMENT_ID" --count 2 --concurrency 1
```

**Pass criteria:** The synthetic canary produces the expected single mutation, replay returns a duplicate no-op, audit evidence is complete, and the gate remains available for immediate pause.

## 6. Observability assertions

Each experiment must emit bounded metrics:

| Metric | Required labels | Assertion |
|---|---|---|
| `mutation_gate_state_changes_total` | environment, state, reason_code | Pause occurs when Redis decision is unknown |
| `redis_idempotency_decision_total` | environment, decision | `unavailable` rises during partition; no mutation follows |
| `webhook_requests_total` | environment, route, result_code | Flood is visible without payload labels |
| `jira_mutations_total` | environment, outcome | Zero during Redis uncertainty; one for a unique recovered event |
| `unknown_outcome_total` | environment, provider | Timeout path is visible and reconciled |
| `audit_write_failures_total` | environment, control_id | Any failure blocks mutation |

Alert payloads should contain experiment ID, control ID, environment, bounded result code, and evidence reference. They must not contain HMACs, Redis credentials, raw webhook bodies, personal data, or arbitrary Datadog message text.

## 7. Exit criteria and evidence package

An experiment is complete only when the fault is healed, the isolated namespace has expired or been explicitly cleaned, the mutation gate is in the intended test state, synthetic Jira records are accounted for, and all evidence references are stored. The result is `pass`, `fail`, `blocked`, or `inconclusive`; `inconclusive` is not a pass.

The evidence package should include the experiment manifest, harness version, environment identifier, fault start/end times, topology fingerprints, gate transition log, metrics summary, Jira mutation count, reconciliation decisions, scrubber result, and reviewer approvals. It should exclude secrets, raw bodies, personal identifiers, and full provider response bodies.

## 8. References

[1]: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/ "Redis, High availability with Redis Sentinel"  
[2]: https://redis.io/docs/latest/commands/cluster-nodes/ "Redis, CLUSTER NODES command"  
[3]: https://redis.io/docs/latest/commands/cluster-failover/ "Redis, CLUSTER FAILOVER command"  
[4]: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ "Redis, Replication documentation"  
[5]: https://redis.io/docs/latest/commands/role/ "Redis, ROLE command"  
