import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../../../lib/adminSession';
import { hasSameOrigin } from '../../../../../../../lib/editorialAdmin';
import { getSupabaseAdmin } from '../../../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const RECOVERY_MS = 30 * 24 * 60 * 60 * 1000;
type SubjectType = 'volunteer' | 'member';

export async function POST(request: Request, { params }: { params: Promise<{ subjectType: string; id: string }> }) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-site user removal is not allowed.' }, { status: 403 });
  const { subjectType, id } = await params;
  if (subjectType !== 'volunteer' && subjectType !== 'member') return NextResponse.json({ error: 'Unsupported user type.' }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== 'REMOVE_30_DAYS') return NextResponse.json({ error: 'Type REMOVE_30_DAYS to confirm this recovery-window removal.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const source = subjectType === 'volunteer' ? 'volunteer_applications' : 'hmsi_members';
  const record = await admin.from(source).select('id,email,auth_user_id,status,account_status,removal_requested_at').eq('id', id).maybeSingle();
  if (record.error) return NextResponse.json({ error: 'The user record could not be loaded.' }, { status: 503 });
  if (!record.data) return NextResponse.json({ error: 'User record not found.' }, { status: 404 });
  if (record.data.removal_requested_at) return NextResponse.json({ error: 'A recovery-window removal is already pending for this user.' }, { status: 409 });
  const active = subjectType === 'volunteer' ? record.data.status === 'approved' && record.data.account_status === 'active' : record.data.status === 'active';
  if (!active) return NextResponse.json({ error: 'Only active approved users can enter recovery-window removal.' }, { status: 409 });
  const now = new Date(); const recoveryUntil = new Date(now.getTime() + RECOVERY_MS).toISOString();
  const values = subjectType === 'volunteer'
    ? { account_status: 'banned', removal_requested_at: now.toISOString(), removal_purge_after: recoveryUntil }
    : { status: 'inactive', removal_requested_at: now.toISOString(), removal_purge_after: recoveryUntil };
  const updated = await admin.from(source).update(values).eq('id', id).is('removal_requested_at', null).select('id').maybeSingle();
  if (updated.error || !updated.data) return NextResponse.json({ error: 'User access could not be revoked.' }, { status: updated.error ? 503 : 409 });
  const audit = await admin.from('user_removal_records').insert({ subject_type: subjectType as SubjectType, subject_id: id, auth_user_id: record.data.auth_user_id, subject_email: record.data.email, requested_by: adminEmail, recovery_until: recoveryUntil, reason: typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) || null : null });
  if (audit.error) return NextResponse.json({ error: 'Access was revoked, but the recovery record could not be saved.' }, { status: 503 });
  return NextResponse.json({ ok: true, recoveryUntil, message: 'Access has been revoked. This record remains recoverable for 30 days before final purge.' });
}
