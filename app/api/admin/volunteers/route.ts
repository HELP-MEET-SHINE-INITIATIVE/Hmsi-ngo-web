import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const { data, error } = await admin
    .from('volunteer_applications')
    .select('id,name,email,phone,location,interest,message,status,account_status,onboarding_invited_at,publisher_role,applicant_role,created_at')
    .eq('status', 'approved')
    .eq('account_status', 'active')
    .neq('applicant_role', 'worker')
    .is('removal_requested_at', null)
    .order('name', { ascending: true })
    .limit(500);
  if (error) {
    console.error('[Admin] Failed to load volunteer directory:', error.message);
    return NextResponse.json({ error: 'Volunteer directory is temporarily unavailable.' }, { status: 503 });
  }
  return NextResponse.json({ volunteers: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}
