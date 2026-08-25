import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../../lib/adminSession';
import { hasSameOrigin } from '../../../../../../lib/editorialAdmin';
import { getSupabaseAdmin } from '../../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const RECOVERY_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-site user removal is not allowed.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== 'REMOVE_30_DAYS') return NextResponse.json({ error: 'Type REMOVE_30_DAYS to confirm this recovery-window removal.' }, { status: 400 });
  const database = getSupabaseAdmin();
  if (!database) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const { id } = await params;
  const worker = await database.from('workers').select('id,email,auth_user_id,status,removal_requested_at').eq('id', id).maybeSingle();
  if (worker.error) return NextResponse.json({ error: 'The worker record could not be loaded.' }, { status: 503 });
  if (!worker.data) return NextResponse.json({ error: 'Worker record not found.' }, { status: 404 });
  if (worker.data.removal_requested_at) return NextResponse.json({ error: 'A recovery-window removal is already pending for this worker.' }, { status: 409 });
  const now = new Date();
  const recoveryUntil = new Date(now.getTime() + RECOVERY_MS).toISOString();
  const update = await database.from('workers').update({ status: 'inactive', removal_requested_at: now.toISOString(), removal_purge_after: recoveryUntil }).eq('id', id).eq('status', 'active').is('removal_requested_at', null).select('id').maybeSingle();
  if (update.error) return NextResponse.json({ error: 'The worker access state could not be updated.' }, { status: 503 });
  if (!update.data) return NextResponse.json({ error: 'The worker is no longer eligible for this action.' }, { status: 409 });
  const record = await database.from('user_removal_records').insert({ subject_type: 'worker', subject_id: id, auth_user_id: worker.data.auth_user_id, subject_email: worker.data.email, requested_by: adminEmail, recovery_until: recoveryUntil, reason: typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) || null : null });
  if (record.error) return NextResponse.json({ error: 'Access was revoked, but the removal audit record could not be created. Contact a system administrator.' }, { status: 503 });
  const event = await database.from('portal_access_events').insert({ worker_id: id, event_type: 'assignment_status_changed', actor_email: adminEmail, metadata: { action: 'removal_requested', recovery_until: recoveryUntil } });
  if (event.error) console.error('[Admin user removal] Activity event could not be recorded:', event.error.message);
  return NextResponse.json({ ok: true, recoveryUntil, message: 'Access has been revoked. The record remains recoverable for 30 days before final purge.' });
}
