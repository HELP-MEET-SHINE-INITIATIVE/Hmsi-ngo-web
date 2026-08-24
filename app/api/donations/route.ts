import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { dispatchDonationAcknowledgement, getFundraiserSnapshot, type DonationRecord } from '../../../lib/donationTracking';
import { isHmsiPaymentCurrency, toMinorUnits } from '../../../lib/paystackCurrencies';
import { sendPresidentInternalAlert } from '../../../lib/hmsiNotifications';

export const runtime = 'nodejs';

const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify';
const referencePattern = /^[A-Za-z0-9._-]{6,120}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PaystackVerification = {
  status?: boolean;
  message?: string;
  data?: {
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    channel?: string;
    paid_at?: string | null;
    created_at?: string | null;
    customer?: { email?: string | null };
  };
};

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('A valid JSON donation payload is required.');
  }

  const isAnonymous = body.is_anonymous === true;
  const submittedDonorName = typeof body.donor_name === 'string' ? body.donor_name.trim() : '';
  const donorName = isAnonymous ? 'Anonymous donor' : submittedDonorName;
  const donorEmail = typeof body.donor_email === 'string' ? body.donor_email.trim().toLowerCase() : '';
  const reference = typeof body.paystack_reference === 'string' ? body.paystack_reference.trim() : '';
  const fundraiserId = typeof body.fundraiser_id === 'string' && body.fundraiser_id.trim() ? body.fundraiser_id.trim() : null;
  const requestedCurrency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'NGN';
  const amountInMajorUnits = typeof body.amount === 'number' ? body.amount : Number(body.amount);
  const currency = isHmsiPaymentCurrency(requestedCurrency) ? requestedCurrency : null;
  const expectedAmountMinor = currency ? toMinorUnits(amountInMajorUnits, currency) : 0;

  if (!isAnonymous && (donorName.length < 2 || donorName.length > 160)) return badRequest('Please provide a valid donor name.');
  if (!emailPattern.test(donorEmail) || donorEmail.length > 320) return badRequest('Please provide a valid donor email.');
  if (!referencePattern.test(reference)) return badRequest('Paystack returned an invalid transaction reference.');
  if (!currency) return badRequest('HMSI currently supports NGN and USD payment currencies through Paystack.');
  if (!Number.isFinite(amountInMajorUnits) || !Number.isSafeInteger(expectedAmountMinor) || expectedAmountMinor < toMinorUnits(currency === 'NGN' ? 100 : 1, currency)) {
    return badRequest(`Donation amount must be at least ${currency === 'NGN' ? '₦100' : '$1'}.`);
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return NextResponse.json({ error: 'Paystack server verification is not configured.' }, { status: 503 });
  }

  let fundraiserSnapshot: { fundraiserId: string | null; campaignName: string | null };
  try {
    fundraiserSnapshot = await getFundraiserSnapshot(admin, fundraiserId);
  } catch (fundraiserError) {
    return NextResponse.json({ error: fundraiserError instanceof Error ? fundraiserError.message : 'The fundraiser could not be verified.' }, { status: 400 });
  }

  let verificationResponse: Response;
  try {
    verificationResponse = await fetch(`${PAYSTACK_VERIFY_URL}/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${paystackSecretKey}`, Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (verificationError) {
    console.error('[Donations] Paystack verification request failed:', verificationError);
    return NextResponse.json({ error: 'Payment verification is temporarily unavailable. Please keep your Paystack reference and contact HMSI support.' }, { status: 502 });
  }

  const verification = (await verificationResponse.json().catch(() => null)) as PaystackVerification | null;
  const payment = verification?.data;
  if (!verificationResponse.ok || !verification?.status || !payment || payment.status !== 'success') {
    return NextResponse.json({ error: verification?.message || 'Paystack could not verify this successful payment.' }, { status: 400 });
  }

  if (payment.reference !== reference) return badRequest('Paystack reference verification did not match.');
  if (payment.currency !== currency) return badRequest(`The verified payment currency does not match the selected ${currency} donation.`);
  if (payment.amount !== expectedAmountMinor) {
    return badRequest('The verified payment amount does not match the donation amount.');
  }

  const donationRecord = {
    fundraiser_id: fundraiserSnapshot.fundraiserId,
    donor_name: donorName,
    donor_email: donorEmail,
    is_anonymous: isAnonymous,
    amount_ngn: currency === 'NGN' ? payment.amount / 100 : null,
    amount_major: payment.amount / 100,
    paystack_reference: reference,
    status: 'success',
    currency,
    channel: payment.channel || null,
    payment_provider: 'paystack',
    payment_method: payment.channel === 'bank' ? 'bank_transfer' : payment.channel === 'ussd' ? 'ussd' : 'card',
    campaign_name_snapshot: fundraiserSnapshot.campaignName,
    paid_at: payment.paid_at || payment.created_at || null,
    verified_at: new Date().toISOString(),
  };

  const inserted = await admin.from('donations').insert(donationRecord).select('*').single();
  if (inserted.error) {
    if (inserted.error.code === '23505') {
      const existing = await admin.from('donations').select('*').eq('paystack_reference', reference).maybeSingle();
      if (existing.data) return NextResponse.json({ donation: existing.data, duplicate: true });
    }
    console.error('[Donations] Failed to record verified donation:', inserted.error);
    return NextResponse.json({ error: 'The verified payment could not be added to the HMSI ledger yet. Please keep your Paystack reference and contact support.' }, { status: 503 });
  }

  let fundraiserTotalUpdated = currency === 'NGN';
  const fundraiserTotalUpdateReason = currency === 'USD' ? 'USD donation recorded; the NGN fundraiser total was not converted automatically.' : undefined;
  if (fundraiserSnapshot.fundraiserId && currency === 'NGN') {
    const totalUpdate = await admin.rpc('increment_fundraiser_raised_amount', {
      p_fundraiser_id: fundraiserSnapshot.fundraiserId,
      p_amount: payment.amount / 100,
    });
    if (totalUpdate.error) {
      fundraiserTotalUpdated = false;
      console.error('[Donations] Donation saved but fundraiser total was not updated. Run donations_patch.sql:', totalUpdate.error);
    }
  }

  const acknowledgement = await dispatchDonationAcknowledgement({ admin, donation: inserted.data as DonationRecord });
  const receiptSent = acknowledgement.sent;
  const receiptError = acknowledgement.error || '';

  const majorDonationThresholdNgn = Number(process.env.HMSI_MAJOR_DONATION_THRESHOLD_NGN || '');
  if (currency === 'NGN' && Number.isFinite(majorDonationThresholdNgn) && majorDonationThresholdNgn > 0 && Number(inserted.data.amount_major) >= majorDonationThresholdNgn) {
    try {
      const amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(Number(inserted.data.amount_major));
      await sendPresidentInternalAlert({
        title: 'Verified major donation received',
        summary: 'A verified donation has met the configured HMSI major-donation notification threshold.',
        rows: [
          { label: 'Verified amount', value: amount },
          { label: 'Payment channel', value: inserted.data.channel || 'Not reported' },
          { label: 'Donor privacy mode', value: inserted.data.is_anonymous ? 'Anonymous' : 'Named donor' },
          { label: 'Payment reference suffix', value: `…${inserted.data.paystack_reference.slice(-6)}` },
        ],
        portalUrl: 'https://www.hmsi.org.ng/admin',
        idempotencyKey: `president_major_donation_${inserted.data.paystack_reference}`,
      });
    } catch (alertError) {
      console.error('[Donations] President major-donation alert failed:', alertError instanceof Error ? alertError.message : 'unknown');
    }
  }

  return NextResponse.json({ donation: inserted.data, fundraiserTotalUpdated, fundraiserTotalUpdateReason, receiptSent, receiptError: receiptError || undefined }, { status: 201 });
}
