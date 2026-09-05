#!/usr/bin/env node
import { randomUUID } from 'node:crypto';

const command = process.argv[2] ?? 'verify';
const DASHBOARD_UID = 'hmsi-supavisor-realtime';

function fail(message) {
  throw new Error(`STAGING_MONITORING_SMOKE_TEST_REFUSED: ${message}`);
}

function requireStaging() {
  if (process.env.HMSI_DEPLOY_ENVIRONMENT !== 'staging') fail('HMSI_DEPLOY_ENVIRONMENT must equal staging.');
}

function validateUrl(name, allowedHostsName) {
  const value = process.env[name];
  if (!value) fail(`${name} is required.`);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) fail(`${name} must be a clean HTTPS origin.`);
  if (url.pathname !== '/' && url.pathname !== '') fail(`${name} must not include a path.`);
  const allowed = new Set((process.env[allowedHostsName] ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has(url.hostname.toLowerCase())) fail(`${name} host is not in ${allowedHostsName}.`);
  if (/prod(uction)?/i.test(url.hostname)) fail(`${name} host appears to target production.`);
  return url;
}

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) fail(`${url.pathname} request failed with status ${response.status}.`);
  return response;
}

function bearer(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function prometheusQuery(base, query) {
  const response = await request(new URL(`/api/v1/query?query=${encodeURIComponent(query)}`, base), { headers: bearer(process.env.PROMETHEUS_API_TOKEN) });
  const payload = await response.json();
  if (payload.status !== 'success') fail('Prometheus query did not return success.');
  return payload.data?.result ?? [];
}

async function verify() {
  requireStaging();
  const prometheus = validateUrl('PROMETHEUS_URL', 'HMSI_STAGING_PROMETHEUS_ALLOWED_HOSTS');
  const grafana = validateUrl('GRAFANA_URL', 'HMSI_STAGING_GRAFANA_ALLOWED_HOSTS');
  const alertmanager = validateUrl('ALERTMANAGER_URL', 'HMSI_STAGING_ALERTMANAGER_ALLOWED_HOSTS');

  const grafanaToken = process.env.GRAFANA_API_TOKEN;
  if (!grafanaToken) fail('GRAFANA_API_TOKEN is required.');
  await request(new URL(`/api/dashboards/uid/${DASHBOARD_UID}`, grafana), { headers: bearer(grafanaToken) });
  await request(new URL('/api/v2/status', alertmanager), { headers: bearer(process.env.ALERTMANAGER_API_TOKEN) });

  const poolCapacity = await prometheusQuery(prometheus, 'hmsi_supavisor_pool_size{environment="staging"}');
  if (poolCapacity.length === 0) fail('No staging Supavisor pool-capacity metric is queryable.');
  const gateStates = await prometheusQuery(prometheus, 'hmsi_mutation_gate_state{environment="staging",service="mutation_gate"}');
  if (gateStates.length === 0) fail('No staging mutation-gate state metric is queryable.');
  const timeoutCounter = await prometheusQuery(prometheus, 'hmsi_db_statement_timeout_total{environment="staging"}');

  console.log(JSON.stringify({
    status: 'ok',
    environment: 'staging',
    dashboardUid: DASHBOARD_UID,
    poolCapacitySeries: poolCapacity.length,
    gateStateSeries: gateStates.length,
    timeoutCounterSeries: timeoutCounter.length,
  }));
}

async function exerciseRouting() {
  requireStaging();
  const alertmanager = validateUrl('ALERTMANAGER_URL', 'HMSI_STAGING_ALERTMANAGER_ALLOWED_HOSTS');
  const sink = validateUrl('HMSI_STAGING_ALERT_SINK_URL', 'HMSI_STAGING_ALERT_SINK_ALLOWED_HOSTS');
  const alertmanagerToken = process.env.ALERTMANAGER_API_TOKEN;
  const sinkToken = process.env.HMSI_STAGING_ALERT_SINK_TOKEN;
  if (!sinkToken) fail('HMSI_STAGING_ALERT_SINK_TOKEN is required for route exercise.');
  const runId = randomUUID();
  const startsAt = new Date().toISOString();
  const endsAt = new Date(Date.now() + 120_000).toISOString();
  const alert = {
    labels: {
      alertname: 'HmsiMonitoringRoutingSmoke',
      environment: 'staging',
      service: 'mutation_gate',
      severity: 'info',
      synthetic: 'true',
      smoke_test: 'true',
      smoke_run_id: runId,
    },
    annotations: { summary: 'Synthetic staging monitoring route verification.' },
    startsAt,
    endsAt,
  };
  await request(new URL('/api/v2/alerts', alertmanager), {
    method: 'POST',
    headers: { ...bearer(alertmanagerToken), 'Content-Type': 'application/json' },
    body: JSON.stringify([alert]),
  });

  // The staging alert sink contract is a restricted test receiver. It must expose
  // GET /api/v1/events?run_id=<UUID> and return { delivered: true } only after
  // the Alertmanager route delivered this exact synthetic alert. It must not route
  // to people, production channels, or external ticket creation.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const response = await request(new URL(`/api/v1/events?run_id=${encodeURIComponent(runId)}`, sink), { headers: bearer(sinkToken) });
    const payload = await response.json();
    if (payload.delivered === true) {
      console.log(JSON.stringify({ status: 'ok', environment: 'staging', synthetic: true, routeDelivered: true }));
      return;
    }
  }
  fail('Synthetic alert was accepted but was not observed at the restricted staging alert sink within 60 seconds.');
}

const actions = { verify, 'exercise-routing': exerciseRouting };
if (!actions[command]) fail('Unsupported command.');
await actions[command]();
