import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body.status || '').toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid volunteer status.' }, { status: 400 });

    const { data, error } = await admin
      .from('volunteer_applications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select('id,status')
      .single();

    if (error) throw error;
    return NextResponse.json({ volunteer: data });
  } catch (error) {
    console.error('[Admin] Failed to update volunteer application:', error);
    return NextResponse.json({ error: 'We could not update this application.' }, { status: 500 });
  }
}
