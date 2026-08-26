import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { getEditorialAdmin, hasSameOrigin } from '../../../../../lib/editorialAdmin';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ARCHIVE_REASON = 'Bulk news reset: archived by administrator; reversible through the archived editorial queue.';
const SOURCE_STATUSES = ['published', 'approved'] as const;
const BATCH_SIZE = 50;

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const actor = getEditorialAdmin(request);
  if (!actor) return responseError('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return responseError('Cross-site news reset requests are not allowed.', 403);

  const admin = getSupabaseAdmin();
  if (!admin) return responseError('Supabase is not configured on the server.', 503);

  const payload = await request.json().catch(() => ({}));
  if (payload.confirm !== 'ARCHIVE_ALL_PUBLISHED_NEWS') {
    return responseError('Explicit confirmation is required to archive published and approved news.');
  }

  const now = new Date().toISOString();
  let archived = 0;
  let examined = 0;

  try {
    while (true) {
      const { data: candidates, error: lookupError } = await admin
        .from('news_articles')
        .select('id,status')
        .in('status', [...SOURCE_STATUSES])
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE);
      if (lookupError) throw lookupError;
      if (!candidates?.length) break;

      examined += candidates.length;
      for (const candidate of candidates) {
        const { data: updated, error: updateError } = await admin
          .from('news_articles')
          .update({
            status: 'archived',
            archived_at: now,
            archive_reason: ARCHIVE_REASON,
            scheduled_archive_at: null,
            reviewed_by: actor,
            reviewed_at: now,
          })
          .eq('id', candidate.id)
          .eq('status', candidate.status)
          .select('id,status')
          .maybeSingle();
        if (updateError) throw updateError;
        if (!updated) continue;

        const { error: eventError } = await admin.from('news_approval_events').insert({
          news_id: candidate.id,
          action: 'archived',
          actor_email: actor,
          actor_role: 'admin',
          reason: ARCHIVE_REASON,
        });
        if (eventError) throw eventError;
        archived += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      examined,
      archived,
      sourceStatuses: SOURCE_STATUSES,
      reversible: true,
      message: archived ? `Archived ${archived} news record${archived === 1 ? '' : 's'}; no hard deletion was performed.` : 'No published or approved news records required archiving.',
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (cause) {
    console.error('[News reset] Failed:', cause instanceof Error ? cause.message : 'unknown');
    return responseError('News archive reset failed. Review the audit log and retry only after reconciliation.', 500);
  }
}
