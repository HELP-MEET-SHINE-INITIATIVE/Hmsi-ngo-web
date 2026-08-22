import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getMemberSessionFromCookie } from '../../../../lib/memberSession';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const session = getMemberSessionFromCookie(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Activate your HMSI ID card before viewing certificate requests.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Certificate requests are temporarily unavailable.' }, { status: 503 });
  const result = await admin.from('hmsi_certificate_requests').select('id,certificate_title,amount_ngn,status,paystack_reference,paid_at,issued_at,created_at').eq('holder_id', session.holderId).eq('holder_role', session.holderRole).eq('holder_email', session.email).order('created_at', { ascending: false }).limit(20);
  if (result.error) return NextResponse.json({ error: 'Certificate requests are temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ requests: result.data || [] });
}
