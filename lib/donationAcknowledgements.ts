import type { SupabaseClient } from '@supabase/supabase-js';

export const acknowledgementStatuses = ['not_started', 'queued', 'sent', 'delivered', 'bounced', 'failed', 'suppressed'] as const;
export type AcknowledgementStatus = (typeof acknowledgementStatuses)[number];
export type AcknowledgementEventStatus = Exclude<AcknowledgementStatus, 'not_started'>;
export type AcknowledgementEventSource = 'application' | 'webhook' | 'manual_reconciliation';

const statusRank: Record<AcknowledgementStatus, number> = {
  not_started: 0,
  queued: 1,
  sent: 2,
  delivered: 3,
  bounced: 4,
  failed: 4,
  suppressed: 4,
};

function safeOccurredAt(value?: string) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

export function shouldUpdateAcknowledgementSummary(input: { currentStatus?: string | null; currentUpdatedAt?: string | null; nextStatus: AcknowledgementStatus; occurredAt: string }) {
  const currentStatus = acknowledgementStatuses.includes(input.currentStatus as AcknowledgementStatus) ? input.currentStatus as AcknowledgementStatus : 'not_started';
  const currentTime = input.currentUpdatedAt ? Date.parse(input.currentUpdatedAt) : 0;
  const nextTime = Date.parse(input.occurredAt);
  if (Number.isFinite(currentTime) && Number.isFinite(nextTime) && nextTime < currentTime) return false;
  return statusRank[input.nextStatus] >= statusRank[currentStatus] || currentStatus === input.nextStatus;
}

export async function recordDonationAcknowledgementEvent(input: {
  admin: SupabaseClient;
  donationId: string;
  eventType: AcknowledgementEventStatus;
  providerMessageId?: string | null;
  providerEventId?: string | null;
  eventSource: AcknowledgementEventSource;
  occurredAt?: string | null;
  detail?: string | null;
}) {
  const occurredAt = safeOccurredAt(input.occurredAt || undefined);
  const eventInsert = await input.admin.from('donation_acknowledgement_events').insert({
    donation_id: input.donationId,
    event_type: input.eventType,
    provider_message_id: input.providerMessageId || null,
    provider_event_id: input.providerEventId || null,
    event_source: input.eventSource,
    occurred_at: occurredAt,
    detail: input.detail || null,
  });

  const duplicate = eventInsert.error?.code === '23505';
  if (eventInsert.error && !duplicate) throw new Error(`Acknowledgement event recording failed: ${eventInsert.error.message}`);

  const current = await input.admin
    .from('donations')
    .select('acknowledgement_status,acknowledgement_updated_at,acknowledgement_message_id')
    .eq('id', input.donationId)
    .maybeSingle();
  if (current.error || !current.data) throw new Error(`Acknowledgement summary lookup failed: ${current.error?.message || 'donation not found'}`);

  if (!shouldUpdateAcknowledgementSummary({
    currentStatus: current.data.acknowledgement_status,
    currentUpdatedAt: current.data.acknowledgement_updated_at,
    nextStatus: input.eventType,
    occurredAt,
  })) {
    return { duplicate, summaryUpdated: false };
  }

  const summary: Record<string, string | null> = {
    acknowledgement_status: input.eventType,
    acknowledgement_updated_at: occurredAt,
    acknowledgement_last_error: ['bounced', 'failed', 'suppressed'].includes(input.eventType) ? (input.detail || input.eventType) : null,
  };
  if (input.providerMessageId) summary.acknowledgement_message_id = input.providerMessageId;
  if (input.eventType === 'sent') summary.acknowledgement_sent_at = occurredAt;
  if (input.eventType === 'delivered') summary.acknowledgement_delivered_at = occurredAt;
  if (input.eventType === 'bounced') summary.acknowledgement_bounced_at = occurredAt;
  if (input.eventType === 'failed' || input.eventType === 'suppressed') summary.acknowledgement_failed_at = occurredAt;

  const update = await input.admin.from('donations').update(summary).eq('id', input.donationId);
  if (update.error) throw new Error(`Acknowledgement summary update failed: ${update.error.message}`);
  return { duplicate, summaryUpdated: true };
}
