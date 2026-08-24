import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Donation storage is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const { id } = await params;
  const donation = await admin.from('donations').select('id,donor_name,donor_email,donor_phone,is_anonymous,amount_ngn,amount_major,paystack_reference,status,currency,channel,payment_provider,payment_method,campaign_name_snapshot,paid_at,created_at,verified_at,manual_recorded_by,manual_verified_by,manual_verified_at,acknowledgement_status,acknowledgement_updated_at,acknowledgement_last_error').eq('id', id).maybeSingle();
  if (donation.error) return NextResponse.json({ error: 'Donation details are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  if (!donation.data) return NextResponse.json({ error: 'Donation not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ donation: donation.data }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
