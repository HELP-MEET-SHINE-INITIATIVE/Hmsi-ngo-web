# HMSI Staging Monitoring GitHub Actions Pipeline

## Purpose

The pipeline validates and deploys the Supavisor Prometheus alert rules and Grafana dashboard to a protected **staging** monitoring environment. It is intentionally unable to accept a production target: the helper script requires `HMSI_DEPLOY_ENVIRONMENT=staging`, requires the Grafana hostname to appear in an explicit staging allowlist, rejects hostnames containing `prod` or `production`, and the workflow uses the protected `staging-monitoring` environment.

The workflow has two jobs. The first validates the repository artifacts without secrets. The second runs only from `main` after the validation job succeeds and after the GitHub environment’s configured protection rules approve access to the staging secrets. A manual run also requires `apply=true`.

## Required GitHub environment configuration

Create a protected GitHub environment named `staging-monitoring`. Configure required reviewers before adding deployment secrets. Keep these values in the environment, not repository-wide settings.

| Name | Type | Purpose |
|---|---|---|
| `HMSI_STAGING_GRAFANA_URL` | Variable | HTTPS root URL for the staging Grafana instance |
| `HMSI_STAGING_GRAFANA_ALLOWED_HOSTS` | Variable | Comma-separated hostname allowlist containing only the staging Grafana host |
| `HMSI_STAGING_MONITORING_NAMESPACE` | Variable | Kubernetes namespace containing the Prometheus Operator resources |
| `HMSI_STAGING_MONITORING_KUBE_CONTEXT` | Variable | Exact expected context name from the staging kubeconfig |
| `HMSI_STAGING_GRAFANA_API_TOKEN` | Secret | Grafana service-account token limited to dashboard read/write in the staging folder |
| `HMSI_STAGING_MONITORING_KUBECONFIG_B64` | Secret | Base64-encoded, staging-only kubeconfig with only `PrometheusRule` apply/get permission in the designated namespace |

Do not add a Supabase URL, database password, service-role key, Redis credential, HMAC secret, real webhook payload, or production kubeconfig to this workflow. The pipeline does not need them.

## Deployment flow

The validation job checks the dashboard JSON, low-cardinality label guardrails, the required alert set, the staging boundary, and Prometheus rule syntax using `promtool`. It uploads the validated rule and dashboard artifacts for seven days.

The deployment job decodes the staging-only kubeconfig without echoing it, verifies the exact expected Kubernetes context and Prometheus Operator CRD, renders the standalone rule group into a `PrometheusRule` resource, performs a server-side dry run, backs up the current Grafana dashboard, applies the rule, updates the dashboard through the Grafana API, and checks Grafana health. If a failure happens after the dashboard backup exists, it restores the previous Grafana dashboard; PrometheusRule rollback remains an operator action because the pipeline does not retain or apply a prior rule manifest.

## Required monitoring-cluster prerequisites

The staging monitoring cluster must use the Prometheus Operator `PrometheusRule` CRD and select resources with the labels emitted by the helper. The Prometheus server must scrape the normalized HMSI Supavisor metrics described in the dashboard configuration. Grafana must expose the dashboard API to the staging runner and contain a service account scoped only to the relevant staging dashboard folder.

## Initial validation

Before enabling `main` auto-deploys, run the workflow manually with `apply=false`; confirm the static checks and `promtool` validation pass. Then enable the protected staging environment, run with `apply=true`, and confirm the `PrometheusRule` appears in the intended namespace and Grafana shows dashboard UID `hmsi-supavisor-realtime`.

Perform a synthetic queue-delay and statement-timeout exercise afterward. Confirm alerts route to the staging destination, the mutation-gate panel reflects a paused or blocked state when expected, and no secret or personal data appears in Actions logs, artifacts, alert annotations, or Grafana legends.

## Rollback

If the Grafana update fails after a backup, the workflow attempts dashboard restoration. To roll back a valid but undesirable deployment, re-run the workflow from the prior commit after review or have an authorized operator apply the previously approved `PrometheusRule` manifest. Do not delete monitoring resources as a first response, and do not use the workflow to target production.

## References

[1]: https://docs.github.com/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions "GitHub Actions: Using secrets"  
[2]: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/ "Grafana Dashboard HTTP API"  
[3]: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ "Prometheus alerting rules"  
