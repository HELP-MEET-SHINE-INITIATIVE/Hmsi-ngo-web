#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const rulesPath = resolve(root, 'deploy/monitoring/supavisor-pool-alerts.yml');
const dashboardPath = resolve(root, 'deploy/grafana/hmsi-supavisor-realtime-dashboard.json');
const command = process.argv[2] ?? 'validate';

function fail(message) {
  throw new Error(`STAGING_MONITORING_DEPLOYMENT_REFUSED: ${message}`);
}

function requireStagingBoundary() {
  if (process.env.HMSI_DEPLOY_ENVIRONMENT !== 'staging') fail('HMSI_DEPLOY_ENVIRONMENT must equal staging.');
}

function allowedGrafanaHost() {
  const raw = process.env.HMSI_STAGING_GRAFANA_ALLOWED_HOSTS ?? '';
  return new Set(raw.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function validateGrafanaUrl() {
  const value = process.env.GRAFANA_URL;
  if (!value) fail('GRAFANA_URL is required for Grafana deployment.');
  const url = new URL(value);
  if (url.protocol !== 'https:') fail('GRAFANA_URL must use HTTPS.');
  if (url.pathname !== '/' && url.pathname !== '') fail('GRAFANA_URL must not include a path.');
  if (url.username || url.password || url.search || url.hash) fail('GRAFANA_URL must not include credentials, a query string, or a fragment.');
  const allowed = allowedGrafanaHost();
  if (!allowed.has(url.hostname.toLowerCase())) fail('GRAFANA_URL host is not in HMSI_STAGING_GRAFANA_ALLOWED_HOSTS.');
  if (/prod(uction)?/i.test(url.hostname)) fail('GRAFANA_URL host appears to target production.');
  return url;
}

async function loadArtifacts() {
  const [rules, dashboardText] = await Promise.all([readFile(rulesPath, 'utf8'), readFile(dashboardPath, 'utf8')]);
  let dashboard;
  try { dashboard = JSON.parse(dashboardText); } catch { fail('Grafana dashboard JSON is invalid.'); }
  return { rules, dashboard };
}

async function validate() {
  requireStagingBoundary();
  const { rules, dashboard } = await loadArtifacts();
  if (rules.includes('$environment')) fail('Prometheus recording rules must not include Grafana variables.');
  if (!rules.includes('HmsiSupavisorPoolSaturation') || !rules.includes('HmsiAssignmentQueryTimeoutRateHigh')) fail('Required Supavisor alerts are missing.');
  if (/(email|volunteer_id|assignment_id|proof_url|request_id|tenant)\s*=/.test(rules)) fail('Rules contain an unsafe metric label dimension.');
  if (dashboard.uid !== 'hmsi-supavisor-realtime' || !Array.isArray(dashboard.panels) || dashboard.panels.length < 8) fail('Dashboard shape or UID is unexpected.');
  if (!dashboard.panels.some((panel) => panel.title === 'Pool utilization')) fail('Pool utilization panel is missing.');
  if (!dashboard.panels.some((panel) => panel.title === 'Query timeout errors by protected route')) fail('Query timeout panel is missing.');
  console.log('STAGING_MONITORING_VALIDATION_OK');
}

async function renderPrometheusRule() {
  requireStagingBoundary();
  const { rules } = await loadArtifacts();
  if (!rules.startsWith('groups:\n')) fail('Rules file must begin with groups:.');
  const groups = rules.slice('groups:\n'.length).split('\n').map((line) => `    ${line}`).join('\n');
  const manifest = [
    'apiVersion: monitoring.coreos.com/v1',
    'kind: PrometheusRule',
    'metadata:',
    '  name: hmsi-supavisor-pool-alerts',
    '  labels:',
    '    app.kubernetes.io/name: hmsi-monitoring',
    '    app.kubernetes.io/component: supavisor-alerts',
    '    hmsi.org.ng/environment: staging',
    'spec:',
    '  groups:',
    groups,
    '',
  ].join('\n');
  const outputPath = process.env.PROMETHEUS_RULE_OUTPUT ?? resolve(root, '.tmp-hmsi-supavisor-prometheus-rule.yaml');
  await writeFile(outputPath, manifest, { mode: 0o600 });
  console.log(outputPath);
}

async function grafanaBackup() {
  requireStagingBoundary();
  const url = validateGrafanaUrl();
  const token = process.env.GRAFANA_API_TOKEN;
  if (!token) fail('GRAFANA_API_TOKEN is required for Grafana deployment.');
  const { dashboard } = await loadArtifacts();
  const response = await fetch(new URL(`/api/dashboards/uid/${dashboard.uid}`, url), { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) {
    await writeFile(process.env.GRAFANA_BACKUP_PATH, JSON.stringify({ absent: true }), { mode: 0o600 });
    return;
  }
  if (!response.ok) fail(`Grafana backup request failed with status ${response.status}.`);
  await writeFile(process.env.GRAFANA_BACKUP_PATH, await response.text(), { mode: 0o600 });
}

async function grafanaUpsert() {
  requireStagingBoundary();
  const url = validateGrafanaUrl();
  const token = process.env.GRAFANA_API_TOKEN;
  if (!token) fail('GRAFANA_API_TOKEN is required for Grafana deployment.');
  const { dashboard } = await loadArtifacts();
  const response = await fetch(new URL('/api/dashboards/db', url), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dashboard, overwrite: true, message: 'HMSI staging Supavisor monitoring update' }),
  });
  if (!response.ok) fail(`Grafana dashboard upsert failed with status ${response.status}.`);
  console.log('STAGING_GRAFANA_DASHBOARD_UPSERTED');
}

async function grafanaHealth() {
  requireStagingBoundary();
  const url = validateGrafanaUrl();
  const token = process.env.GRAFANA_API_TOKEN;
  if (!token) fail('GRAFANA_API_TOKEN is required for Grafana health verification.');
  const response = await fetch(new URL('/api/health', url), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) fail(`Grafana health verification failed with status ${response.status}.`);
  console.log('STAGING_GRAFANA_HEALTH_OK');
}

async function grafanaRestore() {
  requireStagingBoundary();
  const url = validateGrafanaUrl();
  const token = process.env.GRAFANA_API_TOKEN;
  if (!token) fail('GRAFANA_API_TOKEN is required for Grafana restoration.');
  const backup = JSON.parse(await readFile(process.env.GRAFANA_BACKUP_PATH, 'utf8'));
  if (backup.absent) return;
  const response = await fetch(new URL('/api/dashboards/db', url), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dashboard: backup.dashboard, folderId: backup.meta?.folderId ?? 0, overwrite: true, message: 'Rollback HMSI staging Supavisor monitoring update' }),
  });
  if (!response.ok) fail(`Grafana dashboard restore failed with status ${response.status}.`);
  console.log('STAGING_GRAFANA_DASHBOARD_RESTORED');
}

const actions = { validate, 'render-prometheus-rule': renderPrometheusRule, 'grafana-backup': grafanaBackup, 'grafana-upsert': grafanaUpsert, 'grafana-health': grafanaHealth, 'grafana-restore': grafanaRestore };
if (!actions[command]) fail('Unsupported command.');
await actions[command]();
