import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowPath = new URL('../.github/workflows/deploy-staging-monitoring.yml', import.meta.url);
const helperPath = new URL('../scripts/deploy-staging-monitoring.mjs', import.meta.url);

test('staging monitoring workflow has validation, protected environment, and deployment serialization', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.equal(workflow.includes('name: Deploy Staging Monitoring Configuration'), true);
  assert.equal(workflow.includes('environment: staging-monitoring'), true);
  assert.equal(workflow.includes('group: hmsi-staging-monitoring'), true);
  assert.equal(workflow.includes('node --test tests/supavisor-dashboard-config.test.mjs'), true);
  assert.equal(workflow.includes('promtool check rules'), true);
  assert.equal(workflow.includes('kubectl apply --dry-run=server'), true);
});

test('workflow references staging-scoped secret and variable names only', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  for (const required of [
    'HMSI_STAGING_GRAFANA_API_TOKEN',
    'HMSI_STAGING_MONITORING_KUBECONFIG_B64',
    'HMSI_STAGING_GRAFANA_URL',
    'HMSI_STAGING_GRAFANA_ALLOWED_HOSTS',
  ]) assert.equal(workflow.includes(required), true, `missing staging configuration: ${required}`);
  assert.equal(workflow.includes('PRODUCTION'), false);
  assert.equal(workflow.includes('HMSI_PROD'), false);
});

test('helper refuses non-staging environment and enforces Grafana host allowlisting', async () => {
  const helper = await readFile(helperPath, 'utf8');
  assert.equal(helper.includes("process.env.HMSI_DEPLOY_ENVIRONMENT !== 'staging'"), true);
  assert.equal(helper.includes('HMSI_STAGING_GRAFANA_ALLOWED_HOSTS'), true);
  assert.equal(helper.includes("url.protocol !== 'https:'"), true);
  assert.equal(helper.includes("/prod(uction)?/i.test(url.hostname)"), true);
});

test('workflow retains Grafana backup, failure rollback, and credential cleanup steps', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.equal(workflow.includes('Back up current staging Grafana dashboard'), true);
  assert.equal(workflow.includes('if: failure()'), true);
  assert.equal(workflow.includes('grafana-restore'), true);
  assert.equal(workflow.includes('Remove local credentials and backup artifact'), true);
});
