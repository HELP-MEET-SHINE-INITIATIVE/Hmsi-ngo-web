import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabaseAdmin';

export type SecurityExceptionEnvironment = 'staging' | 'production';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'suppressed';
export type AttemptOutcome = 'claimed' | 'sent' | 'duplicate' | 'timeout' | 'unavailable' | 'rejected' | 'invalid';

export type AlertStateAggregate = {
  id: string;
  environment: SecurityExceptionEnvironment;
  delivery_status: DeliveryStatus;
  next_retry_at: string | null;
  last_seen_at: string;
  retention_until: string;
};

export type AlertAttemptAggregate = {
  state_id: string;
  outcome: AttemptOutcome;
  attempted_at: string;
};

export type SecurityExceptionMetric = {
  name: string;
  help: string;
  type: 'gauge' | 'counter';
  labels: Record<string, string>;
  value: number;
};

type RpcSafeClient = Pick<SupabaseClient, 'from'>;

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message?: string } | null }>;
type SelectQuery<T> = {
  select: (columns: string) => SelectQuery<T>;
  gte: (column: string, value: string) => QueryResult<T>;
  in: (column: string, values: string[]) => QueryResult<T>;
};

type TableClient = {
  from: (table: string) => SelectQuery<unknown>;
};

const ENVIRONMENTS = new Set<SecurityExceptionEnvironment>(['staging', 'production']);
const STATUSES = new Set<DeliveryStatus>(['pending', 'sent', 'failed', 'suppressed']);
const OUTCOMES = new Set<AttemptOutcome>(['claimed', 'sent', 'duplicate', 'timeout', 'unavailable', 'rejected', 'invalid']);
const SAFE_LABEL = /^[a-z][a-z0-9_]{0,31}$/;
const SAFE_METRIC_NAME = /^[a-z][a-z0-9_:]{0,199}$/;

function label(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll('"', '\\"');
}

function fixedEnvironment(value: unknown): SecurityExceptionEnvironment | null {
  return typeof value === 'string' && ENVIRONMENTS.has(value as SecurityExceptionEnvironment)
    ? (value as SecurityExceptionEnvironment)
    : null;
}

function fixedStatus(value: unknown): DeliveryStatus | null {
  return typeof value === 'string' && STATUSES.has(value as DeliveryStatus) ? (value as DeliveryStatus) : null;
}

function fixedOutcome(value: unknown): AttemptOutcome | null {
  return typeof value === 'string' && OUTCOMES.has(value as AttemptOutcome) ? (value as AttemptOutcome) : null;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function collectSecurityExceptionMetrics(
  states: readonly AlertStateAggregate[],
  attempts: readonly AlertAttemptAggregate[],
  now: Date = new Date(),
): SecurityExceptionMetric[] {
  const nowMs = now.getTime();
  const activeStates = states.filter((state) => {
    const environment = fixedEnvironment(state.environment);
    const retentionMs = Date.parse(state.retention_until);
    return Boolean(environment) && Number.isFinite(retentionMs) && retentionMs > nowMs;
  });
  const allowedIds = new Set(activeStates.map((state) => state.id));
  const activeAttempts = attempts.filter((attempt) => {
    const outcome = fixedOutcome(attempt.outcome);
    return Boolean(outcome) && allowedIds.has(attempt.state_id) && Number.isFinite(Date.parse(attempt.attempted_at));
  });
  const metrics: SecurityExceptionMetric[] = [];
  const environments: SecurityExceptionEnvironment[] = ['staging', 'production'];
  const statuses: DeliveryStatus[] = ['pending', 'sent', 'failed', 'suppressed'];
  const outcomes: AttemptOutcome[] = ['claimed', 'sent', 'duplicate', 'timeout', 'unavailable', 'rejected', 'invalid'];

  for (const environment of environments) {
    for (const status of statuses) {
      metrics.push({
        name: 'hmsi_security_exception_alert_retry_queue',
        help: 'Current retryable security-exception alert state count.',
        type: 'gauge',
        labels: { environment, state: status },
        value: status === 'pending' || status === 'failed'
          ? activeStates.filter((state) => state.environment === environment && state.delivery_status === status).length
          : 0,
      });
    }

    for (const status of ['sent', 'failed'] as const) {
      const count = status === 'sent'
        ? activeAttempts.filter((attempt) => attempt.outcome === 'sent' && activeStates.find((state) => state.id === attempt.state_id)?.environment === environment).length
        : activeAttempts.filter((attempt) => ['timeout', 'unavailable', 'rejected', 'invalid'].includes(attempt.outcome) && activeStates.find((state) => state.id === attempt.state_id)?.environment === environment).length;
      metrics.push({
        name: 'hmsi_security_exception_alert_delivery_total',
        help: 'Recorded security-exception alert delivery outcomes within retention.',
        type: 'counter',
        labels: { environment, status },
        value: count,
      });
    }

    for (const outcome of outcomes) {
      const count = activeAttempts.filter((attempt) => {
        const state = activeStates.find((candidate) => candidate.id === attempt.state_id);
        return state?.environment === environment && attempt.outcome === outcome;
      }).length;
      metrics.push({
        name: 'hmsi_security_exception_alert_attempts_total',
        help: 'Recorded security-exception alert attempt outcomes within retention.',
        type: 'counter',
        labels: { environment, outcome },
        value: count,
      });
    }

    const retryable = activeStates.filter((state) => state.environment === environment && (state.delivery_status === 'pending' || state.delivery_status === 'failed'));
    const ages = retryable.map((state) => {
      const retryAt = state.next_retry_at ? Date.parse(state.next_retry_at) : Date.parse(state.last_seen_at);
      return Number.isFinite(retryAt) ? Math.max(0, (nowMs - retryAt) / 1000) : 0;
    });
    metrics.push({
      name: 'hmsi_security_exception_alert_retry_age_seconds',
      help: 'Age in seconds of the oldest retryable security-exception alert state.',
      type: 'gauge',
      labels: { environment },
      value: finiteNonNegative(Math.max(0, ...ages)),
    });
  }

  return metrics;
}

export function renderPrometheus(metrics: readonly SecurityExceptionMetric[]): string {
  const groups = new Map<string, SecurityExceptionMetric[]>();
  for (const metric of metrics) {
    if (!SAFE_METRIC_NAME.test(metric.name)) continue;
    const current = groups.get(metric.name) ?? [];
    current.push(metric);
    groups.set(metric.name, current);
  }
  const lines: string[] = [];
  for (const [name, group] of groups) {
    lines.push(`# HELP ${name} ${group[0].help}`);
    lines.push(`# TYPE ${name} ${group[0].type}`);
    for (const metric of group) {
      const labels = Object.entries(metric.labels)
        .filter(([key, value]) => SAFE_LABEL.test(key) && SAFE_LABEL.test(value))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}="${label(value)}"`)
        .join(',');
      lines.push(`${name}${labels ? `{${labels}}` : ''} ${finiteNonNegative(metric.value)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export async function collectFromSupabase(
  client: RpcSafeClient | null = getSupabaseAdmin(),
  now: Date = new Date(),
): Promise<string> {
  if (!client) throw new Error('security-exception-metrics:database-unavailable');
  const table = client as unknown as TableClient;
  const nowIso = now.toISOString();
  const stateQuery = table.from('security_exception_alert_state').select('id,environment,delivery_status,next_retry_at,last_seen_at,retention_until');
  const stateResult = await stateQuery.gte('retention_until', nowIso);
  if (stateResult.error) throw new Error('security-exception-metrics:state-read-failed');
  const states = (stateResult.data ?? []) as AlertStateAggregate[];
  const ids = states.map((state) => state.id);
  let attempts: AlertAttemptAggregate[] = [];
  if (ids.length > 0) {
    const attemptResult = await table.from('security_exception_alert_attempt').select('state_id,outcome,attempted_at').in('state_id', ids);
    if (attemptResult.error) throw new Error('security-exception-metrics:attempt-read-failed');
    attempts = (attemptResult.data ?? []) as AlertAttemptAggregate[];
  }
  return renderPrometheus(collectSecurityExceptionMetrics(states, attempts, now));
}
