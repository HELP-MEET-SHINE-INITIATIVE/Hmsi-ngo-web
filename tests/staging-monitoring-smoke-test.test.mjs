import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const helperPath = new URL('../scripts/smoke-test-staging-monitoring.mjs', import.meta.url);
const workflowPath = new URL('../.github/workflows/deploy-staging-monitoring.yml', import.meta.url);

test('smoke helper verifies Grafana, Prometheus, Alertmanager, and normalized staging metrics', async () => {
  const helper = await readFile(helperPath, 'utf8');
  for (const required of [
    'hmsi-supavisor-realtime',
    'hmsi_supavisor_pool_size{environment="staging"}',
    'hmsi_mutation_gate_state{environment="staging",service="mutation_gate"}',
    'hmsi_db_statement_timeout_total{environment="staging"}',
    '/api/v2/status',
    '/api/dashboards/uid/',
  ]) assert.equal(helper.includes(required), true, `missing smoke-test check: ${required}`);
});

test('smoke helper is staging-only and rejects unsafe target URL patterns', async () => {
  const helper = await readFile(helperPath, 'utf8');
  assert.equal(helper.includes("process.env.HMSI_DEPLOY_ENVIRONMENT !== 'staging'"), true);
  assert.equal(helper.includes("url.protocol !== 'https:'"), true);
  assert.equal(helper.includes('allowedHostsName'), true);
  assert.equal(helper.includes("/prod(uction)?/i.test(url.hostname)"), true);
});

test('routing exercise uses a short-lived synthetic alert and restricted staging sink only', async () => {
  const helper = await readFile(helperPath, 'utf8');
  assert.equal(helper.includes("alertname: 'HmsiMonitoringRoutingSmoke'"), true);
  assert.equal(helper.includes("synthetic: 'true'"), true);
  assert.equal(helper.includes("smoke_test: 'true'"), true);
  assert.equal(helper.includes('HMSI_STAGING_ALERT_SINK_URL'), true);
  assert.equal(helper.includes('within 60 seconds'), true);
});

test('workflow runs smoke modes only when explicit staging variables enable them', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.equal(workflow.includes("vars.HMSI_STAGING_MONITORING_SMOKE_TEST_ENABLED == 'true'"), true);
  assert.equal(workflow.includes("vars.HMSI_STAGING_MONITORING_ROUTE_SMOKE_TEST_ENABLED == 'true'"), true);
  assert.equal(workflow.includes('smoke-test-staging-monitoring.mjs verify'), true);
  assert.equal(workflow.includes('smoke-test-staging-monitoring.mjs exercise-routing'), true);
});
