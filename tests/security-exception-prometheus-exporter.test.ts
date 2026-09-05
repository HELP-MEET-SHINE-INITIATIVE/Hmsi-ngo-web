import { describe, expect, it, vi } from 'vitest';
import {
  collectFromSupabase,
  collectSecurityExceptionMetrics,
  renderPrometheus,
  type AlertAttemptAggregate,
  type AlertStateAggregate,
} from '../lib/securityExceptionPrometheusExporter';

const now = new Date('2026-08-26T12:00:00.000Z');
const baseState = (overrides: Partial<AlertStateAggregate> = {}): AlertStateAggregate => ({
  id: 'state-1',
  environment: 'staging',
  delivery_status: 'failed',
  next_retry_at: '2026-08-26T11:30:00.000Z',
  last_seen_at: '2026-08-26T11:00:00.000Z',
  retention_until: '2026-09-25T12:00:00.000Z',
  ...overrides,
});

const attempt = (outcome: AlertAttemptAggregate['outcome'], stateId = 'state-1'): AlertAttemptAggregate => ({
  state_id: stateId,
  outcome,
  attempted_at: '2026-08-26T11:00:00.000Z',
});

describe('security exception Prometheus exporter', () => {
  it('emits delivery, retry, attempt, and age metrics with fixed labels only', () => {
    const metrics = collectSecurityExceptionMetrics(
      [baseState(), baseState({ id: 'state-2', delivery_status: 'pending', next_retry_at: null })],
      [attempt('sent'), attempt('timeout'), attempt('duplicate')],
      now,
    );
    const output = renderPrometheus(metrics);
    expect(output).toContain('hmsi_security_exception_alert_delivery_total{environment="staging",status="sent"} 1');
    expect(output).toContain('hmsi_security_exception_alert_delivery_total{environment="staging",status="failed"} 1');
    expect(output).toContain('hmsi_security_exception_alert_retry_queue{environment="staging",state="failed"} 1');
    expect(output).toContain('hmsi_security_exception_alert_retry_queue{environment="staging",state="pending"} 1');
    expect(output).toContain('hmsi_security_exception_alert_attempts_total{environment="staging",outcome="timeout"} 1');
    expect(output).toContain('hmsi_security_exception_alert_retry_age_seconds{environment="staging"} 3600');
    expect(output).not.toMatch(/(path|line|origin|cookie|token|request|email|webhook|actor|ip)/i);
  });

  it('excludes expired rows and ignores unknown labels/outcomes', () => {
    const metrics = collectSecurityExceptionMetrics(
      [
        baseState(),
        baseState({ id: 'expired', retention_until: '2026-08-25T12:00:00.000Z' }),
        baseState({ id: 'unsafe', environment: 'production' as never, delivery_status: 'private' as never }),
      ],
      [attempt('sent'), attempt('made_up' as never, 'unsafe')],
      now,
    );
    const output = renderPrometheus(metrics);
    expect(output).toContain('status="sent"} 1');
    expect(output).not.toContain('private');
    expect(output).not.toContain('made_up');
  });

  it('collects only bounded columns and returns sanitized database errors', async () => {
    const from = vi.fn((table: string) => {
      expect(['security_exception_alert_state', 'security_exception_alert_attempt']).toContain(table);
      return {
        select: vi.fn(() => ({
          gte: vi.fn(async () => ({ data: null, error: { message: 'secret SQL text' } })),
          in: vi.fn(),
        })),
      };
    });
    await expect(collectFromSupabase({ from } as never, now)).rejects.toEqual(
      new Error('security-exception-metrics:state-read-failed'),
    );
  });

  it('does not query attempts when no retained state exists', async () => {
    const inQuery = vi.fn();
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(async () => ({ data: [], error: null })),
        in: inQuery,
      })),
    }));
    const output = await collectFromSupabase({ from } as never, now);
    expect(output).toContain('hmsi_security_exception_alert_retry_queue');
    expect(inQuery).not.toHaveBeenCalled();
  });
});
