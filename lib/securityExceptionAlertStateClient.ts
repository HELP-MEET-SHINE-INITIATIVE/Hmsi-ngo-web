import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabaseAdmin';

const HEX_SHA256 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ENVIRONMENTS = new Set(['staging', 'production']);
const SAFE_ERROR_CODES = new Set([
  'webhook_timeout',
  'webhook_unavailable',
  'webhook_rejected',
  'state_conflict',
  'configuration_invalid',
] as const);

type Environment = 'staging' | 'production';
export type AlertErrorCode =
  | 'webhook_timeout'
  | 'webhook_unavailable'
  | 'webhook_rejected'
  | 'state_conflict'
  | 'configuration_invalid';

export type ClaimAlertInput = {
  environment: Environment;
  fingerprint: string;
  expiredCount: number;
  expiringCount: number;
  invalidMetadataCount: number;
  expiringWindowDays: number;
  now?: Date;
};

export type ClaimAlertResult = {
  stateId: string;
  claimed: boolean;
};

export class SecurityExceptionAlertStateError extends Error {
  readonly operation: string;
  readonly code: 'invalid_input' | 'database_error' | 'invalid_result';

  constructor(
    operation: string,
    code: SecurityExceptionAlertStateError['code'],
  ) {
    super(`security-exception-state:${operation}:${code}`);
    this.name = 'SecurityExceptionAlertStateError';
    this.operation = operation;
    this.code = code;
  }
}

type RpcClient = Pick<SupabaseClient, 'rpc'>;

function requireClient(client: RpcClient | null): RpcClient {
  if (!client) {
    throw new SecurityExceptionAlertStateError('client', 'database_error');
  }
  return client;
}

function requireInteger(value: number, name: string, max: number): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new SecurityExceptionAlertStateError(name, 'invalid_input');
  }
}

function requireDate(value: Date | undefined): string {
  const date = value ?? new Date();
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new SecurityExceptionAlertStateError('now', 'invalid_input');
  }
  return date.toISOString();
}

function validateClaim(input: ClaimAlertInput): string {
  if (!SAFE_ENVIRONMENTS.has(input.environment)) {
    throw new SecurityExceptionAlertStateError('claim', 'invalid_input');
  }
  if (!HEX_SHA256.test(input.fingerprint)) {
    throw new SecurityExceptionAlertStateError('fingerprint', 'invalid_input');
  }
  requireInteger(input.expiredCount, 'expired-count', 1_000_000);
  requireInteger(input.expiringCount, 'expiring-count', 1_000_000);
  requireInteger(input.invalidMetadataCount, 'invalid-metadata-count', 1_000_000);
  if (!Number.isInteger(input.expiringWindowDays) || input.expiringWindowDays < 1 || input.expiringWindowDays > 30) {
    throw new SecurityExceptionAlertStateError('expiring-window-days', 'invalid_input');
  }
  return requireDate(input.now);
}

function readClaimResult(data: unknown): ClaimAlertResult {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') {
    throw new SecurityExceptionAlertStateError('claim', 'invalid_result');
  }
  const stateId = (row as { state_id?: unknown }).state_id;
  const claimed = (row as { claimed?: unknown }).claimed;
  if (typeof stateId !== 'string' || !UUID.test(stateId) || typeof claimed !== 'boolean') {
    throw new SecurityExceptionAlertStateError('claim', 'invalid_result');
  }
  return { stateId, claimed };
}

function readBooleanResult(operation: string, data: unknown): boolean {
  if (typeof data === 'boolean') return data;
  const row = Array.isArray(data) ? data[0] : data;
  if (row && typeof row === 'object' && typeof (row as { [key: string]: unknown }).result === 'boolean') {
    return (row as { result: boolean }).result;
  }
  throw new SecurityExceptionAlertStateError(operation, 'invalid_result');
}

async function callRpc<T>(operation: string, client: RpcClient, functionName: string, args: Record<string, unknown>, parse: (data: unknown) => T): Promise<T> {
  const { data, error } = await client.rpc(functionName, args);
  if (error) {
    // Deliberately discard the database message so secrets and SQL details never
    // cross this module boundary or reach a caller’s log statement.
    throw new SecurityExceptionAlertStateError(operation, 'database_error');
  }
  return parse(data);
}

export async function claimSecurityExceptionAlert(
  input: ClaimAlertInput,
  client: RpcClient | null = getSupabaseAdmin(),
): Promise<ClaimAlertResult> {
  const now = validateClaim(input);
  const safeClient = requireClient(client);
  return callRpc('claim', safeClient, 'claim_security_exception_alert', {
    p_environment: input.environment,
    p_fingerprint: input.fingerprint,
    p_expired_count: input.expiredCount,
    p_expiring_count: input.expiringCount,
    p_invalid_metadata_count: input.invalidMetadataCount,
    p_expiring_window_days: input.expiringWindowDays,
    p_now: now,
  }, readClaimResult);
}

export async function markSecurityExceptionAlertSent(
  stateId: string,
  now: Date = new Date(),
  client: RpcClient | null = getSupabaseAdmin(),
): Promise<boolean> {
  if (!UUID.test(stateId)) {
    throw new SecurityExceptionAlertStateError('mark-sent', 'invalid_input');
  }
  const pNow = requireDate(now);
  const safeClient = requireClient(client);
  return callRpc('mark-sent', safeClient, 'mark_security_exception_alert_sent', {
    p_state_id: stateId,
    p_now: pNow,
  }, (data) => readBooleanResult('mark-sent', data));
}

export async function markSecurityExceptionAlertFailed(
  stateId: string,
  errorCode: AlertErrorCode,
  nextRetryAt: Date,
  now: Date = new Date(),
  client: RpcClient | null = getSupabaseAdmin(),
): Promise<boolean> {
  if (!UUID.test(stateId)) {
    throw new SecurityExceptionAlertStateError('mark-failed', 'invalid_input');
  }
  if (!SAFE_ERROR_CODES.has(errorCode)) {
    throw new SecurityExceptionAlertStateError('mark-failed', 'invalid_input');
  }
  const retryAt = requireDate(nextRetryAt);
  const pNow = requireDate(now);
  if (new Date(retryAt).getTime() < new Date(pNow).getTime()) {
    throw new SecurityExceptionAlertStateError('next-retry-at', 'invalid_input');
  }
  const safeClient = requireClient(client);
  return callRpc('mark-failed', safeClient, 'mark_security_exception_alert_failed', {
    p_state_id: stateId,
    p_error_code: errorCode,
    p_next_retry_at: retryAt,
    p_now: pNow,
  }, (data) => readBooleanResult('mark-failed', data));
}
