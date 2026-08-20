import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: 'Volunteer applications are not configured yet.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const interest = String(body.interest || '').trim();
    const message = String(body.message || '').trim();
    const applicantRole = String(body.role || 'volunteer').trim().toLowerCase();

    if (!name || !email || !phone || !interest || !message) {
      return NextResponse.json({ error: 'Please complete all volunteer application fields.' }, { status: 400 });
    }
    if (name.length > 160 || message.length > 10000) {
      return NextResponse.json({ error: 'Please shorten the name or message and try again.' }, { status: 400 });
    }
    if (!['volunteer', 'worker'].includes(applicantRole)) {
      return NextResponse.json({ error: 'Choose volunteer or worker.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) throw new Error('Supabase is not configured.');

    const { error } = await admin.from('volunteer_applications').insert({
      name,
      email,
      phone,
      interest,
      message,
      applicant_role: applicantRole,
      status: 'pending',
    });

    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[Volunteer] Failed to save application:', error);
    return NextResponse.json({ error: 'We could not save your application. Please try again.' }, { status: 500 });
  }
}
