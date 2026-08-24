import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const { searchParams } = new URL(request.url);
  const page = positiveInteger(searchParams.get('page'), 1);
  const requestedLimit = positiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE);
  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);
  const from = (page - 1) * limit;

  const { data, error, count } = await admin
    .from('donations')
    .select('id,fundraiser_id,donor_name,donor_email,is_anonymous,amount_ngn,amount_major,paystack_reference,currency,channel,paid_at,created_at,acknowledgement_status,acknowledgement_updated_at', { count: 'exact' })
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    console.error('[Admin donations] Failed to load verified donations:', error);
    return NextResponse.json({ error: 'Verified donation records are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const total = count || 0;
  const donations = (data || []).map(({ paystack_reference, ...donation }) => ({
    ...donation,
    payment_reference_suffix: paystack_reference ? `…${paystack_reference.slice(-6)}` : 'Not available',
  }));

  return NextResponse.json({
    donations,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
