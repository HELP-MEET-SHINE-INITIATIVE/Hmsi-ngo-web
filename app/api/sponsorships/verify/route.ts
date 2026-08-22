import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify';
const referencePattern = /^[A-Za-z0-9._-]{6,120}$/;

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) return NextResponse.json({ error: 'Advertiser payment verification is not configured.' }, { status: 503 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Sponsorship payments are not configured.' }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'A valid JSON payment verification is required.' }, { status: 400 }); }
  const sponsorshipId = typeof body.sponsorship_id === 'string' ? body.sponsorship_id.trim() : '';
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  if (!sponsorshipId || !referencePattern.test(reference)) return NextResponse.json({ error: 'Sponsorship id and Paystack reference are required.' }, { status: 400 });
  const current = await admin.from('sponsorship_requests').select('id,budget_ngn,status').eq('id', sponsorshipId).maybeSingle();
  if (current.error) return NextResponse.json({ error: 'The sponsorship request could not be loaded.' }, { status: 503 });
  if (!current.data) return NextResponse.json({ error: 'Sponsorship request not found.' }, { status: 404 });
  const response = await fetch(`${PAYSTACK_VERIFY_URL}/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' }, cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  const payment = payload?.data;
  const expectedAmount = Math.round(Number(current.data.budget_ngn) * 100);
  if (!response.ok || !payload?.status || payment?.status !== 'success' || payment?.reference !== reference || payment?.amount !== expectedAmount || payment?.currency !== 'NGN') return NextResponse.json({ error: payload?.message || 'Paystack payment verification did not match the approved sponsorship amount.' }, { status: 400 });
  const update = await admin.from('sponsorship_requests').update({ status: 'paid', payment_reference: reference, paid_at: payment.paid_at || payment.transaction_date || new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', sponsorshipId).eq('status', 'approved').select('id,status,payment_reference,paid_at').maybeSingle();
  if (update.error) return NextResponse.json({ error: 'The verified payment could not be recorded.' }, { status: 503 });
  if (!update.data) return NextResponse.json({ error: 'This sponsorship is no longer awaiting payment.' }, { status: 409 });
  return NextResponse.json({ sponsorship: update.data, message: 'Payment verified. HMSI administrator activation is still required before public display.' });
}
