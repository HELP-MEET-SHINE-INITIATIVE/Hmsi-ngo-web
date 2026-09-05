import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const referencePattern = /^hmsi_checkout_[a-f0-9-]{36}$/;

function safeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 320) : '';
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Donation storage is unavailable.' }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'A valid JSON payload is required.' }, { status: 400 }); }
  const email = safeEmail(body.donor_email);
  const donorName = typeof body.donor_name === 'string' ? body.donor_name.trim().slice(0, 160) : null;
  const currency = body.currency === 'USD' ? 'USD' : body.currency === 'NGN' ? 'NGN' : null;
  const amount = typeof body.amount === 'number' && Number.isFinite(body.amount) ? body.amount : Number(body.amount);
  const marketingOptIn = body.marketing_opt_in === true;
  const fundraiserId = typeof body.fundraiser_id === 'string' ? body.fundraiser_id.trim().slice(0, 80) || null : null;
  if (!emailPattern.test(email) || !currency || !Number.isFinite(amount) || amount <= 0 || (currency === 'NGN' && amount < 100) || (currency === 'USD' && amount < 1)) return NextResponse.json({ error: 'Valid donor email, currency, and amount are required.' }, { status: 400 });

  const checkoutReference = `hmsi_checkout_${randomUUID()}`;
  const inserted = await admin.from('donation_checkout_sessions').insert({ checkout_reference: checkoutReference, donor_email: email, donor_name: donorName, fundraiser_id: fundraiserId, amount_major: amount, currency, status: 'started', marketing_opt_in: marketingOptIn }).select('id,checkout_reference').single();
  if (inserted.error || !inserted.data) return NextResponse.json({ error: 'Donation checkout could not be started.' }, { status: 503 });
  if (marketingOptIn) {
    const now = new Date().toISOString();
    const contact = await admin.from('email_contacts').upsert({ email, display_name: donorName, role: 'donor', marketing_opt_in: true, consent_source: 'donation_checkout_opt_in', consented_at: now, updated_at: now }, { onConflict: 'email' });
    if (contact.error) console.error('[Donation checkout] Consent contact sync failed:', contact.error.message);
  }
  return NextResponse.json({ ok: true, session_id: inserted.data.id, checkout_reference: inserted.data.checkout_reference });
}

export async function PATCH(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Donation storage is unavailable.' }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'A valid JSON payload is required.' }, { status: 400 }); }
  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  const reference = typeof body.paystack_reference === 'string' ? body.paystack_reference.trim().slice(0, 180) : '';
  if (!sessionId || !reference || !referencePattern.test(reference)) return NextResponse.json({ error: 'A valid checkout session and Paystack reference are required.' }, { status: 400 });
  const updated = await admin.from('donation_checkout_sessions').update({ status: 'completed', checkout_reference: reference, completed_at: new Date().toISOString() }).eq('id', sessionId).in('status', ['started', 'completed']).select('id,status').maybeSingle();
  if (updated.error || !updated.data) return NextResponse.json({ error: 'Donation checkout session could not be completed.' }, { status: 409 });
  return NextResponse.json({ ok: true, session: updated.data });
}

export async function DELETE(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Donation storage is unavailable.' }, { status: 503 });
  const sessionId = new URL(request.url).searchParams.get('session_id')?.trim() || '';
  if (!sessionId || !/^[0-9a-f-]{36}$/.test(sessionId)) return NextResponse.json({ error: 'A valid checkout session is required.' }, { status: 400 });
  const cancelled = await admin.from('donation_checkout_sessions').update({ status: 'cancelled' }).eq('id', sessionId).eq('status', 'started').select('id,status').maybeSingle();
  if (cancelled.error || !cancelled.data) return NextResponse.json({ error: 'Donation checkout session could not be cancelled.' }, { status: 409 });
  return NextResponse.json({ ok: true, session: cancelled.data });
}
