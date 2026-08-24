import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 30;
const ELIGIBLE_STATUSES = ['draft', 'pending_admin_approval', 'pending_editorial_review', 'revision_requested', 'approved', 'rejected'];

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  try {
    const now = new Date().toISOString();
    const { data: candidates, error } = await admin
      .from('news_articles')
      .select('id,status')
      .in('status', ELIGIBLE_STATUSES)
      .not('scheduled_archive_at', 'is', null)
      .lte('scheduled_archive_at', now)
      .order('scheduled_archive_at', { ascending: true })
      .limit(50);
    if (error) throw error;

    let archived = 0;
    for (const candidate of candidates || []) {
      const { data: updated, error: updateError } = await admin
        .from('news_articles')
        .update({ status: 'archived', archived_at: now, archive_reason: 'Automatically archived after 10 days without publication.', scheduled_archive_at: null, reviewed_by: 'system@hmsi.org.ng', reviewed_at: now })
        .eq('id', candidate.id)
        .eq('status', candidate.status)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) continue;
      archived += 1;
      const { error: eventError } = await admin.from('news_approval_events').insert({ news_id: candidate.id, action: 'archived', actor_email: 'system@hmsi.org.ng', actor_role: 'admin', reason: 'Automatically archived after 10 days without publication.' });
      if (eventError) throw eventError;
    }

    return NextResponse.json({ ok: true, candidates: candidates?.length || 0, archived }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (cause) {
    console.error('[Editorial archive cron] Failed:', cause instanceof Error ? cause.message : 'unknown');
    return NextResponse.json({ error: 'Editorial archive processing failed.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
