import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const ALLOWED_STATUSES = new Set(['active', 'pending', 'archived', 'rejected']);

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
    if (!ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid fundraiser status.' }, { status: 400 });

    const { data, error } = await admin
      .from('fundraisers')
      .update({ status })
      .eq('id', id)
      .select('id,status')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Fundraiser record was not found.' }, { status: 404 });
    return NextResponse.json({ fundraiser: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Admin] Failed to update fundraiser:', message);
    return NextResponse.json({ error: `We could not update this fundraiser: ${message}` }, { status: 500 });
  }
}
