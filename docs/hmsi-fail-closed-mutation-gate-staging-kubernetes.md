# HMSI Fail-Closed Mutation Gate on Staging Kubernetes

**Scope:** Staging only. This package does not deploy to production and does not contain credential values.  
**Manifest:** `deploy/kubernetes/staging/fail-closed-mutation-gate.yaml`  
**Primary safety property:** The integration starts with mutation disabled and remains blocked when Redis, audit, policy, or reconciliation state is uncertain.

## 1. Required environment variables

The manifest separates non-secret operational configuration in a ConfigMap from credentials and private connection material in an ExternalSecret. The exact secret-manager implementation is provider-neutral; the `ClusterSecretStore` and workload-identity annotation must be mapped to the approved HMSI cloud provider.

| Variable | Secret? | Required value or policy |
|---|---:|---|
| `NODE_ENV` | No | `staging` |
| `HMSI_ENVIRONMENT` | No | `staging` |
| `HTTP_PORT` | No | `8080` |
| `LOG_LEVEL` | No | `info` or stricter during validation |
| `LOG_FORMAT` | No | `json` |
| `LOG_REDACTION_MODE` | No | `strict` |
| `WEBHOOK_ROUTE` | No | `/api/integrations/datadog` |
| `WEBHOOK_MAX_BODY_BYTES` | No | `65536` or lower if payload contract permits |
| `WEBHOOK_MAX_CLOCK_SKEW_SECONDS` | No | `300`; align with the signed-event contract |
| `WEBHOOK_RATE_LIMIT_RPS` | No | `25` for staging canary |
| `WEBHOOK_RATE_LIMIT_BURST` | No | `50` |
| `MUTATION_GATE_INITIAL_STATE` | No | `PAUSED` |
| `MUTATION_GATE_FAIL_CLOSED` | No | `true` |
| `MUTATION_GATE_ALLOW_OPEN` | No | `true`, but only through reviewed control-plane action |
| `MUTATION_GATE_OPEN_REQUIRES_APPROVAL` | No | `true` |
| `MUTATION_GATE_OPEN_REQUIRES_SYNTHETIC_PROBE` | No | `true` |
| `SYNC_DRY_RUN` | No | `true` for initial staging deployment; change only through approved canary |
| `JIRA_MUTATION_ENABLED` | No | `false` until the staging test project and canary are approved |
| `JIRA_BASE_URL` | No | HTTPS URL for the isolated staging Jira host; set in the Deployment, not in a public ConfigMap |
| `JIRA_EXTERNAL_KEY_FIELD` | No | Approved Jira custom field for the deterministic external alert key |
| `JIRA_RETRY_MAX_ATTEMPTS` | No | `3` |
| `JIRA_RETRY_BASE_DELAY_MS` | No | `500` |
| `JIRA_REQUEST_TIMEOUT_MS` | No | `3000` |
| `REDIS_URL` | Yes | TLS connection URL for the staging Redis service |
| `REDIS_USERNAME` | Yes | Dedicated least-privilege staging Redis ACL user |
| `REDIS_PASSWORD` | Yes | Short-lived or rotated staging ACL credential |
| `REDIS_CA_PEM` | Yes | CA material required to validate the Redis server certificate |
| `REDIS_TLS` | No | `true` |
| `REDIS_CONNECT_TIMEOUT_MS` | No | `1000` |
| `REDIS_COMMAND_TIMEOUT_MS` | No | `1000` |
| `REDIS_RECONNECT_MAX_ATTEMPTS` | No | `0` for fail-closed behavior; application may retry at the request boundary only through bounded policy |
| `REDIS_FAIL_CLOSED` | No | `true` |
| `IDEMPOTENCY_KEY_PREFIX` | No | Unique staging prefix, e.g. `hmsi:staging:datadog:idempotency:v1:` |
| `IDEMPOTENCY_LOCK_TTL_SECONDS` | No | `300`; must exceed the maximum request/mutation window |
| `IDEMPOTENCY_COMPLETION_TTL_SECONDS` | No | `7776000` or the approved replay-protection retention window |
| `IDEMPOTENCY_UNKNOWN_OUTCOME_STATE` | No | `reconciliation_required` |
| `IDEMPOTENCY_REQUIRE_ATOMIC_ACQUIRE` | No | `true` |
| `IDEMPOTENCY_REQUIRE_CONDITIONAL_RELEASE` | No | `true` |
| `HMAC_SECRET_CURRENT` | Yes | Current HMAC-SHA-256 signing secret for the staging webhook |
| `HMAC_SECRET_PREVIOUS` | Yes | Previous secret during an approved rotation overlap; blank only when the overlap contract allows it |
| `AUDIT_DATABASE_URL` | Yes | Restricted staging audit-ledger connection; never log or print it |
| `AUDIT_REQUIRED` | No | `true` |
| `AUDIT_FAIL_CLOSED` | No | `true` |
| `AUDIT_RAW_PAYLOADS` | No | `false` |
| `AUDIT_REDACTION_MODE` | No | `strict` |
| `EVIDENCE_SIGNING_REQUIRED` | No | `true` |
| `JIRA_API_TOKEN` | Yes | Dedicated staging Jira service credential with only the test-project permissions required |
| `DATADOG_ALLOWED_HOST` | No | `app.datadoghq.com` or the approved staging Datadog host |
| `SYNTHETIC_ONLY` | No | `true` |

The application should refuse to start if a mandatory secret is absent, if a TLS URL is not used, if `SYNTHETIC_ONLY` is not `true` in this staging package, or if either `MUTATION_GATE_FAIL_CLOSED` or `REDIS_FAIL_CLOSED` is false.

## 2. Secret-manager record

Create one secret-manager record at the provider’s approved path, for example `hmsi/staging/mutation-gate`, with the following properties. Store the values in the secret manager; do not commit them in Kubernetes YAML.

```text
hmac_secret_current=<generated staging-only random secret>
hmac_secret_previous=<previous staging secret or approved empty value>
redis_url=rediss://<staging-redis-host>:6379/0
redis_username=<dedicated ACL username>
redis_password=<dedicated ACL password>
redis_ca_pem=<staging Redis CA certificate>
jira_api_token=<dedicated staging Jira token>
audit_database_url=<restricted staging audit connection>
```

The secret-manager identity bound to the ServiceAccount must read only this record. It must not read production Redis, production HMAC keys, donor/member/worker data, or unrelated application secrets.

## 3. Provider-specific prerequisites

Before applying the manifest, create or verify the following resources:

| Resource | Staging requirement |
|---|---|
| `ClusterSecretStore` | Exists and is healthy; it can read only `hmsi/staging/mutation-gate` |
| External Secrets controller | Installed and permitted to reconcile the namespace |
| Image | Reviewed immutable image digest for the mutation-gate service; replace the illustrative tag in the manifest |
| Jira | Isolated staging project, test service account, and deterministic external-key field |
| Redis | TLS enabled, dedicated ACL user, staging namespace/prefix, persistence/replication policy documented |
| Ingress | Only the staging Datadog test route can reach the Service; real production webhook must not point here |
| Audit ledger | Staging database or append-only test store is reachable and scrubbed |
| DNS/certificates | Staging hostname and certificate are valid; no production hostname aliases |

The manifest includes an ingress NetworkPolicy but does not guess the Jira or Redis egress CIDRs. Add provider-specific egress restrictions after the actual network topology is known; otherwise a default-deny egress policy could accidentally block Redis or Jira and a permissive policy could broaden access.

## 4. Preflight commands

Set the namespace context and validate the YAML without revealing secrets:

```bash
kubectl config current-context
kubectl create namespace hmsi-staging --dry-run=client -o yaml >/dev/null
kubectl apply --dry-run=server -f deploy/kubernetes/staging/fail-closed-mutation-gate.yaml
kubectl auth can-i create deployments --namespace hmsi-staging
kubectl get clustersecretstore hmsi-staging-secret-store
```

Confirm that the image is immutable before applying:

```bash
kubectl -n hmsi-staging get deployment hmsi-mutation-gate -o jsonpath='{.spec.template.spec.containers[0].image}'
```

The output must be replaced with the reviewed image digest, for example `ghcr.io/hmsi/mutation-gate@sha256:<reviewed-digest>`. Do not use a mutable `:latest` tag.

Check that the ExternalSecret is ready without printing Secret data:

```bash
kubectl -n hmsi-staging get externalsecret hmsi-mutation-gate-secrets \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}{"\n"}'
kubectl -n hmsi-staging get secret hmsi-mutation-gate-secrets \
  -o jsonpath='{.metadata.name}{"\n"}'
```

## 5. Apply and verify the initial paused deployment

Apply only after the prerequisites and approvals are complete:

```bash
kubectl apply -f deploy/kubernetes/staging/fail-closed-mutation-gate.yaml
kubectl -n hmsi-staging rollout status deployment/hmsi-mutation-gate --timeout=180s
kubectl -n hmsi-staging get pods -l app.kubernetes.io/name=hmsi-mutation-gate -o wide
kubectl -n hmsi-staging get networkpolicy,pdb,service
```

Check logs for bounded startup errors without following or exporting secrets:

```bash
kubectl -n hmsi-staging logs deployment/hmsi-mutation-gate --since=10m \
  | grep -E 'gate|redis|audit|startup|redact|secret|error' \
  | sed -E 's/(token|password|secret|authorization|redis_url)[=:][^ ]+/\1=<redacted>/Ig'
```

Verify readiness and the fail-closed state through the approved internal route:

```bash
kubectl -n hmsi-staging port-forward service/hmsi-mutation-gate 18080:80
curl --fail-with-body --silent http://127.0.0.1:18080/health/ready
curl --fail-with-body --silent http://127.0.0.1:18080/health/startup
curl --fail-with-body --silent http://127.0.0.1:18080/internal/mutation-gate/status \
  | jq '{environment,state,reason,changedAt}'
```

The state must be `PAUSED`, and readiness must not mean that Jira mutation is enabled. The service may be live and healthy while intentionally refusing external mutation.

## 6. Staging canary sequence

Keep `SYNC_DRY_RUN=true` and `JIRA_MUTATION_ENABLED=false` for the first probe. Send only a synthetic, correctly signed event through the isolated test route. Confirm authentication, scrubbing, audit, and idempotency behavior without creating Jira data.

```bash
hmsi-admin verification probe idempotency \
  --environment staging \
  --mode synthetic-dry-run \
  --namespace 'hmsi:staging:datadog:idempotency:v1:' \
  --synthetic-event 'synthetic-staging-canary-001'
```

After the dry-run passes, an approved reviewer may set `JIRA_MUTATION_ENABLED=true` and `SYNC_DRY_RUN=false` through the staging secret/configuration workflow. Do not edit a live Pod with `kubectl exec` or alter environment variables interactively. Roll out the reviewed configuration and repeat the synthetic probe against the isolated Jira project.

The canary must prove one mutation for one unique event, a duplicate no-op on replay, `503` with zero mutation when Redis is partitioned, no mutation while the gate is paused, no raw payload in logs, and a complete bounded audit record.

## 7. Rollback

Rollback the application or configuration to the previous reviewed staging version, then immediately force the gate to `PAUSED` if state is uncertain:

```bash
kubectl -n hmsi-staging rollout history deployment/hmsi-mutation-gate
kubectl -n hmsi-staging rollout undo deployment/hmsi-mutation-gate --to-revision=<approved-revision>
kubectl -n hmsi-staging rollout status deployment/hmsi-mutation-gate --timeout=180s
```

If the Redis secret, HMAC secret, or service-account binding may be compromised, revoke it in the secret manager and rotate it using the approved overlap procedure. Never delete the Redis idempotency namespace to make a failed test pass; retain evidence and use a new synthetic namespace for the next run.

## 8. Required review before production adaptation

This package is intentionally staging-safe. Before adapting it to production, the control owners must replace the illustrative image tag, exact Jira URL, Redis endpoint, SecretStore binding, workload identity annotation, egress policy, and retention values; approve the production HMAC rotation plan; confirm the provider’s failover semantics; and run the full Redis partition chaos suite. Production must not inherit `SYNC_DRY_RUN=true` or `JIRA_MUTATION_ENABLED=false` without an explicit release decision, and it must never inherit staging credentials or staging key prefixes.

## 9. References

[1]: https://kubernetes.io/docs/concepts/configuration/secret/ "Kubernetes Secrets documentation"  
[2]: https://kubernetes.io/docs/concepts/services-networking/network-policies/ "Kubernetes Network Policies documentation"  
[3]: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ "Kubernetes Deployments documentation"  
[4]: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/ "Redis Sentinel documentation"  
[5]: https://redis.io/docs/latest/commands/cluster-failover/ "Redis CLUSTER FAILOVER documentation"  
