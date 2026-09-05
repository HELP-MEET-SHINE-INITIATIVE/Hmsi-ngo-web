#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const rulesPath = resolve(root, 'deploy/monitoring/hmsi-security-event-alerts.yml');
const dashboardPath = resolve(root, 'deploy/grafana/hmsi-security-events-dashboard.json');
const command = process.argv[2] ?? 'validate';

function fail(message) {
  throw new Error(`HMSI_SECURITY_MONITORING_DEPLOYMENT_REFUSED: ${message}`);
}

function requireStagingBoundary() {
  if (process.env.HMSI_DEPLOY_ENVIRONMENT !== 'staging') {
    fail('HMSI_DEPLOY_ENVIRONMENT must equal staging.');
  }
}

function allowedHosts(name) {
  return new Set((process.env[name] ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function validateHttpsUrl(value, allowed, label) {
  if (!value) fail(`${label} is required.`);
  let url;
  try { url = new URL(value); } catch { fail(`${label} must be a valid URL.`); }
  if (url.protocol !== 'https:') fail(`${label} must use HTTPS.`);
  if (url.pathname !== '/' && url.pathname !== '') fail(`${label} must not include a path.`);
  if (url.username || url.password || url.search || url.hash) fail(`${label} must not include credentials, query strings, or fragments.`);
  if (!allowed.has(url.hostname.toLowerCase())) fail(`${label} host is not allow-listed.`);
  if (/prod(uction)?/i.test(url.hostname)) fail(`${label} host appears to target production.`);
  return url;
}

function grafanaUrl() {
  return validateHttpsUrl(process.env.GRAFANA_URL, allowedHosts('HMSI_STAGING_GRAFANA_ALLOWED_HOSTS'), 'GRAFANA_URL');
}

async function loadArtifacts() {
  const [rules, dashboardText] = await Promise.all([
    readFile(rulesPath, 'utf8'),
    readFile(dashboardPath, 'utf8'),
  ]);
  let dashboard;
  try { dashboard = JSON.parse(dashboardText); } catch { fail('Grafana dashboard JSON is invalid.'); }
  return { rules, dashboard };
}

function validateLabelsAndQueries(rules, dashboard) {
  const prohibited = /(email|volunteer_id|assignment_id|proof_url|request_id|actor_ref|ip_address|user_agent|origin_header|tenant)\s*[=:{]/i;
  const queries = (dashboard.panels ?? []).flatMap((panel) => (panel.targets ?? []).map((target) => target.expr ?? '')).join('\n');
  if (prohibited.test(rules) || prohibited.test(queries)) {
    fail('Monitoring artifacts contain a prohibited sensitive dimension.');
  }
  if (!rules.startsWith('groups:\n')) fail('Prometheus rules must begin with groups:.');
  for (const required of [
    'HMSIAdminOriginValidationBurst',
    'HMSIAdminOriginValidationCriticalBurst',
    'HMSISecurityEventWriterTimeouts',
    'HMSISecurityEventWriterCriticalFailure',
    'HMSISecurityEventWriterLatencyHigh',
  ]) {
    if (!rules.includes(required)) fail(`Required alert ${required} is missing.`);
  }
  if (dashboard.uid !== 'hmsi-security-events' || !Array.isArray(dashboard.panels) || dashboard.panels.length < 8) {
    fail('Security-event dashboard shape or UID is unexpected.');
  }
  if (queries.includes('security_event_log')) fail('Dashboard must not query raw security-event rows.');
}

async function validate() {
  requireStagingBoundary();
  const { rules, dashboard } = await loadArtifacts();
  validateLabelsAndQueries(rules, dashboard);
  console.log('HMSI_SECURITY_MONITORING_VALIDATION_OK');
}

async function renderPrometheusRule() {
  requireStagingBoundary();
  const { rules, dashboard } = await loadArtifacts();
  validateLabelsAndQueries(rules, dashboard);
  const indented = rules.slice('groups:\n'.length).split('\n').map((line) => `    ${line}`).join('\n');
  const manifest = [
    'apiVersion: monitoring.coreos.com/v1',
    'kind: PrometheusRule',
    'metadata:',
    '  name: hmsi-security-event-alerts',
    '  labels:',
    '    app.kubernetes.io/name: hmsi-monitoring',
    '    app.kubernetes.io/component: security-event-alerts',
    '    hmsi.org.ng/environment: staging',
    'spec:',
    '  groups:',
    indented,
    '',
  ].join('\n');
  const outputPath = process.env.PROMETHEUS_RULE_OUTPUT ?? resolve(root, '.tmp-hmsi-security-event-alerts.yaml');
  await writeFile(outputPath, manifest, { mode: 0o600 });
  console.log(outputPath);
}

function requireToken(name) {
  if (!process.env[name]) fail(`${name} is required.`);
  return process.env[name];
}

async function grafanaBackup() {
  requireStagingBoundary();
  const url = grafanaUrl();
  const token = requireToken('GRAFANA_API_TOKEN');
  const { dashboard } = await loadArtifacts();
  const response = await fetch(new URL(`/api/dashboards/uid/${dashboard.uid}`, url), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) {
    await writeFile(process.env.GRAFANA_BACKUP_PATH, JSON.stringify({ absent: true }), { mode: 0o600 });
    return;
  }
  if (!response.ok) fail(`Grafana backup request failed with status ${response.status}.`);
  await writeFile(process.env.GRAFANA_BACKUP_PATH, await response.text(), { mode: 0o600 });
}

async function grafanaUpsert() {
  requireStagingBoundary();
  const url = grafanaUrl();
  const token = requireToken('GRAFANA_API_TOKEN');
  const { dashboard } = await loadArtifacts();
  const response = await fetch(new URL('/api/dashboards/db', url), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dashboard, overwrite: true, message: 'HMSI staging security-event monitoring update' }),
  });
  if (!response.ok) fail(`Grafana dashboard upsert failed with status ${response.status}.`);
  console.log('HMSI_SECURITY_EVENT_DASHBOARD_UPSERTED');
}

async function grafanaHealth() {
  requireStagingBoundary();
  const url = grafanaUrl();
  const token = requireToken('GRAFANA_API_TOKEN');
  const response = await fetch(new URL('/api/health', url), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) fail(`Grafana health verification failed with status ${response.status}.`);
  console.log('HMSI_GRAFANA_HEALTH_OK');
}

async function grafanaRestore() {
  requireStagingBoundary();
  const url = grafanaUrl();
  const token = requireToken('GRAFANA_API_TOKEN');
  const backup = JSON.parse(await readFile(process.env.GRAFANA_BACKUP_PATH, 'utf8'));
  if (backup.absent) return;
  const response = await fetch(new URL('/api/dashboards/db', url), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dashboard: backup.dashboard, folderId: backup.meta?.folderId ?? 0, overwrite: true, message: 'Rollback HMSI staging security-event monitoring update' }),
  });
  if (!response.ok) fail(`Grafana dashboard restore failed with status ${response.status}.`);
  console.log('HMSI_SECURITY_EVENT_DASHBOARD_RESTORED');
}

const actions = { validate, 'render-prometheus-rule': renderPrometheusRule, 'grafana-backup': grafanaBackup, 'grafana-upsert': grafanaUpsert, 'grafana-health': grafanaHealth, 'grafana-restore': grafanaRestore };
if (!actions[command]) fail('Unsupported command.');
await actions[command]();
