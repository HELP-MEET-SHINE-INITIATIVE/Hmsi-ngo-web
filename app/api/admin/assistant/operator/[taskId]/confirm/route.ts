import { NextResponse } from 'next/server';
import { getAssistantAdminEmail, getAssistantSupabase, recordAssistantAudit } from '../../../../../../../lib/hmsiAssistant';
import { checkCommunityAntiSpam } from '../../../../../../../lib/communityAntiSpam';
import { operatorHtml } from '../../../../../../../lib/hmsiOperator';
import { sendResendEmailWithRetry } from '../../../../../../../lib/resendRetryQueue';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function text(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

async function executeNewsletter(admin: NonNullable<ReturnType<typeof getAssistantSupabase>>, actionId: string, preview: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY?.trim(); const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error('Newsletter delivery is not configured.');
  const subject = text(preview.subject, 240); const body = text(preview.body || preview.content, 20000);
  if (!subject || !body) throw new Error('The newsletter preview is missing a subject or body.');
  const subscribers = await admin.from('newsletter_subscribers').select('email,unsubscribe_token').eq('status', 'active').order('subscribed_at', { ascending: true }).limit(10000);
  if (subscribers.error) throw new Error('Active newsletter subscribers could not be loaded.');
  if (!subscribers.data?.length) throw new Error('There are no active newsletter subscribers.');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng';
  const results: Array<Record<string, unknown>> = [];
  for (let index = 0; index < subscribers.data.length; index += 100) {
    const batch = subscribers.data.slice(index, index + 100).map((subscriber) => ({ from, to: [subscriber.email], subject, html: operatorHtml(subject, body, `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`) }));
    const response = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `hmsi-operator-newsletter-${actionId}-${index}` }, body: JSON.stringify(batch) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || 'Resend rejected the newsletter batch.');
    results.push(...batch.map((item, batchIndex) => ({ email: item.to[0], provider_message_id: payload?.data?.[batchIndex]?.id || null, status: 'sent' })));
  }
  const draft = await admin.from('newsletter_drafts').insert({ title: text(preview.headline || preview.subject, 240) || subject, subject, body, author_name: 'HMSI Admin Operator', author_email: 'admin', author_role: 'admin', status: 'sent', admin_approved_by: 'operator-confirmation', admin_approved_at: new Date().toISOString(), sent_at: new Date().toISOString() }).select('id').single();
  if (draft.error || !draft.data) throw new Error('The newsletter was sent but its HMSI delivery record could not be saved.');
  await admin.from('newsletter_delivery_logs').insert(results.map((item) => ({ newsletter_id: draft.data.id, subscriber_email: item.email, provider: 'resend', provider_message_id: item.provider_message_id, status: item.status })));
  return { newsletter_id: draft.data.id, sent_count: results.length, recipient_scope: 'active newsletter subscribers only' };
}

export async function DELETE(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const adminEmail = getAssistantAdminEmail(request); if (!adminEmail) return error('Admin authentication is required.', 401);
  const { taskId } = await context.params; const admin = getAssistantSupabase(); if (!admin) return error('HMSI Assistant storage is not configured.', 503);
  const record = await admin.from('hmsi_operator_actions').select('id,status').eq('manus_task_id', taskId).eq('requested_by', adminEmail).maybeSingle();
  if (record.error || !record.data) return error('Operator action not found.', 404);
  if (record.data.status !== 'pending_confirmation') return error('This operator action is no longer awaiting confirmation.', 409);
  const updated = await admin.from('hmsi_operator_actions').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', record.data.id).select('id,status').single();
  await recordAssistantAudit({ actorEmail: adminEmail, action: 'operator_action_rejected', manusTaskId: taskId });
  return NextResponse.json({ action: updated.data || { id: record.data.id, status: 'rejected' } });
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const adminEmail = getAssistantAdminEmail(request); if (!adminEmail) return error('Admin authentication is required.', 401);
  const { taskId } = await context.params; const admin = getAssistantSupabase(); if (!admin) return error('HMSI Assistant storage is not configured.', 503);
  const record = await admin.from('hmsi_operator_actions').select('id,manus_task_id,requested_by,action_type,status,prompt,preview,expires_at').eq('manus_task_id', taskId).eq('requested_by', adminEmail).maybeSingle();
  if (record.error || !record.data) return error('Operator action not found.', 404);
  if (record.data.status !== 'pending_confirmation') return error('This operator action is no longer awaiting confirmation.', 409);
  if (new Date(record.data.expires_at).getTime() < Date.now()) return error('This operator action preview has expired.', 409);
  const preview = (record.data.preview || {}) as Record<string, unknown>;
  const actionType = record.data.action_type;
  let result: Record<string, unknown>;
  try {
    if (actionType === 'none') result = { message: text(preview.assistant_response, 4000) || 'No portal action was proposed.' };
    else if (actionType === 'reply_email') {
      const messageId = text(preview.message_id, 100); const body = text(preview.body, 10000);
      if (!messageId || !body) throw new Error('The reply preview is incomplete.');
      const message = await admin.from('contact_messages').select('id,name,email,message').eq('id', messageId).maybeSingle();
      if (message.error || !message.data) throw new Error('The original contact message was not found.');
      const apiKey = process.env.RESEND_API_KEY?.trim(); const from = process.env.RESEND_FROM_EMAIL?.trim();
      if (!apiKey || !from) throw new Error('Outbound email is not configured.');
      const subject = text(preview.subject, 240) || 'Re: HMSI enquiry';
      const dispatch = await sendResendEmailWithRetry(apiKey, { from, to: [message.data.email], subject, html: operatorHtml(subject, body), text: body, idempotencyKey: `hmsi-operator-reply-${record.data.id}` }, { maxRetries: 3, baseDelayMs: 300, maxDelayMs: 3000 });
      if (!dispatch.ok) throw new Error(dispatch.error || 'The reply email was not accepted by Resend.');
      const saved = await admin.from('contact_message_replies').insert({ message_id: messageId, author_name: 'HMSI Admin', author_email: adminEmail, author_role: 'admin', body }).select('id').single();
      if (saved.error) throw new Error('The email was sent but the internal reply record could not be saved.');
      result = { message_id: messageId, recipient: message.data.email, sent: true, reply_id: saved.data?.id || null };
    } else if (actionType === 'newsletter') result = await executeNewsletter(admin, record.data.id, preview);
    else if (actionType === 'publication') {
      const headline = text(preview.headline, 240); const summary = text(preview.summary, 600); const content = text(preview.content || preview.body, 20000); const sourceUrls = Array.isArray(preview.source_urls) ? preview.source_urls.filter((item): item is string => typeof item === 'string' && /^https?:\/\//.test(item)).slice(0, 10) : [];
      if (!headline || !summary || !content) throw new Error('The publication preview is incomplete.');
      const article = await admin.from('news_articles').insert({ headline, summary, body: content, category: 'humanitarian', status: 'pending_admin_approval', source_name: 'HMSI Assistant research', source_url: sourceUrls[0] || null, source_urls: sourceUrls, verification_status: 'not_reviewed', verification_notes: text(preview.verification_notes, 2000) || 'Requires administrator source review before publication.', author_name: 'HMSI Admin Operator', author_email: adminEmail }).select('id,headline,status,verification_status').single();
      if (article.error || !article.data) throw new Error('The publication draft could not be saved.');
      result = { publication_id: article.data.id, status: 'pending_admin_approval', source_count: sourceUrls.length };
    } else if (actionType === 'volunteer_room_post' || actionType === 'worker_room_post') {
      const room = actionType === 'worker_room_post' ? 'worker' : 'volunteer'; const content = text(preview.content || preview.body, 5000); if (!content) throw new Error('The room-post preview is empty.');
      const spam = await checkCommunityAntiSpam(admin, 'community_posts', `${adminEmail}:admin`, content); if (!spam.allowed) throw new Error(spam.error);
      const post = await admin.from('community_posts').insert({ audience: room, author_name: 'HMSI Admin', author_role: 'admin', author_key: `${adminEmail}:admin`, content: spam.normalized, content_hash: spam.hash, moderation_status: 'published', spam_score: spam.spamScore }).select('id,audience,content,created_at').single();
      if (post.error || !post.data) throw new Error('The room post could not be saved.');
      result = { post_id: post.data.id, room: `${room}_room`, status: 'published' };
    } else throw new Error('Unsupported operator action.');
    const updated = await admin.from('hmsi_operator_actions').update({ status: 'executed', result, confirmed_at: new Date().toISOString(), executed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', record.data.id).select('id,action_type,status,result,executed_at').single();
    await recordAssistantAudit({ actorEmail: adminEmail, action: 'operator_action_executed', manusTaskId: taskId, details: { actionType, result } });
    return NextResponse.json({ action: updated.data || { id: record.data.id, action_type: actionType, status: 'executed', result } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The operator action failed.';
    await admin.from('hmsi_operator_actions').update({ status: 'error', error_message: message, updated_at: new Date().toISOString() }).eq('id', record.data.id);
    await recordAssistantAudit({ actorEmail: adminEmail, action: 'operator_action_failed', manusTaskId: taskId, details: { actionType, message } });
    return error(message, 502);
  }
}
