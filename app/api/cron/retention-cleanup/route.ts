import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 30;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SOURCES = ['volunteer_applications', 'hmsi_member_applications', 'opportunity_applications'] as const;
type Source = typeof SOURCES[number];

function authorized(request: Request) { const secret = process.env.CRON_SECRET?.trim(); return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`; }
function deadline(now: Date) { return new Date(now.getTime() + RETENTION_MS).toISOString(); }

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const now = new Date(); const nowIso = now.toISOString(); let archivedApproved = 0; let scheduledRejected = 0; let purgedRejected = 0; let purgedUsers = 0;
  try {
    for (const source of SOURCES) {
      const approved = await admin.from(source).select('*').eq('status', 'approved').is('archived_at', null).order('reviewed_at', { ascending: true }).limit(50);
      if (approved.error) throw approved.error;
      for (const record of approved.data || []) {
        const archived = await admin.from('archived_applications').upsert({ source_table: source, source_id: record.id, status_at_archive: 'approved', snapshot: record, archived_at: nowIso }, { onConflict: 'source_table,source_id' });
        if (archived.error) throw archived.error;
        const updated = await admin.from(source).update({ archived_at: nowIso }).eq('id', record.id).is('archived_at', null);
        if (updated.error) throw updated.error;
        archivedApproved += 1;
      }
      const rejected = await admin.from(source).select('*').eq('status', 'rejected').is('removal_requested_at', null).order('reviewed_at', { ascending: true }).limit(50);
      if (rejected.error) throw rejected.error;
      for (const record of rejected.data || []) {
        const purgeAfter = deadline(now);
        const archived = await admin.from('archived_applications').upsert({ source_table: source, source_id: record.id, status_at_archive: 'rejected', snapshot: record, archived_at: nowIso, purge_after: purgeAfter }, { onConflict: 'source_table,source_id' });
        if (archived.error) throw archived.error;
        const updated = await admin.from(source).update({ removal_requested_at: nowIso, removal_purge_after: purgeAfter, archived_at: nowIso }).eq('id', record.id).is('removal_requested_at', null);
        if (updated.error) throw updated.error;
        scheduledRejected += 1;
      }
      const due = await admin.from(source).select('id').eq('status', 'rejected').not('removal_purge_after', 'is', null).lte('removal_purge_after', nowIso).limit(50);
      if (due.error) throw due.error;
      for (const record of due.data || []) {
        const deleted = await admin.from(source).delete().eq('id', record.id).eq('status', 'rejected').lte('removal_purge_after', nowIso);
        if (deleted.error) throw deleted.error;
        const marked = await admin.from('archived_applications').update({ purged_at: nowIso }).eq('source_table', source).eq('source_id', record.id).is('purged_at', null);
        if (marked.error) throw marked.error;
        purgedRejected += 1;
      }
    }
    const removals = await admin.from('user_removal_records').select('id,subject_type,subject_id,auth_user_id').eq('state', 'recoverable').lte('recovery_until', nowIso).order('recovery_until', { ascending: true }).limit(25);
    if (removals.error) throw removals.error;
    for (const removal of removals.data || []) {
      if (removal.subject_type === 'volunteer') {
        const deleted = await admin.from('volunteer_applications').delete().eq('id', removal.subject_id).eq('account_status', 'banned').lte('removal_purge_after', nowIso);
        if (deleted.error) throw deleted.error;
      } else if (removal.subject_type === 'member') {
        const tasks = await admin.from('hmsi_member_tasks').delete().eq('assigned_member_id', removal.subject_id);
        if (tasks.error && tasks.error.code !== '42P01') throw tasks.error;
        const deleted = await admin.from('hmsi_members').delete().eq('id', removal.subject_id).eq('status', 'inactive').lte('removal_purge_after', nowIso);
        if (deleted.error) throw deleted.error;
      } else if (removal.subject_type === 'worker') {
      const assignments = await admin.from('work_assignments').delete().eq('assigned_worker_id', removal.subject_id);
      if (assignments.error) throw assignments.error;
      const assessments = await admin.from('hmsi_monthly_worker_assessments').delete().eq('worker_id', removal.subject_id);
      if (assessments.error && assessments.error.code !== '42P01') throw assessments.error;
      const cards = await admin.from('hmsi_id_cards').delete().eq('holder_role', 'worker').eq('holder_id', removal.subject_id);
      if (cards.error) throw cards.error;
      const worker = await admin.from('workers').delete().eq('id', removal.subject_id).eq('status', 'inactive').lte('removal_purge_after', nowIso);
      if (worker.error) throw worker.error;
      }
      if (removal.auth_user_id) { const auth = await admin.auth.admin.deleteUser(removal.auth_user_id); if (auth.error) throw auth.error; }
      const completed = await admin.from('user_removal_records').update({ state: 'purged', purged_at: nowIso }).eq('id', removal.id).eq('state', 'recoverable');
      if (completed.error) throw completed.error;
      purgedUsers += 1;
    }
    return NextResponse.json({ ok: true, archivedApproved, scheduledRejected, purgedRejected, purgedUsers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Retention cleanup] Failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Retention cleanup failed.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
