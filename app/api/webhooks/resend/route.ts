import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { recordDonationAcknowledgementEvent, type AcknowledgementEventStatus } from '../../../../lib/donationAcknowledgements';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ResendWebhookPayload = {
  type?: string;
  created_at?: string;
  data?: { email_id?: string | null };
};

const eventStatusByType: Record<string, AcknowledgementEventStatus> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.failed': 'failed',
  'email.suppressed': 'suppressed',
};

function webhookHeaders(request: Request) {
  return {
    'svix-id': request.headers.get('svix-id') || '',
    'svix-timestamp': request.headers.get('svix-timestamp') || '',
    'svix-signature': request.headers.get('svix-signature') || '',
  };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook receiver is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const rawPayload = await request.text();
  let event: ResendWebhookPayload;
  let providerEventId = '';
  try {
    const headers = webhookHeaders(request);
    if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) throw new Error('Missing webhook signature headers.');
    event = new Webhook(webhookSecret).verify(rawPayload, headers) as ResendWebhookPayload;
    providerEventId = headers['svix-id'];
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const acknowledgementStatus = eventStatusByType[event.type || ''];
  const providerMessageId = event.data?.email_id || null;
  if (!acknowledgementStatus || !providerMessageId) return NextResponse.json({ received: true, ignored: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const donation = await admin.from('donations').select('id').eq('acknowledgement_message_id', providerMessageId).maybeSingle();
  if (donation.error) {
    console.error('[Resend webhook] Donation lookup failed:', donation.error);
    return NextResponse.json({ error: 'Webhook processing temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!donation.data) return NextResponse.json({ received: true, unmatched: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });

  try {
    const result = await recordDonationAcknowledgementEvent({
      admin,
      donationId: donation.data.id,
      eventType: acknowledgementStatus,
      providerMessageId,
      providerEventId,
      eventSource: 'webhook',
      occurredAt: event.created_at || null,
      detail: acknowledgementStatus === 'bounced' ? 'provider_bounced' : acknowledgementStatus === 'failed' ? 'provider_failed' : acknowledgementStatus === 'suppressed' ? 'provider_suppressed' : null,
    });
    return NextResponse.json({ received: true, duplicate: result.duplicate }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Resend webhook] Acknowledgement audit update failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Webhook processing temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
