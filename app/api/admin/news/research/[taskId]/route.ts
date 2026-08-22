import { NextResponse } from 'next/server';
import { extractManusTaskState, getAssistantAdminEmail, getAssistantSupabase, getManusAssistantMessages, recordAssistantAudit } from '../../../../../../lib/hmsiAssistant';

export const runtime = 'nodejs';

type Params = { params: Promise<{ taskId: string }> };

function jsonError(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function safeSourceDate(value: unknown) { const raw = clean(value, 80); if (!raw) return null; const date = new Date(raw); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }

export async function GET(request: Request, context: Params) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return jsonError('Admin authentication is required.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return jsonError('HMSI Assistant storage is not configured.', 503);
  const { taskId } = await context.params;
  if (!taskId || taskId.length > 160) return jsonError('Research task id is required.');

  const task = await admin.from('hmsi_news_research_tasks').select('id,manus_task_id,requested_by_email,scope,status,result,error_message,created_at,updated_at').eq('manus_task_id', taskId).eq('requested_by_email', adminEmail).maybeSingle();
  if (task.error) return jsonError('The research task could not be loaded.', 503);
  if (!task.data) return jsonError('Research task not found.', 404);

  let payload: any;
  try { payload = await getManusAssistantMessages(taskId); }
  catch (error) { const message = error instanceof Error ? error.message : 'Manus research status is unavailable.'; return jsonError(message, 502); }
  const state = extractManusTaskState(payload);
  const structured = state.structuredOutput;
  const nextStatus = ['running', 'waiting', 'error'].includes(state.status) ? state.status : 'stopped';
  const candidates = structured?.success && structured.value && typeof structured.value === 'object' && Array.isArray((structured.value as any).candidates) ? (structured.value as any).candidates : [];

  if (nextStatus === 'stopped' && structured && !structured.success) {
    await admin.from('hmsi_news_research_tasks').update({ status: 'error', error_message: structured.error || 'Structured research output failed.', updated_at: new Date().toISOString() }).eq('id', task.data.id);
    await recordAssistantAudit({ actorEmail: adminEmail, action: 'humanitarian_news_research_failed', manusTaskId: taskId, details: { error: structured.error || 'Structured research output failed.' } });
    return NextResponse.json({ task: { ...task.data, status: 'error' }, candidates: [], response: state.text, error: structured.error || 'Structured research output failed.' });
  }

  if (nextStatus === 'stopped' && structured?.success) {
    const existing = await admin.from('news_articles').select('id,source_url').eq('research_task_id', task.data.id).limit(100);
    if (existing.error) return jsonError('Existing research drafts could not be checked.', 503);
    const existingUrls = new Set((existing.data || []).map((article) => article.source_url).filter(Boolean));
    const rows = candidates.slice(0, 10).map((candidate: any) => {
      const sourceUrls = Array.isArray(candidate?.source_urls) ? candidate.source_urls.filter((url: unknown): url is string => typeof url === 'string' && /^https?:\/\//i.test(url)).slice(0, 8) : [];
      const sourceUrl = clean(candidate?.source_url, 1000) || sourceUrls[0] || '';
      const headline = clean(candidate?.headline, 220);
      const body = clean(candidate?.body, 10000);
      if (headline.length < 8 || body.length < 50 || !/^https?:\/\//i.test(sourceUrl) || existingUrls.has(sourceUrl)) return null;
      return {
        headline,
        summary: clean(candidate?.summary, 500),
        body,
        category: clean(candidate?.category, 100) || 'Global humanitarian update',
        image_url: null,
        author_name: 'HMSI Assistant — pending editorial review',
        author_email: adminEmail,
        author_role: 'admin',
        status: 'pending_admin_approval',
        source_name: clean(candidate?.source_name, 240) || 'Source requires human review',
        source_url: sourceUrl,
        source_urls: Array.from(new Set([sourceUrl, ...sourceUrls])),
        source_published_at: safeSourceDate(candidate?.source_published_at),
        verification_status: candidate?.verification_status === 'source_checked' ? 'source_checked' : 'candidate',
        verification_notes: clean(candidate?.verification_notes, 2000),
        verified_source_count: Math.max(0, Math.min(20, Number(candidate?.verified_source_count) || 0)),
        research_task_id: task.data.id,
      };
    }).filter(Boolean);
    if (rows.length > 0) {
      const inserted = await admin.from('news_articles').insert(rows).select('id,headline,status,source_name,source_url,verification_status,verified_source_count,created_at');
      if (inserted.error) return jsonError('Research completed, but the newsroom drafts could not be saved. Apply hmsi_news_worker_assistant_patch.sql first.', 503);
      await recordAssistantAudit({ actorEmail: adminEmail, action: 'humanitarian_news_drafts_created', manusTaskId: taskId, details: { draftCount: inserted.data?.length || 0 } });
    }
    await admin.from('hmsi_news_research_tasks').update({ status: 'stopped', result: { candidates, draft_count: rows.length }, updated_at: new Date().toISOString() }).eq('id', task.data.id);
    return NextResponse.json({ task: { ...task.data, status: 'stopped' }, candidates, drafts: rows.length });
  }

  if (nextStatus !== task.data.status) await admin.from('hmsi_news_research_tasks').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', task.data.id);
  return NextResponse.json({ task: { ...task.data, status: nextStatus }, candidates: [], response: state.text });
}
