import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dashboardPath = new URL('../deploy/grafana/hmsi-supavisor-realtime-dashboard.json', import.meta.url);
const rulesPath = new URL('../deploy/monitoring/supavisor-pool-alerts.yml', import.meta.url);

test('Supavisor dashboard JSON is valid and contains the required real-time safety panels', async () => {
  const dashboard = JSON.parse(await readFile(dashboardPath, 'utf8'));
  assert.equal(dashboard.uid, 'hmsi-supavisor-realtime');
  assert.equal(dashboard.refresh, '10s');
  assert.ok(dashboard.panels.some((panel) => panel.title === 'Pool utilization'));
  assert.ok(dashboard.panels.some((panel) => panel.title === 'p95 checkout queue wait'));
  assert.ok(dashboard.panels.some((panel) => panel.title === 'Query timeout errors by protected route'));
  assert.ok(dashboard.panels.some((panel) => panel.title === 'Fail-closed mutation-gate state'));
});

test('Prometheus rules do not contain Grafana variables or sensitive dimensions', async () => {
  const rules = await readFile(rulesPath, 'utf8');
  assert.equal(rules.includes('$environment'), false);
  for (const forbidden of ['email', 'volunteer_id', 'assignment_id', 'proof_url', 'request_id', 'tenant', 'query']) {
    assert.equal(rules.includes(`{${forbidden}=`), false, `forbidden metric label: ${forbidden}`);
  }
});

test('Supavisor rules define utilization, queue latency, timeout, and metrics-absence protections', async () => {
  const rules = await readFile(rulesPath, 'utf8');
  for (const required of [
    'hmsi:supavisor_pool_utilization_ratio',
    'hmsi:supavisor_checkout_queue_latency_p95_seconds',
    'hmsi:supavisor_checkout_queue_latency_p99_seconds',
    'hmsi:db_statement_timeout_rate_ratio',
    'HmsiSupavisorPoolSaturation',
    'HmsiSupavisorCheckoutQueueLatencyCritical',
    'HmsiAssignmentQueryTimeoutRateHigh',
    'HmsiSupavisorMetricsAbsent',
  ]) {
    assert.equal(rules.includes(required), true, `missing required rule or alert: ${required}`);
  }
});
