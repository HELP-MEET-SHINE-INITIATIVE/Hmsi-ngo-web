import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';

const testDoubles = vi.hoisted(() => {
  const recordSecurityEvent = vi.fn(async () => ({
    requestId: '00000000-0000-0000-0000-000000000001',
    recorded: true,
  }));
  const mockFrom = vi.fn();
  return { recordSecurityEvent, mockFrom, mockAdmin: { from: mockFrom } };
});
const { recordSecurityEvent, mockFrom, mockAdmin } = testDoubles;

vi.mock('../lib/securityEventLog', () => ({ recordSecurityEvent: testDoubles.recordSecurityEvent }));
vi.mock('../lib/supabaseAdmin', () => ({
  getSupabaseAdmin: () => testDoubles.mockAdmin,
}));

import { createAdminSession } from '../lib/adminSession';
import { GET, POST } from '../app/api/admin/governance/route';

function cookieFor({ email, expiresAt }: { email: string; expiresAt: number }) {
  const secret = process.env.HMSI_ADMIN_SESSION_SECRET as string;
  const encoded = Buffer.from(email.toLowerCase()).toString('base64url');
  const payload = `${encoded}.${expiresAt}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `hmsi_admin_session=${payload}.${signature}`;
}

function expiredAdminCookie() {
  return cookieFor({ email: 'president@hmsi.example', expiresAt: Math.floor(Date.now() / 1000) - 30 });
}

function validAdminCookie() {
  return `hmsi_admin_session=${createAdminSession('president@hmsi.example')}`;
}

function chain(data: unknown[] = []) {
  const result = { data, error: null };
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => result),
  };
  return builder;
}

describe('governance route security-event integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('HMSI_ADMIN_EMAIL', 'president@hmsi.example');
    vi.stubEnv('HMSI_ADMIN_PASSWORD', 'correct-admin-password');
    vi.stubEnv('HMSI_ADMIN_SESSION_SECRET', 'session-test-secret');
    mockFrom.mockImplementation(() => chain());
  });

  it('returns 401 for an expired session and does not call Supabase', async () => {
    const response = await GET(new Request('https://hmsi.example/api/admin/governance', {
      headers: { cookie: expiredAdminCookie() },
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Administrator authentication required.' });
    expect(recordSecurityEvent).toHaveBeenCalledOnce();
    expect(recordSecurityEvent).toHaveBeenCalledWith({
      eventType: 'admin_session_rejected',
      reasonCode: 'expired_session',
      routeKey: 'admin_governance',
      method: 'GET',
      httpStatus: 401,
      originClass: 'not_applicable',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('preserves 401 when the security-event writer itself rejects', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    recordSecurityEvent.mockImplementationOnce(() => Promise.reject(new Error('simulated sink timeout')));

    const response = await GET(new Request('https://hmsi.example/api/admin/governance', {
      headers: { cookie: expiredAdminCookie() },
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Administrator authentication required.' });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith('[Governance SecurityEvent] sink_failure');
  });

  it('returns 403 for a cross-host origin and never reads the mutation body', async () => {
    const body = vi.fn(async () => ({ action: 'create_unit', code: 'SECRET_UNIT', name: 'Private body' }));
    const request = new Request('https://hmsi.example/api/admin/governance', {
      method: 'POST',
      headers: {
        cookie: validAdminCookie(),
        origin: 'https://attacker.example',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'create_unit', code: 'SECRET_UNIT', name: 'Private body' }),
    });
    Object.defineProperty(request, 'json', { value: body });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Cross-site governance requests are not allowed.' });
    expect(body).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(recordSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'admin_origin_rejected',
      reasonCode: 'origin_host_mismatch',
      originClass: 'different_host',
      httpStatus: 403,
      actorEmail: 'president@hmsi.example',
    }));

    const serializedCalls = JSON.stringify(recordSecurityEvent.mock.calls);
    expect(serializedCalls).not.toContain('attacker.example');
    expect(serializedCalls).not.toContain('SECRET_UNIT');
    expect(serializedCalls).not.toContain('Private body');
  });

  it('records missing-origin failure with no raw header and preserves 403', async () => {
    const response = await POST(new Request('https://hmsi.example/api/admin/governance', {
      method: 'POST',
      headers: { cookie: validAdminCookie(), 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create_unit' }),
    }));

    expect(response.status).toBe(403);
    expect(recordSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'admin_origin_rejected',
      reasonCode: 'origin_missing',
      originClass: 'missing',
    }));
    const serialized = JSON.stringify(recordSecurityEvent.mock.calls);
    expect(serialized).not.toContain('https://');
    expect(serialized).not.toContain('Origin:');
  });

  it('allows a valid same-host request to reach the existing protected mutation path', async () => {
    const single = {
      data: {
        id: '00000000-0000-0000-0000-000000000002',
        code: 'BRANCH_1',
        name: 'Branch One',
        unit_type: 'branch',
        status: 'draft',
      },
      error: null,
    };
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn(async () => single) })),
    }));
    mockFrom.mockReturnValue({ insert });

    const response = await POST(new Request('https://hmsi.example/api/admin/governance', {
      method: 'POST',
      headers: {
        cookie: validAdminCookie(),
        origin: 'https://hmsi.example',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'create_unit', code: 'BRANCH_1', name: 'Branch One', unitType: 'branch' }),
    }));

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledOnce();
    expect(recordSecurityEvent).not.toHaveBeenCalled();
    const insertedPayload = (insert.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(insertedPayload).toMatchObject({
      code: 'BRANCH_1',
      name: 'Branch One',
      unit_type: 'branch',
      status: 'draft',
      created_by: 'president@hmsi.example',
    });
  });
});

