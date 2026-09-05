# HMSI Datadog-to-Jira Production Deployment and Secret-Management Runbook

**Audience:** Engineering, platform operations, security, privacy, and incident response teams.  
**Scope:** Production deployment of the Datadog-to-Jira corrective-action synchronization service, including HMAC source authentication and Redis-backed idempotency.  
**Status:** Reference runbook. No live infrastructure, Datadog webhook, Redis instance, Jira credential, or production deployment was changed.

> **Safety boundary:** This integration may create or update a bounded Jira corrective-action record. It must not publish news, restore archived content, release suppression, delete records, close corrective actions, or bypass HMSI approval workflows.

## 1. Target architecture

Datadog sends a custom JSON webhook to an HTTPS receiver. The receiver is deployed behind an approved gateway or private ingress, authenticates the request, validates and scrubs the payload, acquires a Redis idempotency record, and then calls Jira through a narrowly scoped service identity. An append-only audit ledger records the receipt, rejection, duplicate, Jira mutation, failure, and retry outcome.

The receiver should acknowledge quickly and delegate slow Jira work to a durable outbox when provider latency may approach Datadog’s documented 15-second request timeout. Datadog documents retries for internal errors or HTTP 5xx responses, with missed connections retried five times.[1] A 2xx response must be returned only after the request has been durably accepted or completed; a 5xx response must be safe to retry.

| Boundary | Required control |
|---|---|
| Datadog → receiver | HTTPS, approved ingress, source authentication, size/content-type limits |
| Receiver → Redis | TLS, authentication, private network path, restricted client identity |
| Receiver → Jira | HTTPS, service account, minimum project/issue permissions, secret-backed token |
| Receiver → audit ledger | Durable append-only event write before or atomically with mutation policy |
| Logs/alerts | Scrubbed fields only; no raw payload, secrets, personal data, or sensitive case content |

## 2. Production prerequisites

Before deployment, obtain written approval from engineering, operations, security, privacy, and the governance owner. Confirm the Jira Cloud project key, corrective-action issue type, custom-field IDs, issue-security scheme, service account, Datadog site, allowlisted monitor IDs, Redis topology, backup/restore plan, alert destinations, and approved evidence repository.

Jira’s Create issue API requires the target project and issue type to accept the supplied fields, and Atlassian recommends using create metadata to discover valid fields. Descriptions and multiline text use Atlassian Document Format.[2] Do not guess Jira custom-field IDs or assume that a field name is accepted by the API.

The production change record should include the exact code version, configuration version, secret version identifiers, Redis endpoint identifier, Jira project/issue type, rollout window, on-call owner, rollback owner, and synthetic test evidence. Secret values themselves must never appear in the change record.

## 3. HMAC secret provisioning

### 3.1 Secret requirements

Create a high-entropy HMAC secret through the approved secret manager. A 32-byte or larger random value is appropriate for this reference design. Node.js documents `crypto.randomBytes()` as a cryptographically strong random-data generator.[3] Generate the value on a trusted administrative workstation or inside the secret manager; never generate it in browser code, Jira, Datadog message text, a shell history that is retained, or a source repository.

Example local generation command for a controlled administrative session:

```bash
node --input-type=module -e "import crypto from 'node:crypto'; console.log(crypto.randomBytes(32).toString('base64url'))"
```

The printed value must be entered directly into the approved secret manager without copying it into tickets, chat, screenshots, logs, or shell history. If shell history or terminal capture is unavoidable, clear or destroy the captured material under the organization’s security procedure.

### 3.2 Secret names and versions

Use separate secret names for each environment:

| Environment | Secret name | Purpose |
|---|---|---|
| Development | `hmsi/datadog-jira/dev/hmac` | Local or isolated development only |
| Staging | `hmsi/datadog-jira/staging/hmac` | Synthetic Datadog delivery and Jira test project |
| Production | `hmsi/datadog-jira/prod/hmac/active` | Current production verification secret |
| Production overlap | `hmsi/datadog-jira/prod/hmac/previous` | Temporary rotation overlap only |

The application receives values through runtime secret injection under environment variables such as `DATADOG_WEBHOOK_SHARED_SECRET` and, during rotation, `DATADOG_WEBHOOK_PREVIOUS_SECRET`. The application must not expose these values to client bundles, health endpoints, configuration pages, Jira fields, Datadog payloads, or error messages.

### 3.3 Datadog webhook configuration

Configure a Datadog Webhooks integration with an HTTPS endpoint and a custom JSON payload containing only the allowlisted fields defined in the HMSI sync template. Add a gateway-supported authentication header or route the webhook through an approved signed relay. Do not assume that a user-controlled JSON field proves Datadog origin.

Datadog supports custom headers and custom payload variables such as monitor ID, title, transition, priority, alert cycle key, event time, and event link.[1] Exclude raw event messages, log samples, security attributes, arbitrary scope, article content, contributor information, and confidential incident details.

## 4. HMAC verification and rotation

### 4.1 Verification contract

The ingress or receiver verifies an HMAC-SHA-256 signature over the exact UTF-8 request body. The supplied signature must be normalized from the approved header format, compared using a constant-time comparison, and rejected if malformed. The receiver must authenticate before parsing or logging the body when the ingress design permits.

A safe receiver returns `401` for invalid authentication, `422` for invalid but authenticated content, `500` for retryable internal or provider failures, and `200` for a previously completed duplicate. Rejection responses must contain a request ID but no secret, raw payload, or sensitive value.

### 4.2 Initial provisioning sequence

1. Create the production HMAC secret in the secret manager and record only its version identifier.
2. Deploy the receiver with the secret injected at runtime and verify that startup fails closed if the secret is missing or too short.
3. Configure the Datadog webhook or approved relay with the matching secret/header mechanism.
4. Send a synthetic staging or production-canary alert from an allowlisted, low-risk monitor.
5. Verify signature acceptance, scrubbing, audit creation, Redis idempotency, and Jira dry-run or test-project behavior.
6. Inspect logs and notifications for absence of raw payloads and secret material.
7. Enable normal alert delivery after security and operations sign-off.

### 4.3 Rotation sequence

OWASP recommends a staged rotation process: create the new secret, set it, test it, and complete the rotation.[4] For HMSI, use this sequence:

1. Create `active-v2` in the secret manager and retain the old value as `previous-v1`.
2. Deploy the receiver so it accepts both active-v2 and previous-v1 for a short, documented overlap window.
3. Update Datadog or the signed relay to use active-v2.
4. Send a synthetic alert and verify both delivery and rejection of a deliberately signed request using an unrelated value.
5. Monitor authentication failures and delivery success for the agreed overlap window.
6. Promote active-v2 to the only accepted value and revoke previous-v1.
7. Record secret-version identifiers, test evidence, operator, and completion time in the change record.
8. If failures rise, restore the previous accepted secret only through the rollback owner and record the reason.

Do not rotate by editing a value in a ticket, source file, container image, Jira issue, or Datadog notification body. If the old secret is suspected to be exposed, shorten the overlap window, rotate immediately, invalidate the old value, inspect access logs, and open a security incident.

## 5. Redis-backed idempotency design

### 5.1 Key model

Use a deterministic key derived from the normalized event, not from the raw payload:

```text
hmsi:ddjira:idempotency:v1:<sha256(environment|monitorId|alertCycleKey|transition)>
```

Store only bounded metadata. Do not store the raw Datadog body, article content, contributor information, log samples, tokens, or confidential incident details.

| Key | Example value | TTL |
|---|---|---:|
| `hmsi:ddjira:idem:v1:<digest>` | Completed result with issue key and event type | 30–90 days, based on replay policy |
| `hmsi:ddjira:lock:v1:<digest>` | Random worker token and request metadata | 2–5 minutes |
| `hmsi:ddjira:outbox:v1:<digest>` | Encrypted or bounded retry state | Until completion plus replay window |

The completion TTL must cover the maximum Datadog replay/retry window and any operational reconciliation period. Do not rely on a short processing-lock TTL as the only duplicate defense.

### 5.2 Atomic acquisition

Redis documents using `SET` with `NX` to set a key only when it does not already exist, together with `EX` or `PX` expiry options.[5] Use a random lock token and an atomic command:

```text
SET hmsi:ddjira:lock:v1:<digest> <random-token> NX EX 300
```

If Redis returns `OK`, the worker owns the short processing lock. If Redis returns nil, another worker is processing the event or a completed result exists. Check the completion key before deciding whether to retry.

Release the lock only if the stored token still equals the worker’s token. Use a Lua script or Redis function for compare-and-delete:

```lua
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
```

Never issue an unconditional `DEL` for a lock key because a late worker could delete a newer worker’s lock.

### 5.3 Completion record

After the Jira mutation and audit write are durably successful, store a bounded completion record. A JSON representation may contain:

```json
{
  "state": "completed",
  "externalAlertKey": "datadog:production:DDM-RESTORE-001:cycle-123:triggered",
  "jiraIssueKey": "HMSI-42",
  "result": "created",
  "completedAt": "2026-08-26T12:00:00.000Z",
  "auditRef": "audit://datadog-jira/sync-123"
}
```

The completion record must be written with an expiration and must not contain the Jira token, request body, article text, user identifiers, or sensitive evidence. If the completion write fails after Jira succeeds, mark the event as an unknown outcome, alert operations, and reconcile by external key before allowing a retry.

### 5.4 Redis availability and failover

The receiver must fail closed when Redis cannot establish an idempotency decision. It must not call Jira without a durable duplicate-control decision unless a separately approved emergency mode exists. Redis failover, restoration, replication lag, eviction, and clock behavior must be monitored.

Configure a memory policy that cannot silently evict completion records during the replay window. Use a dedicated Redis logical database or key prefix, TLS, ACLs, backups according to the provider’s guarantees, and a private network path. Do not use a shared cache with unrelated application keys unless isolation and eviction behavior are proven.

## 6. Deployment procedure

### Pre-deployment

Confirm the artifact checksum, code review approval, test results, secret-version references, Redis connectivity plan, Jira metadata, monitor allowlist, dry-run default, and rollback version. Verify that the service identity cannot administer Jira, delete issues, alter workflows, manage users, or close corrective actions.

### Staging

Deploy with `SYNC_DRY_RUN=true` and synthetic Datadog events. Verify valid and invalid signatures, unknown monitors, malformed timestamps, sensitive-field scrubbing, duplicate delivery, Redis lock contention, Redis restart, Jira 429/5xx, Jira 401/403, timeout-after-possible-creation, and audit-ledger failure.

### Production canary

Enable a single low-risk monitor or relay route. Confirm one accepted event, one duplicate event, one invalid signature, one retryable Jira error, and one recovered alert. Verify that Jira contains only bounded fields and that no automatic closure or publication occurs.

### Progressive enablement

Enable the remaining allowlisted monitors in groups. Keep an operator watching authentication failures, Redis errors, outbox age, Jira mutation errors, duplicate rates, and audit-write failures. Do not silently ignore spikes; pause mutation and move to incident response when integrity or public-boundary evidence is uncertain.

## 7. Secret and access controls

Separate duties between secret administrators, deployment operators, Jira integration owners, Datadog administrators, and audit reviewers. A single operator should not be able to generate, deploy, validate, and revoke a production secret without independent review.

Use short-lived administrative access, MFA, protected branches, reviewed infrastructure changes, and audit logging for secret reads, deployments, configuration changes, Redis administrative actions, Jira token use, and monitor changes. The application should receive only the secrets it needs and should not be able to list or modify secret-manager entries.

## 8. Monitoring and alert thresholds

| Signal | Starting alert condition | Response |
|---|---|---|
| Authentication failures | 5 in 5 minutes or any sustained increase above baseline | Check rotation, relay, replay, and possible exposure |
| Redis connection failures | 3 consecutive failures or 1 minute unavailable | Pause Jira mutation; inspect failover and network |
| Duplicate rate | More than 20% of events in 15 minutes | Investigate Datadog retries, replay, or key collision |
| Idempotency lock age | Any lock older than 10 minutes | Inspect crashed worker or stuck provider call |
| Unknown Jira outcome | Any timeout after a possible mutation | Reconcile by external key before retry |
| Outbox age | Oldest pending item exceeds 10 minutes | Escalate integration owner |
| Audit write failure | Any failure for a mutation attempt | Fail closed and page governance/operations |
| Secret rotation error | Any failed canary after rotation | Roll back accepted secret version |

Thresholds are starting values. Calibrate against staging and initial production baselines without including personal data or raw alert content in metric labels.

## 9. Incident response and rollback

If a monitor triggers a suspected false positive, first determine whether the event is only noisy or whether public visibility, authorization, audit integrity, or sensitive-data exposure is uncertain. A noisy monitor may be silenced briefly with owner, reason, ticket, scope, and expiry. A control-integrity uncertainty requires fail-closed containment and must not be “fixed” by silencing the alert.

The rollback order is:

1. Stop Datadog delivery or disable the affected webhook route if necessary.
2. Set `SYNC_DRY_RUN=true` or pause Jira mutation through the approved configuration path.
3. Preserve audit references, request IDs, Redis keys, outbox state, and deployment version identifiers.
4. Reconcile any unknown Jira outcomes by the deterministic external alert key.
5. Roll back application code or configuration to the last approved version.
6. Rotate HMAC credentials if authenticity is uncertain.
7. Restore Redis service or fail over according to the managed-service plan.
8. Re-run synthetic validation before resuming production delivery.
9. Review all affected Jira issues and ensure no corrective action was closed automatically.

Never delete Redis keys broadly during incident response. Delete or expire only a specifically identified synthetic or reconciled key under change/incident authorization. Broad key deletion can permit duplicate Jira mutations.

## 10. Validation checklist

| Check | Result | Evidence |
|---|:---:|---|
| Production secret exists only in approved manager | [ ] | Secret version reference |
| Receiver fails closed when secret is absent | [ ] | Startup/test log reference |
| Active/previous overlap tested during rotation | [ ] | Canary evidence |
| Datadog source authentication rejects tampering | [ ] | Test ID |
| Monitor allowlist rejects unknown IDs | [ ] | Test ID |
| Sensitive values absent from logs and Jira payload | [ ] | Scrubbing test |
| Redis uses NX + expiry for lock acquisition | [ ] | Command/config evidence |
| Lock release compares worker token | [ ] | Test evidence |
| Completion record persists beyond lock TTL | [ ] | Redis configuration |
| Duplicate event causes no second Jira mutation | [ ] | Integration test |
| Timeout-after-mutation is reconciled safely | [ ] | Failure test |
| Redis outage blocks Jira mutation | [ ] | Fail-closed test |
| Jira 429/5xx produces bounded retry | [ ] | Retry test |
| Jira 401/403 stops mutation loop | [ ] | Access test |
| Dry-run produces no Jira calls | [ ] | Test evidence |
| Automatic Jira closure is impossible | [ ] | Permission/workflow review |
| Audit event precedes or accompanies mutation per policy | [ ] | Audit evidence |
| Rollback version is deployable | [ ] | Artifact reference |
| Operations and security sign-off recorded | [ ] | Approval record |

## 11. Reference implementation notes

The repository reference handler is intentionally dependency-light and uses an in-memory idempotency store for tests. Production must replace that store with a durable Redis implementation, preferably behind an interface with methods equivalent to `begin`, `complete`, `release`, `getCompleted`, and `reconcile`.

A production Redis adapter should use a connection pool, TLS, ACL credentials, command timeouts, bounded retries, health checks, and metrics. It should expose only safe status categories to the handler. Redis exceptions must be classified into unavailable, timeout, authentication, protocol, and configuration errors without serializing provider responses into logs.

## 12. References

[1]: https://docs.datadoghq.com/integrations/webhooks/ "Datadog Webhooks"  
[2]: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/ "Atlassian Jira Cloud REST API v3 — Issues"  
[3]: https://nodejs.org/api/crypto.html "Node.js Crypto documentation"  
[4]: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html "OWASP Secrets Management Cheat Sheet"  
[5]: https://redis.io/docs/latest/commands/set/ "Redis SET command"


## 13. Split-brain Redis outage during webhook flood

For a Redis split-brain or active webhook flood, use the dedicated recovery procedure: [HMSI Split-Brain Redis Recovery Runbook](hmsi-split-brain-redis-webhook-flood-recovery-runbook.md). It preserves this runbook’s fail-closed boundary and adds containment, read-only topology inspection, Sentinel/Cluster divergence checks, ingress throttling, provider-authorized recovery, deterministic Jira reconciliation, synthetic validation, and gradual reopening.
