# HMSI Staging Monitoring Deployment Workflow: Least-Privilege Token Security Assessment

**Assessment date:** 26 August 2026  
**Scope:** `.github/workflows/deploy-staging-monitoring.yml`, `scripts/deploy-staging-monitoring.mjs`, and `scripts/smoke-test-staging-monitoring.mjs`  
**Environment:** Staging only  
**Assessment type:** Design and static configuration review; no token values, GitHub environment settings, Kubernetes RBAC bindings, Grafana permissions, Prometheus permissions, or Alertmanager routes were inspected live.

## Executive conclusion

The workflow has a sound initial separation between a secret-free validation job and a protected staging deployment job. It sets `GITHUB_TOKEN` to `contents: read`, serializes deployments, requires the `staging-monitoring` environment, validates staging-only targets, and cleans locally materialized deployment files. Those controls materially reduce accidental deployment and broad repository-token exposure.

The remaining risk is **moderate** until the credential model is tightened. The principal gaps are a long-lived, base64-encoded Kubernetes kubeconfig stored as a GitHub secret; mutable action and container image tags; a Grafana token that combines dashboard read, backup, and write operations; and an Alertmanager route-exercise token that can post arbitrary alerts unless a dedicated ingress policy constrains it. The recommended end state is short-lived federated cluster authentication, fixed-resource Kubernetes RBAC, narrowly scoped Grafana tokens, read-only Prometheus access, and a restricted Alertmanager proxy for synthetic alerts.

> GitHub warns that automatic redaction cannot be assumed for transformed values and specifically advises against storing structured JSON, XML, or YAML blobs as a single secret. A base64-encoded kubeconfig is therefore a heightened handling risk and should be replaced by short-lived federated credentials where the cluster identity provider supports them.[1]

## Trust boundary and credential inventory

The workflow must contact five independent systems: GitHub, Kubernetes, Grafana, Prometheus, and Alertmanager. The optional restricted alert sink is a sixth boundary. Each credential must be unique to staging and must not work against production hosts, namespaces, organizations, folders, or receivers.

| Credential or identity | Current workflow use | Minimum authority required | Assessment | Required change |
|---|---|---|---|---|
| `GITHUB_TOKEN` | Checkout and artifact workflow operations | `contents: read` only | **Acceptable.** The workflow explicitly sets `contents: read`. | Keep repository default read-only; do not add write scopes. |
| GitHub environment approval | Gates `deploy-staging` secret access | Protected `staging-monitoring` environment with required reviewers | **Conditionally acceptable.** The YAML references the environment, but live reviewer rules were not verified. | Require two deployment approvers or one approver independent of the code author; restrict environment use to `main`. |
| Kubernetes kubeconfig | Reads namespace/CRD and applies one `PrometheusRule` | Namespace-bound identity that can read and patch the fixed monitoring rule | **High risk.** A base64 kubeconfig is structured, long-lived credential material unless it is short-lived and tightly bound. | Prefer OIDC workload federation and short-lived credentials. If temporary kubeconfig use remains, enforce a short expiry, dedicated identity, and fixed-resource RBAC. |
| Grafana deployment token | Reads existing dashboard, writes dashboard, checks health, restores on failure | Dashboard read/write only for the staging monitoring folder and dashboard UID | **Moderate risk.** Single write token is necessary for the upsert path but should not carry organization admin or datasource-admin permissions. | Use a dedicated service account with folder/dashboard-scoped RBAC; separate read-only smoke token if practical. |
| Prometheus API token | Runs read-only instant queries during smoke verification | `GET /api/v1/query` only, limited to staging Prometheus | **Low to moderate risk.** The helper uses read-only endpoints, but platform-side scope is unverified. | Use a query-only proxy or reverse-proxy policy that allows only `/api/v1/query` and rejects admin, lifecycle, delete, and remote-write endpoints. |
| Alertmanager verification token | Reads status | `GET /api/v2/status` only | **Low risk** if a read-only policy exists. | Separate from the route-exercise credential. |
| Alertmanager route-exercise token | Posts one synthetic alert | `POST /api/v2/alerts` only, with fixed staging/synthetic labels | **Moderate risk.** Native Alertmanager APIs generally cannot constrain a bearer token to a specific alert name and label set. | Use a staging-only synthetic-alert proxy that validates payload schema/labels/TTL and forwards to Alertmanager. Do not give the GitHub runner a general Alertmanager write token. |
| Staging alert-sink token | Polls one test receipt | Read the event receipt matching the generated run ID only | **Moderate risk** if the sink accepts arbitrary run IDs or exposes retention. | Use a sink API that validates a signed, single-use run capability and retains receipt metadata for no more than ten minutes. |

## Required Kubernetes permission model

Kubernetes `Role` objects are namespaced; permissions are additive and should use specific resources and verbs rather than wildcards.[2] The pipeline should not hold cluster-admin, broad `monitoring.coreos.com/*`, access to `secrets`, or any permission outside the designated staging monitoring namespace.

The current `kubectl apply` approach can create the target `PrometheusRule` if absent. Kubernetes cannot constrain a top-level `create` operation by resource name, so a role that includes `create` on `prometheusrules` can create a different rule in the namespace. This is a material least-privilege limitation.

The recommended pattern is to pre-provision `hmsi-supavisor-pool-alerts` through a separately reviewed bootstrap change and switch the deployment workflow to a fixed-name server-side patch/update operation. That permits `resourceNames` to narrow most ongoing workflow access.

```yaml
# Reference RBAC for the persistent deployment identity.
# Bind only in the dedicated staging monitoring namespace.
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: hmsi-staging-monitoring-deployer
  namespace: <staging-monitoring-namespace>
rules:
  - apiGroups: ["monitoring.coreos.com"]
    resources: ["prometheusrules"]
    resourceNames: ["hmsi-supavisor-pool-alerts"]
    verbs: ["get", "patch", "update"]
  - apiGroups: [""]
    resources: ["namespaces"]
    resourceNames: ["<staging-monitoring-namespace>"]
    verbs: ["get"]
```

The workflow does not need `list`, `watch`, `delete`, `create`, `secrets`, `configmaps`, `pods`, `deployments`, `roles`, `rolebindings`, or any cluster-scoped write permission after the target rule exists. The `kubectl api-resources` discovery step may require discovery permissions; remove that step if a limited identity cannot perform discovery, or perform CRD validation outside the deployment identity.

## Grafana service-account assessment

Grafana service accounts are intended for automated API workloads, tokens inherit the associated service account’s permissions, and service accounts can be given granular RBAC permissions where the Grafana edition supports it.[3] The deployment token must be unique to the staging Grafana organization.

| Operation in code | Minimum permission | Must not have |
|---|---|---|
| `GET /api/dashboards/uid/hmsi-supavisor-realtime` | Read the fixed dashboard UID and its folder | Read all dashboards, users, teams, organizations, or datasource credentials |
| `POST /api/dashboards/db` upsert/restore | Write the fixed dashboard UID in the staging monitoring folder | Organization administrator, global user management, datasource modification, alert-rule administration unless explicitly required |
| `GET /api/health` | Health read; often unauthenticated in a protected network | Any write scope solely for health checking |
| Optional permission introspection | Read only the service account’s own permissions | Service account management or token creation |

Where Grafana Enterprise RBAC is available, assign `None` as the base role and grant dashboard read/write only for `hmsi-supavisor-realtime` and the staging monitoring folder. Where only basic organization roles are available, an `Editor` service account is broader than desired; mitigate by using a separate staging Grafana organization and a dedicated folder with no other sensitive dashboards. Configure a short token expiration limit and rotate before expiration. Grafana notes that service account tokens are separate from users and can have expirations limited by configuration.[3]

## Prometheus and Alertmanager assessment

The Prometheus helper uses the stable `/api/v1/query` endpoint, which supports instant query requests and returns JSON; it has no need for administrative or data mutation endpoints.[4] The preferred deployment design is a read-only reverse proxy in front of Prometheus that permits only `GET /api/v1/query`, applies a request size and query timeout bound, and logs only safe route/result metadata. It must reject `/api/v1/admin/*`, `/api/v1/status/*` if not needed, `/api/v1/write`, delete endpoints, and unbounded label/series discovery endpoints.

Alertmanager status verification needs no alert write ability. The synthetic route exercise is different: it must post one short-lived synthetic alert. Use a separate, staging-only token behind a proxy that requires all of the following: `alertname=HmsiMonitoringRoutingSmoke`, `environment=staging`, `synthetic=true`, `smoke_test=true`, `severity=info`, a UUID `smoke_run_id`, and an end time no more than two minutes after start. Reject every other label, receiver target, alert name, annotation, and duration. This proxy control is necessary because generic bearer access to `/api/v2/alerts` could otherwise generate arbitrary staging alerts.

## Secret storage, rotation, and exposure controls

The following mandatory controls apply to every credential:

| Control | Requirement | Evidence |
|---|---|---|
| Isolation | Store only in GitHub environment secrets for `staging-monitoring`, never repository-wide secrets or source files | Environment inventory screenshot/export with values omitted |
| Approval | Require environment approval before the deployment job can access secrets | Environment protection-rule configuration |
| Rotation | Grafana/Prometheus/Alertmanager/sink tokens: maximum 90 days; temporary kube credential: 24 hours or less | Rotation register with token identifier, owner, issue, expiry, replacement, and revocation time |
| Revocation | Disable token or identity immediately on exposure, then update the environment secret and rerun a non-deploy validation | Provider audit event and successful post-rotation smoke test |
| Logging | Never echo secrets; avoid encoded secrets; delete logs and rotate if a transformed value is exposed | Workflow log review and incident record |
| Target binding | Enforce HTTPS origin and explicit staging hostname allowlists in code and environment settings | Static tests and environment variable review |
| Network | GitHub runner egress only to approved staging Grafana, Prometheus, Alertmanager, Kubernetes API, and container registry endpoints | Egress policy, firewall, or proxy allowlist |

The current base64 kubeconfig is the highest-priority remediation. Base64 is encoding, not encryption, and a kubeconfig commonly includes a client certificate or bearer token. Replace it with OIDC federation to the cloud or cluster identity provider, restrict trust conditions to this repository, the `main` branch, the `staging-monitoring` environment, and the workflow file, and issue a short-lived credential. If OIDC cannot be introduced immediately, replace the broad kubeconfig with a dedicated service-account token or certificate that expires quickly, is namespaced, and has only the Role above.

## Workflow and supply-chain findings

| Finding | Severity | Evidence | Required remediation |
|---|---|---|---|
| `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, and `azure/setup-kubectl@v4` use mutable tags | Moderate | Workflow lines 34–35, 49, 85–86, and 102 | Pin each third-party action to a reviewed full commit SHA; GitHub describes full SHA pinning as the immutable release option.[1] |
| Prometheus Docker image uses tag `v2.54.1` | Moderate | Workflow line 46 | Pin the image by digest and review image provenance. |
| Kubeconfig is structured secret material | High | Workflow lines 71 and 98 | Use OIDC/short-lived credentials; if temporary, ensure no token/certificate is printed, retained, or valid outside staging. |
| PrometheusRule can be created by `kubectl apply` | Moderate | Workflow lines 110–116 | Pre-provision fixed object and replace apply with fixed-resource patch/update. |
| Deployment state for Prometheus rule lacks automatic prior-manifest rollback | Moderate | Workflow rolls back only Grafana | Store a reviewed prior-rule artifact or require operator rollback by commit; do not delete rules automatically. |
| Staging hostname allowlists are environment variables | Low to moderate | Workflow and helper | Protect environment variable modification with the same reviewer policy and audit it as a deployment-sensitive change. |

## Verification checklist

Before enabling the workflow, an authorized security reviewer should confirm each assertion below using provider-side evidence rather than workflow output alone.

| Verification | Pass condition |
|---|---|
| GitHub token | Workflow retains `permissions: contents: read`; no job requires repository write or id-token unless OIDC is implemented |
| Environment | `staging-monitoring` has required reviewers, restricted branch policy, and only staging-scoped secrets/variables |
| Kubernetes | `kubectl auth can-i` is `yes` only for the intended `PrometheusRule` get/patch/update and `no` for secrets, pods, deployments, roles, clusterroles, other namespaces, delete, and broad create |
| Grafana | Permission introspection returns only the dashboard/folder permissions required by the deployment token |
| Prometheus | Query token can query required staging metrics but cannot access administrative, lifecycle, delete, or write interfaces |
| Alertmanager | Verification token cannot post alerts; route-exercise proxy rejects any alert outside the synthetic schema and receiver |
| Sink | Sink token cannot enumerate unrelated receipts and retention is bounded to ten minutes |
| Rotation | Every credential has an owner, expiry, last rotation, next rotation, and tested revocation procedure |
| Logs | A test workflow run is reviewed for original and transformed secret leakage; encoded kubeconfig never appears |

## Residual risk

Even after remediation, a maintainer who can merge to `main` and obtain environment approval can change monitoring configuration. This is an accepted operational risk only if CODEOWNERS protect workflow, helper, dashboard, and alert-rule paths; GitHub environment approvals are independent; the staging cluster identity cannot affect production; and logs/artifacts are reviewed. The workflow must remain staging-only until those conditions are verified.

## References

[1]: https://docs.github.com/en/actions/reference/security/secure-use "GitHub Actions Secure Use Reference"  
[2]: https://kubernetes.io/docs/reference/access-authn-authz/rbac/ "Kubernetes RBAC Authorization"  
[3]: https://grafana.com/docs/grafana/latest/administration/service-accounts/ "Grafana Service Accounts"  
[4]: https://prometheus.io/docs/prometheus/latest/querying/api/ "Prometheus HTTP API"  
