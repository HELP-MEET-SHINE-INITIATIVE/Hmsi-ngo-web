import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const { id } = await params;
  const status = (await request.json()).status;
  if (!['active', 'inactive'].includes(status)) return NextResponse.json({ error: 'Invalid worker access status.' }, { status: 400 });
  const { data, error } = await admin.from('workers').update({ status }).eq('id', id).select('id,name,email,phone,role,status,created_at').single();
  if (error) return NextResponse.json({ error: 'We could not update this worker.' }, { status: 500 });
  return NextResponse.json({ worker: data });
}
