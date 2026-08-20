import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: 'Contact submissions are not configured yet. Please email support@hmsi.org.ng.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const message = String(body.message || '').trim();

    if (!name || name.length > 160 || !email || !message || message.length > 10000) {
      return NextResponse.json({ error: 'Please provide a valid name, email, and message.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) throw new Error('Supabase is not configured.');

    const { error } = await admin.from('contact_messages').insert({
      name,
      email,
      message,
      status: 'new',
    });

    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[Contact] Failed to save contact message:', error);
    return NextResponse.json({ error: 'We could not send your message. Please try again.' }, { status: 500 });
  }
}
