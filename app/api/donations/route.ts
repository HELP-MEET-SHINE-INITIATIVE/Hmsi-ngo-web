import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

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
  const amountInNaira = typeof body.amount === 'number' ? body.amount : Number(body.amount);
  const expectedAmountKobo = Math.round(amountInNaira * 100);

  if (!isAnonymous && (donorName.length < 2 || donorName.length > 160)) return badRequest('Please provide a valid donor name.');
  if (!emailPattern.test(donorEmail) || donorEmail.length > 320) return badRequest('Please provide a valid donor email.');
  if (!referencePattern.test(reference)) return badRequest('Paystack returned an invalid transaction reference.');
  if (!Number.isFinite(amountInNaira) || !Number.isSafeInteger(expectedAmountKobo) || expectedAmountKobo < 10000) {
    return badRequest('Donation amount must be at least ₦100.');
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return NextResponse.json({ error: 'Paystack server verification is not configured.' }, { status: 503 });
  }

  if (fundraiserId) {
    const fundraiser = await admin.from('fundraisers').select('id').eq('id', fundraiserId).maybeSingle();
    if (fundraiser.error) {
      console.error('[Donations] Failed to check fundraiser:', fundraiser.error);
      return NextResponse.json({ error: 'The fundraiser could not be verified.' }, { status: 503 });
    }
    if (!fundraiser.data) return badRequest('The selected fundraiser no longer exists.');
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
  if (payment.currency && payment.currency !== 'NGN') return badRequest('Only NGN donations are supported.');
  if (payment.amount !== expectedAmountKobo) {
    return badRequest('The verified payment amount does not match the donation amount.');
  }

  const donationRecord = {
    fundraiser_id: fundraiserId,
    donor_name: donorName,
    donor_email: donorEmail,
    is_anonymous: isAnonymous,
    amount_ngn: payment.amount / 100,
    paystack_reference: reference,
    status: 'success',
    currency: payment.currency || 'NGN',
    channel: payment.channel || null,
    paid_at: payment.paid_at || payment.created_at || null,
  };

  const inserted = await admin.from('donations').insert(donationRecord).select('id,fundraiser_id,donor_name,donor_email,is_anonymous,amount_ngn,paystack_reference,status,currency,channel,paid_at,created_at').single();
  if (inserted.error) {
    if (inserted.error.code === '23505') {
      const existing = await admin.from('donations').select('id,fundraiser_id,donor_name,donor_email,is_anonymous,amount_ngn,paystack_reference,status,currency,channel,paid_at,created_at').eq('paystack_reference', reference).maybeSingle();
      if (existing.data) return NextResponse.json({ donation: existing.data, duplicate: true });
    }
    console.error('[Donations] Failed to record verified donation:', inserted.error);
    return NextResponse.json({ error: 'The verified payment could not be added to the HMSI ledger yet. Please keep your Paystack reference and contact support.' }, { status: 503 });
  }

  let fundraiserTotalUpdated = true;
  if (fundraiserId) {
    const totalUpdate = await admin.rpc('increment_fundraiser_raised_amount', {
      p_fundraiser_id: fundraiserId,
      p_amount: payment.amount / 100,
    });
    if (totalUpdate.error) {
      fundraiserTotalUpdated = false;
      console.error('[Donations] Donation saved but fundraiser total was not updated. Run donations_patch.sql:', totalUpdate.error);
    }
  }

  return NextResponse.json({ donation: inserted.data, fundraiserTotalUpdated }, { status: 201 });
}
