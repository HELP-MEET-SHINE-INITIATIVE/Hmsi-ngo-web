import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { getMemberSessionFromCookie } from '../../../../../lib/memberSession';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';
const PAYSTACK_URL = 'https://api.paystack.co/transaction/initialize';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: Request) {
  const session = getMemberSessionFromCookie(request.headers.get('cookie'));
  if (!session) return error('Activate your HMSI ID card before paying for a school certificate.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Certificate payments are temporarily unavailable.', 503);
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!paystackSecret) return error('Certificate payments are not configured.', 503);
  const body = await request.json().catch(() => ({}));
  const requestId = typeof body.request_id === 'string' ? body.request_id.trim() : '';
  if (!requestId) return error('A certificate request is required.');
  const certificate = await admin.from('hmsi_certificate_requests').select('id,holder_id,holder_role,holder_email,certificate_title,amount_ngn,status').eq('id', requestId).maybeSingle();
  if (certificate.error) return error('Certificate request could not be loaded.', 503);
  if (!certificate.data || certificate.data.holder_id !== session.holderId || certificate.data.holder_role !== session.holderRole || certificate.data.holder_email.toLowerCase() !== session.email.toLowerCase()) return error('This certificate request is not assigned to the signed-in member.', 403);
  if (!['eligible', 'pending_payment'].includes(certificate.data.status)) return error('This certificate request is not available for payment.', 409);
  const amountKobo = Math.round(Number(certificate.data.amount_ngn) * 100);
  if (!Number.isSafeInteger(amountKobo) || amountKobo < 100) return error('The certificate fee is not valid.', 503);
  const reference = `hmsi_cert_${certificate.data.id}_${Date.now()}_${randomBytes(3).toString('hex')}`;
  let response: Response;
  try { response = await fetch(PAYSTACK_URL, { method: 'POST', headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: certificate.data.holder_email, amount: amountKobo, reference, currency: 'NGN', callback_url: `${process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng'}/school/certificates/complete` }), cache: 'no-store' }); }
  catch { return error('Paystack certificate initialization is temporarily unavailable.', 502); }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status || !result?.data?.authorization_url) return error(result?.message || 'Paystack could not initialize certificate payment.', 502);
  const updated = await admin.from('hmsi_certificate_requests').update({ status: 'pending_payment', paystack_reference: reference }).eq('id', requestId).in('status', ['eligible', 'pending_payment']).select('id,status,paystack_reference,amount_ngn,certificate_title').single();
  if (updated.error || !updated.data) return error('The certificate payment could not be recorded.', 503);
  return NextResponse.json({ authorization_url: result.data.authorization_url, access_code: result.data.access_code, reference, request: updated.data });
}
