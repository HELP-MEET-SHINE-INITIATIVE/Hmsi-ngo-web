import { beforeEach, describe, expect, it, vi } from 'vitest';

const testDoubles = vi.hoisted(() => ({
  mockAdmin: { from: vi.fn() },
  getSupabaseAdmin: vi.fn(),
}));
const mockAdmin = testDoubles.mockAdmin;

vi.mock('../lib/supabaseAdmin', () => ({
  getSupabaseAdmin: testDoubles.getSupabaseAdmin,
}));

import { inspectSameOrigin } from '../lib/sameOrigin';
import { recordSecurityEvent } from '../lib/securityEventLog';

function baseEvent() {
  return {
    eventType: 'admin_session_rejected' as const,
    reasonCode: 'expired_session' as const,
    routeKey: 'admin_governance' as const,
    method: 'GET' as const,
    httpStatus: 401 as const,
    originClass: 'not_applicable' as const,
  };
}

describe('security-event classifiers', () => {
  it('classifies missing and malformed origins without returning raw values', () => {
    const missing = inspectSameOrigin(new Request('https://hmsi.example/api/admin/governance', { method: 'POST' }));
    const malformed = inspectSameOrigin(new Request('https://hmsi.example/api/admin/governance', {
      method: 'POST',
      headers: { origin: 'not a url' },
    }));

    expect(missing).toEqual({ ok: false, reasonCode: 'origin_missing', originClass: 'missing' });
    expect(malformed).toEqual({ ok: false, reasonCode: 'origin_malformed', originClass: 'malformed' });
    expect(JSON.stringify(malformed)).not.toContain('not a url');
  });

  it('classifies a cross-host origin without retaining the host', () => {
    const result = inspectSameOrigin(new Request('https://hmsi.example/api/admin/governance', {
      method: 'POST',
      headers: { origin: 'https://attacker.example' },
    }));

    expect(result).toEqual({ ok: false, reasonCode: 'origin_host_mismatch', originClass: 'different_host' });
    expect(JSON.stringify(result)).not.toContain('attacker.example');
  });
});

describe('recordSecurityEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('SUPABASE_URL', 'https://supabase.example');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test-key');
    vi.stubEnv('HMSI_SECURITY_EVENT_PSEUDONYM_KEY', 'pseudonym-test-key');
    mockAdmin.from.mockReset();
    testDoubles.getSupabaseAdmin.mockReturnValue(mockAdmin);
  });

  it('writes only fixed fields and pseudonymizes the actor', async () => {
    const insert = vi.fn(() => ({
      abortSignal: vi.fn(async () => ({ error: null })),
    }));
    mockAdmin.from.mockReturnValue({ insert });

    const result = await recordSecurityEvent({
      eventType: 'admin_origin_rejected',
      reasonCode: 'origin_host_mismatch',
      routeKey: 'admin_governance',
      method: 'POST',
      httpStatus: 403,
      originClass: 'different_host',
      actorEmail: 'President@HMSI.example',
    });

    expect(result.recorded).toBe(true);
    expect(insert).toHaveBeenCalledOnce();
    const payload = (insert.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      event_type: 'admin_origin_rejected',
      reason_code: 'origin_host_mismatch',
      route_key: 'admin_governance',
      method: 'POST',
      http_status: 403,
      origin_class: 'different_host',
      actor_ref_key_version: 1,
    });
    expect(payload.actor_ref).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(payload)).not.toContain('President@HMSI.example');
    expect(JSON.stringify(payload)).not.toContain('attacker.example');
    expect(JSON.stringify(payload)).not.toContain('server-only-test-key');
  });

  it('returns recorded false and emits a sanitized warning when the sink is unavailable', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    testDoubles.getSupabaseAdmin.mockReturnValue(null);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await recordSecurityEvent(baseEvent());

    expect(result.recorded).toBe(false);
    expect(warning).toHaveBeenCalledWith('[SecurityEvent] sink_unavailable', expect.objectContaining({
      eventType: 'admin_session_rejected',
      reasonCode: 'expired_session',
    }));
    expect(warning.mock.calls.flat().join(' ')).not.toContain('server-only-test-key');
  });

  it('times out a hanging insert and never rejects the caller', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const abortSignal = vi.fn((signal: AbortSignal) => new Promise<never>((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    mockAdmin.from.mockReturnValue({ insert: vi.fn(() => ({ abortSignal })) });

    const started = Date.now();
    const result = await recordSecurityEvent(baseEvent());
    const elapsed = Date.now() - started;

    expect(result.recorded).toBe(false);
    expect(elapsed).toBeLessThan(1000);
    expect(abortSignal).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith('[SecurityEvent] write_failed', expect.objectContaining({
      errorCode: 'timeout',
      reasonCode: 'expired_session',
    }));
  });

  it('suppresses database error details and preserves best-effort semantics', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockAdmin.from.mockReturnValue({
      insert: vi.fn(() => ({
        abortSignal: vi.fn(async () => ({ error: { code: '42501', message: 'sensitive database detail' } })),
      })),
    });

    const result = await recordSecurityEvent(baseEvent());

    expect(result.recorded).toBe(false);
    expect(warning).toHaveBeenCalledWith('[SecurityEvent] write_failed', expect.objectContaining({
      errorCode: '42501',
    }));
    const output = warning.mock.calls.flat().join(' ');
    expect(output).not.toContain('sensitive database detail');
    expect(output).not.toContain('server-only-test-key');
  });
});
