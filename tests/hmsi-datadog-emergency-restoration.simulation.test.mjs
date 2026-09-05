import assert from 'node:assert/strict';
import { test } from 'node:test';

const SENSITIVE_KEYS = new Set([
  'articleBody', 'headline', 'excerpt', 'contributorName', 'email', 'phone',
  'sessionToken', 'accessToken', 'safeguardingNarrative', 'preciseLocation', 'rawArticleId',
]);

function scrub(value, key = '') {
  if (SENSITIVE_KEYS.has(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => scrub(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, scrub(entryValue, entryKey)]));
  }
  return value;
}

function projectMetric(event) {
  const metric = {
    service: 'hmsi-news-api',
    env: event.env,
    component: event.component,
    eventType: event.eventType,
    eventAction: event.eventAction,
    decision: event.decision,
    reasonCode: event.reasonCode,
    actorRole: event.actorRole,
    articleKey: event.articleKey,
    correlationId: event.correlationId,
    auditEventId: event.auditEventId,
  };
  return scrub(metric);
}

function evaluateMonitors(metrics) {
  const count = (predicate) => metrics.filter(predicate).length;
  const alerts = [];
  if (count((m) => m.metric === 'public_boundary_violations') > 0) {
    alerts.push({ id: 'DDM-RESTORE-001', severity: 'critical', reason: 'private_news_public_boundary_violation' });
  }
  if (count((m) => m.metric === 'audit_failures') > 0) {
    alerts.push({ id: 'DDM-RESTORE-002', severity: 'critical', reason: 'audit_write_failure' });
  }
  if (count((m) => m.metric === 'conflicts') >= 3) {
    alerts.push({ id: 'DDM-RESTORE-004', severity: 'high', reason: 'conflict_spike' });
  }
  if (count((m) => m.metric === 'unauthorized') >= 5) {
    alerts.push({ id: 'DDM-RESTORE-005', severity: 'high', reason: 'unauthorized_attempt_spike' });
  }
  return alerts;
}

function alertPayload(alert, source) {
  return scrub({
    monitorId: alert.id,
    severity: alert.severity,
    reason: alert.reason,
    env: source.env,
    service: source.service,
    correlationId: source.correlationId,
    auditEventId: source.auditEventId,
    headline: source.headline,
    articleBody: source.articleBody,
    contributorName: source.contributorName,
    email: source.email,
    sessionToken: source.sessionToken,
  });
}

function containsSensitiveLeak(value) {
  const serialized = JSON.stringify(value);
  return ['Private safeguarding narrative', 'Do Not Index Headline', 'volunteer@example.test', 'secret-session-token'].some((needle) => serialized.includes(needle));
}

function simulation({ kind, source }) {
  const base = {
    env: 'staging',
    service: 'hmsi-news-api',
    component: 'news-restoration',
    eventType: 'news_restoration',
    eventAction: 'rejected',
    decision: 'blocked',
    actorRole: 'admin',
    reasonCode: kind,
    articleKey: 'hmac:synthetic-article-key',
    correlationId: `corr-${kind}`,
    auditEventId: `audit-${kind}`,
    ...source,
  };
  const scrubbedEvent = scrub(base);
  const metricName = kind === 'restore_conflict' ? 'conflicts' : kind === 'audit_write_failed' ? 'audit_failures' : kind === 'public_boundary_violation' ? 'public_boundary_violations' : 'unauthorized';
  const metric = { ...projectMetric(base), metric: metricName };
  const alerts = evaluateMonitors([metric]);
  return { event: scrubbedEvent, metrics: [metric], alerts: alerts.map((alert) => alertPayload(alert, scrubbedEvent)) };
}

test('critical audit failure triggers an alert without sensitive payloads', () => {
  const result = simulation({ kind: 'audit_write_failed', source: { articleBody: 'Private safeguarding narrative', email: 'volunteer@example.test', sessionToken: 'secret-session-token' } });
  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].monitorId, 'DDM-RESTORE-002');
  assert.equal(result.alerts[0].severity, 'critical');
  assert.equal(result.alerts[0].articleBody, '[REDACTED]');
  assert.equal(result.alerts[0].email, '[REDACTED]');
  assert.equal(result.alerts[0].sessionToken, '[REDACTED]');
  assert.equal(containsSensitiveLeak(result.alerts), false);
});

test('a restoration conflict is recorded but does not page until the spike threshold is reached', () => {
  const one = simulation({ kind: 'restore_conflict', source: { headline: 'Do Not Index Headline' } });
  assert.equal(one.alerts.length, 0);
  assert.equal(one.metrics[0].reasonCode, 'restore_conflict');
  assert.equal(one.event.headline, '[REDACTED]');
  assert.equal(containsSensitiveLeak(one), false);
});

test('three conflict events trigger the high-severity conflict monitor', () => {
  const metrics = ['a', 'b', 'c'].map((id) => ({
    metric: 'conflicts', env: 'production', service: 'hmsi-news-api', component: 'news-restoration',
    eventType: 'news_restoration', eventAction: 'conflict', decision: 'blocked', reasonCode: 'restore_conflict',
    actorRole: 'admin', articleKey: `hmac:${id}`, correlationId: `corr-${id}`, auditEventId: `audit-${id}`,
  }));
  const alerts = evaluateMonitors(metrics);
  assert.deepEqual(alerts, [{ id: 'DDM-RESTORE-004', severity: 'high', reason: 'conflict_spike' }]);
});

test('public-boundary violation triggers immediate critical alert', () => {
  const result = simulation({ kind: 'public_boundary_violation', source: { contributorName: 'Sensitive Synthetic Contributor', preciseLocation: 'Exact synthetic coordinates' } });
  assert.equal(result.alerts[0].monitorId, 'DDM-RESTORE-001');
  assert.equal(result.alerts[0].severity, 'critical');
  assert.equal(result.event.contributorName, '[REDACTED]');
  assert.equal(containsSensitiveLeak(result), false);
});

test('five unauthorized attempts trigger the security monitor with bounded fields only', () => {
  const metrics = Array.from({ length: 5 }, (_, index) => ({
    metric: 'unauthorized', env: 'production', service: 'hmsi-news-api', component: 'news-restoration',
    eventType: 'news_restoration', eventAction: 'rejected', decision: 'denied', reasonCode: 'admin_authentication_required',
    actorRole: 'non_admin', articleKey: `hmac:unauthorized-${index}`, correlationId: `corr-${index}`, auditEventId: `audit-${index}`,
  }));
  const alerts = evaluateMonitors(metrics);
  assert.deepEqual(alerts, [{ id: 'DDM-RESTORE-005', severity: 'high', reason: 'unauthorized_attempt_spike' }]);
  assert.equal(containsSensitiveLeak(alerts), false);
});

test('scrubber redacts nested sensitive fields before log and alert projection', () => {
  const input = { safe: 'keep', nested: { email: 'hidden@example.test', body: 'safe key not configured' }, articleBody: 'confidential' };
  const result = scrub(input);
  assert.equal(result.safe, 'keep');
  assert.equal(result.nested.email, '[REDACTED]');
  assert.equal(result.articleBody, '[REDACTED]');
  assert.equal(JSON.stringify(result).includes('hidden@example.test'), false);
});
