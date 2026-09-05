# HMSI Staging Monitoring Post-Deployment Smoke Test

## Purpose

The post-deployment smoke test confirms that the staging monitoring plane can answer the questions that matter immediately after a Prometheus rule or Grafana dashboard update: is the dashboard present, are the normalized Supavisor metrics queryable, is the mutation-gate state visible, is Alertmanager reachable, and—when the restricted test sink is enabled—does a synthetic alert follow the expected staging-only route?

The smoke test does not create volunteer assignments, proof links, webhook deliveries, database connections, Redis keys, Jira issues, or production alerts. It uses only a short-lived synthetic Alertmanager alert when the explicit route-exercise mode is enabled.

## Commands

Run the passive verification after the workflow deploys the configuration:

```bash
HMSI_DEPLOY_ENVIRONMENT=staging \
PROMETHEUS_URL=https://<staging-prometheus-host> \
HMSI_STAGING_PROMETHEUS_ALLOWED_HOSTS=<staging-prometheus-host> \
GRAFANA_URL=https://<staging-grafana-host> \
HMSI_STAGING_GRAFANA_ALLOWED_HOSTS=<staging-grafana-host> \
ALERTMANAGER_URL=https://<staging-alertmanager-host> \
HMSI_STAGING_ALERTMANAGER_ALLOWED_HOSTS=<staging-alertmanager-host> \
GRAFANA_API_TOKEN=<secret> \
node scripts/smoke-test-staging-monitoring.mjs verify
```

The route exercise is opt-in and requires a restricted staging alert sink:

```bash
HMSI_DEPLOY_ENVIRONMENT=staging \
ALERTMANAGER_URL=https://<staging-alertmanager-host> \
HMSI_STAGING_ALERTMANAGER_ALLOWED_HOSTS=<staging-alertmanager-host> \
HMSI_STAGING_ALERT_SINK_URL=https://<staging-alert-sink-host> \
HMSI_STAGING_ALERT_SINK_ALLOWED_HOSTS=<staging-alert-sink-host> \
HMSI_STAGING_ALERT_SINK_TOKEN=<secret> \
node scripts/smoke-test-staging-monitoring.mjs exercise-routing
```

Use GitHub environment secrets and variables instead of inserting literal values into shell history. The GitHub Actions workflow runs these modes only when the corresponding staging variables are explicitly set to `true`.

## Required staging receiver contract

The route test posts one alert named `HmsiMonitoringRoutingSmoke` to Alertmanager with fixed labels `environment=staging`, `synthetic=true`, and `smoke_test=true`, plus a random `smoke_run_id`. Alertmanager must route this label combination only to a restricted staging capture receiver.

The capture receiver must expose `GET /api/v1/events?run_id=<UUID>` and return JSON `{ "delivered": true }` only after it has received the exact synthetic alert. The receiver must not forward alerts to people, email, SMS, chat, Jira, incident paging, or any production system. It may retain a bounded event receipt for up to ten minutes and must not log tokens, source IPs, or alert annotations beyond the fixed synthetic summary.

## Verification criteria

| Check | Expected result |
|---|---|
| Grafana dashboard API | Dashboard UID `hmsi-supavisor-realtime` returns successfully |
| Prometheus Supavisor capacity | At least one `hmsi_supavisor_pool_size{environment="staging"}` series is present |
| Prometheus mutation gate | At least one `hmsi_mutation_gate_state{environment="staging",service="mutation_gate"}` series is present |
| Prometheus timeout metric | Counter query completes; zero series is allowed immediately after deployment |
| Alertmanager status | Staging Alertmanager API returns successfully |
| Route exercise | Restricted sink confirms delivery of the exact short-lived synthetic alert within 60 seconds |

## Failure response

If dashboard, metric, or Alertmanager verification fails, leave the mutation gate in its existing safe state, do not increase traffic, and inspect the monitoring configuration, target allowlist, authentication scope, and metric adapter. If the routing exercise fails, do not repeat it blindly; inspect the restricted test receiver and Alertmanager route for the exact synthetic labels before issuing a new alert.

The helper rejects non-staging environments, non-HTTPS URLs, URLs containing paths/credentials/query strings/fragments, hosts absent from explicit staging allowlists, and hostnames that appear to target production.

## References

[1]: https://prometheus.io/docs/prometheus/latest/querying/api/ "Prometheus HTTP API"  
[2]: https://prometheus.io/docs/alerting/latest/alertmanager/ "Prometheus Alertmanager"  
[3]: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/ "Grafana Dashboard HTTP API"  
