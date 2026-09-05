import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('security monitoring rule file has the required alerts and no sensitive metric dimensions', async () => {
  const rules = await read('deploy/monitoring/hmsi-security-event-alerts.yml');
  for (const alert of [
    'HMSIAdminOriginValidationBurst',
    'HMSIAdminOriginValidationCriticalBurst',
    'HMSIOriginValidationConfigurationRegression',
    'HMSISecurityEventWriterTimeouts',
    'HMSISecurityEventWriterCriticalFailure',
    'HMSISecurityEventWriterLatencyHigh',
  ]) assert.match(rules, new RegExp(`alert: ${alert}`));
  assert.match(rules, /for: 10m/);
  assert.match(rules, /for: 5m/);
  assert.doesNotMatch(rules, /(email|actor_ref|request_id|ip_address|user_agent|proof_url|donor|member_id|volunteer_id|origin_header)\s*=/i);
  assert.doesNotMatch(rules, /\$__|\$environment/);
});

test('Grafana dashboard is aggregate-only and does not query raw security-event rows', async () => {
  const dashboard = JSON.parse(await read('deploy/grafana/hmsi-security-events-dashboard.json'));
  assert.equal(dashboard.uid, 'hmsi-security-events');
  assert.equal(dashboard.timezone, 'utc');
  assert.equal(dashboard.refresh, '30s');
  assert.ok(dashboard.panels.length >= 8);
  const queries = dashboard.panels.flatMap((panel) => (panel.targets ?? []).map((target) => target.expr ?? '')).join('\n');
  assert.doesNotMatch(queries, /security_event_log/i);
  assert.doesNotMatch(queries, /(request_id|actor_ref|cookie|bearer|ip_address|user_agent|origin_header|donor|member_id|volunteer_id)/i);
  assert.match(queries, /hmsi_security_event_total/);
  assert.match(queries, /hmsi_security_event_write_failures_total/);
});

test('deployment script is staging-only, host-allow-listed, idempotent, and redaction-safe', async () => {
  const script = await read('scripts/deploy-security-events-monitoring.mjs');
  assert.match(script, /HMSI_DEPLOY_ENVIRONMENT !== 'staging'/);
  assert.match(script, /HMSI_STAGING_GRAFANA_ALLOWED_HOSTS/);
  assert.match(script, /overwrite: true/);
  assert.match(script, /GRAFANA_BACKUP_PATH/);
  assert.match(script, /grafana-restore/);
  assert.match(script, /prohibited sensitive dimension/);
  assert.doesNotMatch(script, /console\.log\([^)]*(?:token|password|cookie|body)/i);
});

test('GitHub workflow uses protected staging secrets and cleanup without production provisioning', async () => {
  const workflow = await read('.github/workflows/deploy-staging-security-events.yml');
  assert.match(workflow, /environment: staging-monitoring/);
  assert.match(workflow, /HMSI_STAGING_GRAFANA_API_TOKEN/);
  assert.match(workflow, /HMSI_STAGING_MONITORING_KUBECONFIG_B64/);
  assert.match(workflow, /HMSI_STAGING_MONITORING_KUBE_CONTEXT/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /kubectl apply --dry-run=server/);
  assert.match(workflow, /grafana-backup/);
  assert.match(workflow, /grafana-restore/);
  assert.match(workflow, /if: failure\(\)/);
  assert.match(workflow, /if: always\(\)/);
  assert.doesNotMatch(workflow, /HMSI_PRODUCTION|PRODUCTION_GRAFANA|PRODUCTION_KUBECONFIG/i);
});
