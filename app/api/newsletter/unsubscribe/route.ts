import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const admin = getSupabaseAdmin();
  if (!admin || !token) return new NextResponse('This unsubscribe link is invalid or expired.', { status: 400 });

  const unsubscribedAt = new Date().toISOString();
  const result = await admin.from('newsletter_subscribers').update({ status: 'unsubscribed', marketing_opt_in: false, unsubscribed_at: unsubscribedAt }).eq('unsubscribe_token', token).select('email').maybeSingle();
  if (result.error || !result.data) return new NextResponse('This unsubscribe link is invalid or expired.', { status: 404 });

  const contactUpdate = await admin.from('email_contacts').update({ marketing_opt_in: false, unsubscribed_at: unsubscribedAt, updated_at: unsubscribedAt }).eq('email', result.data.email);
  if (contactUpdate.error) console.error('[Newsletter] Contact opt-out synchronization failed:', contactUpdate.error.message);

  return new NextResponse('<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed | HMSI</title></head><body style="font-family:Arial,sans-serif;padding:48px;color:#17221e"><h1 style="color:#1e5b49">You have been unsubscribed.</h1><p>You will no longer receive HMSI newsletters at this email address.</p></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
