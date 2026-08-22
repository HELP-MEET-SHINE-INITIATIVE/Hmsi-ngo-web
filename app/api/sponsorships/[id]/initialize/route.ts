import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const PAYSTACK_INITIALIZE_URL = 'https://api.paystack.co/transaction/initialize';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) return NextResponse.json({ error: 'Advertiser payment setup is not configured.' }, { status: 503 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Sponsorship payments are not configured.' }, { status: 503 });
  const { id } = await params;
  const requestRow = await admin.from('sponsorship_requests').select('id,requester_name,requester_email,title,budget_ngn,status').eq('id', id).maybeSingle();
  if (requestRow.error) return NextResponse.json({ error: 'The sponsorship request could not be loaded.' }, { status: 503 });
  if (!requestRow.data) return NextResponse.json({ error: 'Sponsorship request not found.' }, { status: 404 });
  if (requestRow.data.status !== 'approved') return NextResponse.json({ error: 'Payment is available only after HMSI administrator approval.' }, { status: 409 });

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* Email can default to the approved request email. */ }
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : requestRow.data.requester_email;
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng'}/sponsor/complete?sponsorship=${encodeURIComponent(id)}`;
  const response = await fetch(PAYSTACK_INITIALIZE_URL, { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email, amount: Math.round(Number(requestRow.data.budget_ngn) * 100), currency: 'NGN', callback_url: callbackUrl, metadata: { sponsorship_request_id: id, sponsorship_title: requestRow.data.title } }), cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status || !payload?.data?.authorization_url || !payload?.data?.reference) return NextResponse.json({ error: payload?.message || 'Paystack could not initialize the sponsorship payment.' }, { status: 502 });
  return NextResponse.json({ authorization_url: payload.data.authorization_url, reference: payload.data.reference });
}
