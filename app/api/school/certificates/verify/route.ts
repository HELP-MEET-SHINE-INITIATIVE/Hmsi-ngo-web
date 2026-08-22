import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const referencePattern = /^hmsi_cert_[A-Za-z0-9_-]{10,180}$/;
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return error('Certificate payment verification is temporarily unavailable.', 503);
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) return error('Certificate payment verification is not configured.', 503);
  const body = await request.json().catch(() => ({}));
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  if (!referencePattern.test(reference)) return error('A valid Paystack certificate reference is required.');
  const requestRecord = await admin.from('hmsi_certificate_requests').select('id,holder_name,holder_email,certificate_title,amount_ngn,status,paystack_reference').eq('paystack_reference', reference).maybeSingle();
  if (requestRecord.error) return error('Certificate request could not be loaded.', 503);
  if (!requestRecord.data) return error('Certificate payment request not found.', 404);
  if (requestRecord.data.status === 'paid' || requestRecord.data.status === 'issued') return NextResponse.json({ request: requestRecord.data, duplicate: true });
  let response: Response;
  try { response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' }, cache: 'no-store' }); }
  catch { return error('Paystack verification is temporarily unavailable.', 502); }
  const result = await response.json().catch(() => null);
  const payment = result?.data;
  const expectedKobo = Math.round(Number(requestRecord.data.amount_ngn) * 100);
  if (!response.ok || !result?.status || !payment || payment.status !== 'success' || payment.reference !== reference || payment.currency !== 'NGN' || payment.amount !== expectedKobo) return error('Paystack could not verify the exact certificate payment.', 400);
  const updated = await admin.from('hmsi_certificate_requests').update({ status: 'paid', paid_at: payment.paid_at || payment.created_at || new Date().toISOString() }).eq('id', requestRecord.data.id).in('status', ['eligible', 'pending_payment']).select('id,holder_name,holder_email,certificate_title,amount_ngn,status,paystack_reference,paid_at').single();
  if (updated.error || !updated.data) return error('The verified certificate payment could not be recorded.', 503);
  return NextResponse.json({ request: updated.data, message: 'Payment verified. An HMSI administrator must issue the completion certificate.' });
}
