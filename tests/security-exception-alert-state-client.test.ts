import { describe, expect, it, vi } from 'vitest';
import {
  claimSecurityExceptionAlert,
  markSecurityExceptionAlertFailed,
  markSecurityExceptionAlertSent,
  SecurityExceptionAlertStateError,
} from '../lib/securityExceptionAlertStateClient';

const stateId = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-08-26T12:00:00.000Z');

function clientReturning(data: unknown, error: unknown = null) {
  return { rpc: vi.fn().mockResolvedValue({ data, error }) };
}

describe('security exception alert state client', () => {
  it('maps a valid claim to the atomic RPC and normalizes table return rows', async () => {
    const client = clientReturning([{ state_id: stateId, claimed: true }]);
    const result = await claimSecurityExceptionAlert({
      environment: 'staging',
      fingerprint: 'a'.repeat(64),
      expiredCount: 2,
      expiringCount: 3,
      invalidMetadataCount: 0,
      expiringWindowDays: 7,
      now,
    }, client);

    expect(result).toEqual({ stateId, claimed: true });
    expect(client.rpc).toHaveBeenCalledWith('claim_security_exception_alert', {
      p_environment: 'staging',
      p_fingerprint: 'a'.repeat(64),
      p_expired_count: 2,
      p_expiring_count: 3,
      p_invalid_metadata_count: 0,
      p_expiring_window_days: 7,
      p_now: now.toISOString(),
    });
  });

  it('rejects invalid claim inputs before any RPC call', async () => {
    const client = clientReturning(null);
    await expect(claimSecurityExceptionAlert({
      environment: 'staging',
      fingerprint: 'not-a-sha256',
      expiredCount: 0,
      expiringCount: 0,
      invalidMetadataCount: 0,
      expiringWindowDays: 7,
      now,
    }, client)).rejects.toMatchObject({
      operation: 'fingerprint',
      code: 'invalid_input',
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('returns sent transition result and maps database errors to a safe fixed error', async () => {
    const client = clientReturning(false);
    await expect(markSecurityExceptionAlertSent(stateId, now, client)).resolves.toBe(false);

    const failingClient = clientReturning(null, { message: 'contains private SQL details and a token' });
    await expect(markSecurityExceptionAlertSent(stateId, now, failingClient)).rejects.toEqual(
      expect.objectContaining({
        operation: 'mark-sent',
        code: 'database_error',
        message: 'security-exception-state:mark-sent:database_error',
      }),
    );
  });

  it('rejects invalid state IDs, unknown error codes, and past retry times', async () => {
    const client = clientReturning(true);
    await expect(markSecurityExceptionAlertSent('bad-id', now, client)).rejects.toBeInstanceOf(SecurityExceptionAlertStateError);
    await expect(markSecurityExceptionAlertFailed(stateId, 'raw_database_error' as never, new Date('2026-08-27T12:00:00Z'), now, client)).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(markSecurityExceptionAlertFailed(stateId, 'webhook_timeout', new Date('2026-08-26T11:59:59Z'), now, client)).rejects.toMatchObject({ operation: 'next-retry-at', code: 'invalid_input' });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('maps fixed failure codes and ISO timestamps to the failed RPC', async () => {
    const client = clientReturning(true);
    const retryAt = new Date('2026-08-26T12:05:00.000Z');
    await expect(markSecurityExceptionAlertFailed(stateId, 'webhook_timeout', retryAt, now, client)).resolves.toBe(true);
    expect(client.rpc).toHaveBeenCalledWith('mark_security_exception_alert_failed', {
      p_state_id: stateId,
      p_error_code: 'webhook_timeout',
      p_next_retry_at: retryAt.toISOString(),
      p_now: now.toISOString(),
    });
  });
});
