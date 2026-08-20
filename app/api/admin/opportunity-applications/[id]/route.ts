import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body.status || '').trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid application status.' }, { status: 400 });

    const { data, error } = await admin
      .from('opportunity_applications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select('id,opportunity_id,applicant_name,applicant_email,applicant_role,status,reviewed_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Application was not found.' }, { status: 404 });
    return NextResponse.json({ application: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Admin] Failed to review opportunity application:', message);
    return NextResponse.json({ error: `We could not review this application: ${message}` }, { status: 500 });
  }
}
