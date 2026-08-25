import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function isAdmin(request: Request) {
  return Boolean(getAdminEmailFromCookie(request.headers.get('cookie')));
}

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  const { data, error } = await admin.from('workers').select('id,name,email,phone,role,status,onboarding_status,created_at').eq('status', 'active').is('removal_requested_at', null).order('name');
  if (error) return NextResponse.json({ error: 'Workers are temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ workers: data || [] });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    if (!name || !email || !phone) return NextResponse.json({ error: 'Name, email, and phone are required.' }, { status: 400 });

    const { data, error } = await admin.from('workers').insert({ name, email, phone, role: 'worker', status: 'active' }).select('id,name,email,phone,role,status,onboarding_status,created_at').single();
    if (error) throw error;
    return NextResponse.json({ worker: data }, { status: 201 });
  } catch (error) {
    console.error('[Admin] Failed to create worker:', error);
    return NextResponse.json({ error: 'We could not add this worker.' }, { status: 500 });
  }
}
