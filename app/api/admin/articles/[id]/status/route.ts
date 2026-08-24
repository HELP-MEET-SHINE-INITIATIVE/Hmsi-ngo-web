import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../../lib/supabaseAdmin';
import { ARTICLE_SELECT, allowedAction, cleanText, getEditorialAdmin, hasSameOrigin } from '../../../../../../lib/editorialAdmin';
import { editorialRevisionRequestedTemplate, sendHmsiNotification } from '../../../../../../lib/hmsiNotifications';

export const runtime = 'nodejs';

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function recordEvent(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, newsId: string, action: string, actor: string, reason?: string) {
  const { error: eventError } = await admin.from('news_approval_events').insert({
    news_id: newsId,
    action,
    actor_email: actor,
    actor_role: 'admin',
    reason: reason || null,
  });
  if (eventError) throw eventError;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = getEditorialAdmin(request);
  if (!actor) return error('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return error('Cross-site editorial updates are not allowed.', 403);

  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);

  try {
    const { id } = await context.params;
    const articleId = cleanText(id, 80);
    const payload = await request.json().catch(() => ({}));
    const action = allowedAction(payload.action);
    const reason = cleanText(payload.reason, 500);
    if (!articleId || !action) return error('An article and a valid editorial action are required.');
    if ((action === 'reject' || action === 'request_revisions') && reason.length < 3) return error('Add clear editorial feedback before continuing.');

    const { data: existing, error: lookupError } = await admin.from('news_articles').select(ARTICLE_SELECT).eq('id', articleId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return error('Article not found.', 404);
    if (existing.status === 'archived') return error('Archived articles cannot be edited or published.', 409);

    const now = new Date().toISOString();
    let update: Record<string, unknown> = { reviewed_by: actor, reviewed_at: now };
    let eventAction: string = action;
    let message = 'Editorial update saved.';

    if (action === 'approve_publish') {
      if (!existing.image_url) return error('Choose a primary news image before publishing. It will be used on the public headline card and article page.');
      update = { ...update, status: 'published', approved_by: actor, approved_at: now, published_at: now, rejection_reason: null, scheduled_archive_at: null, archive_reason: null };
      eventAction = 'published';
      message = 'Article approved and published.';
    } else if (action === 'request_revisions') {
      update = { ...update, status: 'revision_requested', revision_feedback: reason, revision_requested_at: now, rejection_reason: null };
      eventAction = 'revision_requested';
      message = 'Revision feedback saved for the contributor. The dispatch is ready for protected re-submission.';
    } else if (action === 'reject') {
      update = { ...update, status: 'rejected', rejection_reason: reason };
      eventAction = 'rejected';
      message = 'Article rejected and returned to the draft queue.';
    } else if (action === 'archive') {
      update = { ...update, status: 'archived', archived_at: now, archive_reason: reason || 'Archived by administrator.', scheduled_archive_at: null };
      eventAction = 'archived';
      message = 'Article archived. The editorial record has been retained.';
    } else {
      const headline = cleanText(payload.headline, 220);
      const summary = cleanText(payload.summary, 800);
      const body = cleanText(payload.body, 12000);
      const category = cleanText(payload.category, 100) || existing.category;
      if (headline.length < 5 || summary.length < 20 || body.length < 40) return error('Add a headline, a summary of at least 20 characters, and article content of at least 40 characters.');
      update = { ...update, headline, summary, body, category, status: 'draft', rejection_reason: null, revision_feedback: null, revision_requested_at: null };
      eventAction = action === 'edit' ? 'edited' : 'saved_draft';
      message = action === 'edit' ? 'Article edits saved as a draft.' : 'Article saved in the draft queue.';
    }

    const { data: article, error: updateError } = await admin.from('news_articles').update(update).eq('id', articleId).select(ARTICLE_SELECT).single();
    if (updateError || !article) throw updateError || new Error('Article update failed.');

    await recordEvent(admin, articleId, eventAction, actor, reason || undefined);
    if (action === 'request_revisions' && existing.author_role === 'volunteer' && existing.author_email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng';
        const content = editorialRevisionRequestedTemplate({ name: existing.author_name, headline: existing.headline, feedback: reason, workspaceUrl: `${baseUrl}/portal/submit-news` });
        await sendHmsiNotification({ sender: 'admin', to: [existing.author_email], subject: `HMSI Editorial Team: revisions requested for ${existing.headline}`, ...content, idempotencyKey: `editorial_revision_${articleId}_${new Date(now).getTime()}` });
      } catch (notificationError) {
        console.error('[Editorial] Revision notification was not delivered:', notificationError instanceof Error ? notificationError.message : 'unknown');
      }
    }
    return NextResponse.json({ article, message }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (cause) {
    console.error('[Editorial] Failed to update article:', cause instanceof Error ? cause.message : 'unknown');
    return error('Unable to save the editorial update.', 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = getEditorialAdmin(request);
  if (!actor) return error('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return error('Cross-site editorial updates are not allowed.', 403);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);

  try {
    const { id } = await context.params;
    const articleId = cleanText(id, 80);
    if (!articleId) return error('An article ID is required.');
    const now = new Date().toISOString();
    const { data: article, error: updateError } = await admin
      .from('news_articles')
      .update({ status: 'archived', archived_at: now, archive_reason: 'Archived by administrator.', reviewed_by: actor, reviewed_at: now, scheduled_archive_at: null })
      .eq('id', articleId)
      .neq('status', 'archived')
      .select(ARTICLE_SELECT)
      .maybeSingle();
    if (updateError) throw updateError;
    if (!article) return error('Article not found or already archived.', 404);
    await recordEvent(admin, articleId, 'archived', actor, 'Archived by administrator.');
    return NextResponse.json({ article, message: 'Article archived. No hard deletion was performed.' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (cause) {
    console.error('[Editorial] Failed to archive article:', cause instanceof Error ? cause.message : 'unknown');
    return error('Unable to archive the article.', 500);
  }
}
