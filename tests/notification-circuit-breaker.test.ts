import { describe, expect, it } from 'vitest';
import {
  CircuitBreaker,
  CircuitOpenError,
  NotificationCircuitRegistry,
  ProviderTransportError,
} from '../lib/notificationCircuitBreaker';

describe('notification circuit breaker', () => {
  it('opens after the configured consecutive failure threshold and returns circuit_open without calling the provider', async () => {
    let calls = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 2, openMs: 30_000, maxTimeoutMs: 5_000, now: () => 1_000 });
    const registry = new NotificationCircuitRegistry({ failureThreshold: 2, openMs: 30_000, maxTimeoutMs: 5_000, now: () => 1_000 });
    const operation = async () => {
      calls += 1;
      throw new ProviderTransportError('server_error');
    };

    await expect(breaker.execute(operation)).rejects.toBeInstanceOf(ProviderTransportError);
    await expect(breaker.execute(operation)).rejects.toBeInstanceOf(ProviderTransportError);
    await expect(breaker.execute(operation)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(calls).toBe(2);

    const result = await registry.deliver('slack', operation);
    expect(result).toMatchObject({ ok: false, code: 'server_error', provider: 'slack' });
  });

  it('converts a hanging provider operation into timeout without rejecting the delivery wrapper', async () => {
    const registry = new NotificationCircuitRegistry({ failureThreshold: 3, openMs: 30_000, maxTimeoutMs: 20 });
    const result = await registry.deliver('pagerduty', () => new Promise<void>(() => undefined), { timeoutMs: 5 });
    expect(result).toMatchObject({ ok: false, provider: 'pagerduty', code: 'timeout' });
  });

  it('allows one half-open probe after the open window and closes on success', async () => {
    let now = 1_000;
    let calls = 0;
    const registry = new NotificationCircuitRegistry({ failureThreshold: 1, openMs: 100, maxTimeoutMs: 5_000, now: () => now });
    const fail = () => {
      calls += 1;
      return Promise.reject(new ProviderTransportError('network_error'));
    };
    const succeed = () => {
      calls += 1;
      return Promise.resolve();
    };

    await expect(registry.deliver('slack', fail)).resolves.toMatchObject({ code: 'network_error' });
    await expect(registry.deliver('slack', fail)).resolves.toMatchObject({ code: 'circuit_open' });
    now = 1_101;
    await expect(registry.deliver('slack', succeed)).resolves.toMatchObject({ ok: true });
    expect(registry.state('slack')).toBe('closed');
    expect(calls).toBe(2);
  });

  it('isolates Slack and PagerDuty circuits', async () => {
    const registry = new NotificationCircuitRegistry({ failureThreshold: 1, openMs: 30_000, maxTimeoutMs: 5_000, now: () => 1_000 });
    const fail = () => Promise.reject(new ProviderTransportError('rate_limited', 1_200));
    const success = () => Promise.resolve();

    await expect(registry.deliver('slack', fail)).resolves.toMatchObject({ provider: 'slack', code: 'rate_limited', retryAfterMs: 1_200 });
    await expect(registry.deliver('slack', success)).resolves.toMatchObject({ provider: 'slack', code: 'circuit_open' });
    await expect(registry.deliver('pagerduty', success)).resolves.toMatchObject({ provider: 'pagerduty', ok: true });
    expect(registry.state('slack')).toBe('open');
    expect(registry.state('pagerduty')).toBe('closed');
  });

  it('never logs or returns provider error messages', async () => {
    const registry = new NotificationCircuitRegistry({ failureThreshold: 2, openMs: 30_000, maxTimeoutMs: 5_000 });
    const result = await registry.deliver('pagerduty', () => Promise.reject(new Error('routing-key-secret SQL response')));
    expect(result).not.toHaveProperty('message');
    expect(JSON.stringify(result)).not.toContain('routing-key-secret');
  });
});
