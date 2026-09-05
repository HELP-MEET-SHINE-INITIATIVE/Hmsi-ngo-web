import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON payload is required.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!emailPattern.test(email) || email.length > 320) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Newsletter signup is not configured yet.' }, { status: 503 });

  const consentedAt = new Date().toISOString();
  const contact = await admin.from('email_contacts').upsert({ email, role: 'subscriber', marketing_opt_in: true, consent_source: 'newsletter_subscribe', consented_at: consentedAt, unsubscribed_at: null, suppressed_at: null, suppression_reason: null, updated_at: consentedAt }, { onConflict: 'email' });
  if (contact.error) {
    console.error('[Newsletter] Contact consent record failed:', contact.error.message);
    return NextResponse.json({ error: 'Newsletter signup is temporarily unavailable. Please try again.' }, { status: 503 });
  }

  const { error } = await admin.from('newsletter_subscribers').upsert({ email, status: 'active', marketing_opt_in: true, consent_source: 'newsletter_subscribe', consented_at: consentedAt, unsubscribed_at: null }, { onConflict: 'email' });
  if (error) {
    console.error('[Newsletter] Subscriber signup failed:', error);
    return NextResponse.json({ error: 'Newsletter signup is temporarily unavailable. Please try again.' }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
