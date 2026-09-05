import { createHmac, randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './supabaseAdmin';

type SessionFailureReason =
  | 'missing_session'
  | 'expired_session'
  | 'malformed_session'
  | 'invalid_signature'
  | 'administrator_mismatch'
  | 'auth_configuration_missing';

type OriginFailureReason =
  | 'origin_missing'
  | 'origin_malformed'
  | 'origin_host_mismatch';

export type SecurityEventInput =
  | {
      eventType: 'admin_session_rejected';
      reasonCode: SessionFailureReason;
      routeKey: 'admin_governance';
      method: 'GET' | 'POST';
      httpStatus: 401;
      originClass: 'not_applicable';
    }
  | {
      eventType: 'admin_origin_rejected';
      reasonCode: OriginFailureReason;
      routeKey: 'admin_governance';
      method: 'POST';
      httpStatus: 403;
      originClass: 'missing' | 'malformed' | 'different_host';
      actorEmail?: string;
    };

const ACTOR_KEY_VERSION = 1;
const WRITE_TIMEOUT_MS = 300;

function pseudonymizeActor(email?: string) {
  const key = process.env.HMSI_SECURITY_EVENT_PSEUDONYM_KEY;
  if (!key || !email) return null;
  return createHmac('sha256', key).update(email.trim().toLowerCase()).digest('hex');
}

function safeRuntimeWarning(kind: 'sink_unavailable' | 'write_failed', details: {
  requestId: string;
  eventType: SecurityEventInput['eventType'];
  reasonCode: SecurityEventInput['reasonCode'];
  errorCode?: string;
}) {
  console.warn(`[SecurityEvent] ${kind}`, details);
}

export async function recordSecurityEvent(input: SecurityEventInput) {
  const requestId = randomUUID();
  const admin = getSupabaseAdmin();
  if (!admin) {
    safeRuntimeWarning('sink_unavailable', { requestId, eventType: input.eventType, reasonCode: input.reasonCode });
    return { requestId, recorded: false as const };
  }

  const actorRef = input.eventType === 'admin_origin_rejected' ? pseudonymizeActor(input.actorEmail) : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WRITE_TIMEOUT_MS);

  try {
    const inserted = await admin.from('security_event_log').insert({
      request_id: requestId,
      event_type: input.eventType,
      reason_code: input.reasonCode,
      route_key: input.routeKey,
      method: input.method,
      http_status: input.httpStatus,
      origin_class: input.originClass,
      actor_ref: actorRef,
      actor_ref_key_version: actorRef ? ACTOR_KEY_VERSION : null,
    }).abortSignal(controller.signal);

    if (inserted.error) {
      safeRuntimeWarning('write_failed', {
        requestId,
        eventType: input.eventType,
        reasonCode: input.reasonCode,
        errorCode: inserted.error.code || 'unknown',
      });
      return { requestId, recorded: false as const };
    }
    return { requestId, recorded: true as const };
  } catch (error) {
    const errorCode = error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'exception';
    safeRuntimeWarning('write_failed', {
      requestId,
      eventType: input.eventType,
      reasonCode: input.reasonCode,
      errorCode,
    });
    return { requestId, recorded: false as const };
  } finally {
    clearTimeout(timer);
  }
}
