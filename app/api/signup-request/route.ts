import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: 'Signup requests are not configured yet.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const message = String(body.message || '').trim();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) throw new Error('Supabase is not configured.');

    const { data, error } = await admin
      .from('signup_requests')
      .insert([{ name, email, phone: phone || null, message: message || null }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    console.error('[Signup] Failed to save request:', error);
    return NextResponse.json({ error: 'We could not save this request. Please try again.' }, { status: 500 });
  }
}
