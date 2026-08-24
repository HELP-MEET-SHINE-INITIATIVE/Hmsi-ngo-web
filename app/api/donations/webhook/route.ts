import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { cleanDonationText, dispatchDonationAcknowledgement, getFundraiserSnapshot, isDonationReference, normalisePaymentMethod, supportedDonationCurrencies, updateFundraiserForVerifiedDonation, type DonationRecord } from '../../../../lib/donationTracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PaystackEvent = { event?: string; data?: { reference?: string; status?: string; amount?: number; currency?: string; channel?: string; paid_at?: string; created_at?: string; customer?: { email?: string; first_name?: string; last_name?: string }; metadata?: { fundraiser_id?: string; custom_fields?: Array<{ variable_name?: string; value?: string }> } } };

function signedByPaystack(raw: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac('sha512', secret).update(raw).digest('hex');
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function metadataValue(data: NonNullable<PaystackEvent['data']>, name: string) {
  if (name === 'fundraiser_id' && typeof data.metadata?.fundraiser_id === 'string') return data.metadata.fundraiser_id;
  return data.metadata?.custom_fields?.find((field) => field.variable_name === name)?.value || '';
}

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) return NextResponse.json({ error: 'Webhook verification is not configured.' }, { status: 503 });
  const raw = await request.text();
  if (!signedByPaystack(raw, request.headers.get('x-paystack-signature'), secret)) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });

  const payload = JSON.parse(raw || '{}') as PaystackEvent;
  const providerEventId = `paystack:${createHash('sha256').update(raw).digest('hex')}`;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Donation storage is unavailable.' }, { status: 503 });
  if (payload.event !== 'charge.success' || payload.data?.status !== 'success') {
    await admin.from('donation_ingestion_events').insert({ provider: 'paystack', provider_event_id: providerEventId, event_type: cleanDonationText(payload.event, 80) || 'unknown', verification_status: 'ignored' });
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  const payment = payload.data;
  const reference = cleanDonationText(payment.reference, 120);
  const email = cleanDonationText(payment.customer?.email, 320).toLowerCase();
  const currency = cleanDonationText(payment.currency, 8).toUpperCase();
  if (!isDonationReference(reference) || !email.includes('@') || !supportedDonationCurrencies.has(currency) || !Number.isSafeInteger(payment.amount) || payment.amount <= 0) {
    await admin.from('donation_ingestion_events').insert({ provider: 'paystack', provider_event_id: providerEventId, event_type: 'charge.success', verification_status: 'failed', reference_suffix: reference ? `…${reference.slice(-6)}` : null, detail: 'invalid_verified_payload' });
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  const existing = await admin.from('donations').select('id').eq('paystack_reference', reference).maybeSingle();
  if (existing.data) {
    await admin.from('donation_ingestion_events').insert({ donation_id: existing.data.id, provider: 'paystack', provider_event_id: providerEventId, event_type: 'charge.success', verification_status: 'verified', reference_suffix: `…${reference.slice(-6)}` });
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  try {
    const fundraiser = await getFundraiserSnapshot(admin, cleanDonationText(metadataValue(payment, 'fundraiser_id'), 80) || null);
    const declaredName = cleanDonationText(metadataValue(payment, 'donor_name'), 160);
    const fallbackName = [cleanDonationText(payment.customer?.first_name, 80), cleanDonationText(payment.customer?.last_name, 80)].filter(Boolean).join(' ') || 'HMSI supporter';
    const inserted = await admin.from('donations').insert({
      fundraiser_id: fundraiser.fundraiserId,
      donor_name: declaredName || fallbackName,
      donor_email: email,
      donor_phone: null,
      is_anonymous: declaredName === 'Anonymous donor',
      amount_ngn: currency === 'NGN' ? payment.amount / 100 : null,
      amount_major: payment.amount / 100,
      paystack_reference: reference,
      status: 'success',
      currency,
      channel: cleanDonationText(payment.channel, 40) || null,
      payment_provider: 'paystack',
      payment_method: normalisePaymentMethod(payment.channel, 'card'),
      campaign_name_snapshot: fundraiser.campaignName,
      paid_at: payment.paid_at || payment.created_at || new Date().toISOString(),
      verified_at: new Date().toISOString(),
    }).select('*').single();
    if (inserted.error || !inserted.data) throw inserted.error || new Error('Unable to record the verified donation.');
    try {
      await updateFundraiserForVerifiedDonation(admin, inserted.data as DonationRecord);
    } catch (fundraiserError) {
      console.error('[Donation webhook] Verified donation recorded but campaign progress update failed:', fundraiserError instanceof Error ? fundraiserError.message : 'unknown');
    }
    await admin.from('donation_ingestion_events').insert({ donation_id: inserted.data.id, provider: 'paystack', provider_event_id: providerEventId, event_type: 'charge.success', verification_status: 'verified', reference_suffix: `…${reference.slice(-6)}` });
    await dispatchDonationAcknowledgement({ admin, donation: inserted.data as DonationRecord });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Donation webhook] Verified Paystack event handling failed:', error instanceof Error ? error.message : 'unknown');
    await admin.from('donation_ingestion_events').insert({ provider: 'paystack', provider_event_id: providerEventId, event_type: 'charge.success', verification_status: 'failed', reference_suffix: `…${reference.slice(-6)}`, detail: 'recording_failed' }).then(() => undefined);
    return NextResponse.json({ error: 'Webhook processing is temporarily unavailable.' }, { status: 503 });
  }
}
