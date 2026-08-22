import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const ALLOWED_STATUSES = new Set(['approved', 'rejected', 'active', 'expired']);

function isAdmin(request: Request) { return Boolean(getAdminEmailFromCookie(request.headers.get('cookie'))); }

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const result = await admin.from('sponsorship_requests').select('id,requester_name,requester_email,organisation_name,title,description,target_url,creative_url,budget_ngn,status,admin_note,payment_reference,reviewed_by,reviewed_at,paid_at,starts_at,ends_at,created_at').order('created_at', { ascending: false }).limit(200);
  if (result.error) return NextResponse.json({ error: 'Sponsorship requests are temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ sponsorships: result.data || [] });
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'A valid JSON sponsorship review is required.' }, { status: 400 }); }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
  const adminNote = typeof body.admin_note === 'string' ? body.admin_note.trim().slice(0, 2000) : null;
  const startsAt = typeof body.starts_at === 'string' && body.starts_at ? new Date(body.starts_at).toISOString() : null;
  const endsAt = typeof body.ends_at === 'string' && body.ends_at ? new Date(body.ends_at).toISOString() : null;
  if (!id || !ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'A sponsorship id and valid review status are required.' }, { status: 400 });
  if (startsAt && endsAt && new Date(startsAt).getTime() >= new Date(endsAt).getTime()) return NextResponse.json({ error: 'End time must be later than start time.' }, { status: 400 });

  const existing = await admin.from('sponsorship_requests').select('id,status,payment_reference').eq('id', id).maybeSingle();
  if (existing.error) return NextResponse.json({ error: 'Sponsorship request could not be loaded.' }, { status: 503 });
  if (!existing.data) return NextResponse.json({ error: 'Sponsorship request not found.' }, { status: 404 });
  if (status === 'active' && existing.data.status !== 'paid') return NextResponse.json({ error: 'A sponsorship can only be activated after verified payment.' }, { status: 409 });

  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie')) || 'admin';
  const update = await admin.from('sponsorship_requests').update({ status, admin_note: adminNote, reviewed_by: adminEmail, reviewed_at: new Date().toISOString(), starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString() }).eq('id', id).select('id,status,reviewed_by,reviewed_at,starts_at,ends_at').single();
  if (update.error) { console.error('[Admin Sponsorships] Failed to update:', update.error); return NextResponse.json({ error: 'The sponsorship review could not be saved.' }, { status: 503 }); }
  return NextResponse.json({ sponsorship: update.data });
}
