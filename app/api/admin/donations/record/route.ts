import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { cleanDonationText, dispatchDonationAcknowledgement, getFundraiserSnapshot, isDonationReference, normalisePaymentMethod, supportedDonationCurrencies, updateFundraiserForVerifiedDonation, type DonationRecord } from '../../../../../lib/donationTracking';

export const runtime = 'nodejs';

function adminActor(request: Request) { return getAdminEmailFromCookie(request.headers.get('cookie')); }
function sameOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || origin === new URL(request.url).origin; }

export async function POST(request: Request) {
  const actor = adminActor(request);
  if (!actor) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Cross-site manual donation intake is not allowed.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const donorName = cleanDonationText(body.donorName, 160);
  const donorEmail = cleanDonationText(body.donorEmail, 320).toLowerCase();
  const donorPhone = cleanDonationText(body.donorPhone, 40) || null;
  const reference = cleanDonationText(body.transactionReference, 120);
  const currency = cleanDonationText(body.currency, 8).toUpperCase();
  const amount = Number(body.amount);
  const fundraiserId = cleanDonationText(body.fundraiserId, 80) || null;
  const paymentMethod = normalisePaymentMethod(body.paymentMethod, 'manual');
  if (donorName.length < 2 || !donorEmail.includes('@') || !isDonationReference(reference) || !supportedDonationCurrencies.has(currency) || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter a donor name, email, positive amount, supported currency, and a valid transaction reference.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Donation storage is unavailable.' }, { status: 503 });
  try {
    const fundraiser = await getFundraiserSnapshot(admin, fundraiserId);
    const created = await admin.from('donations').insert({ fundraiser_id: fundraiser.fundraiserId, donor_name: donorName, donor_email: donorEmail, donor_phone: donorPhone, is_anonymous: false, amount_ngn: currency === 'NGN' ? amount : null, amount_major: amount, paystack_reference: reference, status: 'manual_verification', currency, channel: paymentMethod, payment_provider: 'manual', payment_method: paymentMethod, campaign_name_snapshot: fundraiser.campaignName, manual_recorded_by: actor }).select('*').single();
    if (created.error || !created.data) throw created.error || new Error('Manual donation could not be saved.');
    await admin.from('donation_ingestion_events').insert({ donation_id: created.data.id, provider: 'manual', provider_event_id: `manual:${created.data.id}:recorded`, event_type: 'manual.recorded', verification_status: 'pending_manual_verification', reference_suffix: `…${reference.slice(-6)}` });
    return NextResponse.json({ donation: created.data }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') return NextResponse.json({ error: 'This transaction reference is already recorded.' }, { status: 409 });
    console.error('[Admin donations] Manual intake failed:', error);
    return NextResponse.json({ error: 'Manual donation could not be recorded.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const actor = adminActor(request);
  if (!actor) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Cross-site verification is not allowed.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const donationId = cleanDonationText(body.donationId, 80);
  if (!donationId || body.action !== 'verify_manual') return NextResponse.json({ error: 'A manual donation and verification action are required.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Donation storage is unavailable.' }, { status: 503 });
  const existing = await admin.from('donations').select('*').eq('id', donationId).eq('status', 'manual_verification').maybeSingle();
  if (existing.error || !existing.data) return NextResponse.json({ error: 'Pending manual donation not found.' }, { status: 404 });
  const updated = await admin.from('donations').update({ status: 'success', paid_at: existing.data.paid_at || new Date().toISOString(), verified_at: new Date().toISOString(), manual_verified_by: actor, manual_verified_at: new Date().toISOString() }).eq('id', donationId).eq('status', 'manual_verification').select('*').maybeSingle();
  if (updated.error || !updated.data) return NextResponse.json({ error: 'Manual donation verification could not be completed.' }, { status: 503 });
  try {
    let fundraiserTotalUpdated = true;
    try {
      await updateFundraiserForVerifiedDonation(admin, updated.data as DonationRecord);
    } catch (fundraiserError) {
      fundraiserTotalUpdated = false;
      console.error('[Admin donations] Verified manual donation could not update campaign progress:', fundraiserError instanceof Error ? fundraiserError.message : 'unknown');
    }
    await admin.from('donation_ingestion_events').insert({ donation_id: updated.data.id, provider: 'manual', provider_event_id: `manual:${updated.data.id}:verified`, event_type: 'manual.verified', verification_status: 'verified', reference_suffix: `…${updated.data.paystack_reference.slice(-6)}` });
    const acknowledgement = await dispatchDonationAcknowledgement({ admin, donation: updated.data as DonationRecord });
    return NextResponse.json({ donation: updated.data, acknowledgement, fundraiserTotalUpdated });
  } catch (error) {
    console.error('[Admin donations] Manual donation follow-up failed:', error);
    return NextResponse.json({ donation: updated.data, warning: 'Donation was verified, but campaign progress or acknowledgement needs follow-up.' });
  }
}
