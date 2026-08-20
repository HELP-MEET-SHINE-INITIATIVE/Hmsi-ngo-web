import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getNewsletterViewer, getNewsletterViewerPayload } from '../../../lib/newsletterAccess';

export const runtime = 'nodejs';

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

function newsletterHtml(title: string, body: string, unsubscribeUrl: string) {
  const paragraphs = body.split(/\n\s*\n/).map((paragraph) => `<p style="line-height:1.7;color:#33443b">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`).join('');
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:36px 22px;color:#17221e"><p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b56b3b;font-weight:700">Help Meet Shine Initiative</p><h1 style="font-size:34px;line-height:1.15;color:#1e5b49">${escapeHtml(title)}</h1>${paragraphs}<hr style="border:0;border-top:1px solid #e5e1d8;margin:32px 0" /><p style="font-size:12px;color:#66716a">You are receiving this because you joined the HMSI newsletter. <a href="${unsubscribeUrl}" style="color:#1e5b49">Unsubscribe</a>.</p></div>`;
}

async function recordEvent(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, newsletterId: string, viewer: NonNullable<Awaited<ReturnType<typeof getNewsletterViewer>>>, action: string, note?: string) {
  const result = await admin.from('newsletter_approval_events').insert({
    newsletter_id: newsletterId,
    actor_name: viewer.name,
    actor_email: viewer.email,
    actor_role: viewer.role,
    action,
    note: note || null,
  });
  if (result.error) console.error('[Newsletter] Event could not be recorded:', result.error);
}

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return errorResponse('Supabase is not configured on the server.', 503);

  const viewer = await getNewsletterViewer(request, admin, getNewsletterViewerPayload(request));
  if (!viewer) return errorResponse('Admin authentication or approved volunteer/worker access is required.', 401);

  const drafts = await admin.from('newsletter_drafts').select('id,title,subject,body,author_name,author_email,author_role,status,worker_approved_by,worker_approved_at,admin_approved_by,admin_approved_at,rejection_reason,sent_at,created_at,updated_at').order('created_at', { ascending: false }).limit(100);
  if (drafts.error) return errorResponse('Newsletter tables are unavailable. Run supabase/newsletter_patch.sql.', 503);

  const events = drafts.data && drafts.data.length > 0
    ? await admin.from('newsletter_approval_events').select('id,newsletter_id,actor_name,actor_email,actor_role,action,note,created_at').in('newsletter_id', drafts.data.map((draft) => draft.id)).order('created_at', { ascending: true })
    : { data: [], error: null };
  if (events.error) return errorResponse('Newsletter approval history is unavailable. Run supabase/newsletter_patch.sql.', 503);

  const visibleDrafts = viewer.role === 'admin'
    ? drafts.data || []
    : (drafts.data || []).filter((draft) => draft.author_email.toLowerCase() === viewer.email.toLowerCase() || draft.status === 'pending_worker_approval' || draft.status === 'approved' || draft.status === 'sent');

  return NextResponse.json({ viewer, drafts: visibleDrafts.map((draft) => ({ ...draft, events: (events.data || []).filter((event) => event.newsletter_id === draft.id) })) });
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return errorResponse('Supabase is not configured on the server.', 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('A valid JSON payload is required.');
  }

  const viewer = await getNewsletterViewer(request, admin, body);
  if (!viewer) return errorResponse('Admin authentication or approved volunteer/worker access is required.', 401);

  const action = cleanText(body.action, 40);
  if (action === 'create') {
    const title = cleanText(body.title, 240);
    const subject = cleanText(body.subject, 240);
    const newsletterBody = cleanText(body.body, 20000);
    if (!title || !subject || !newsletterBody) return errorResponse('Title, subject, and newsletter content are required.');

    const initialStatus = viewer.role === 'admin' ? 'approved' : viewer.role === 'worker' ? 'pending_admin_approval' : 'pending_worker_approval';
    const draft = await admin.from('newsletter_drafts').insert({
      title,
      subject,
      body: newsletterBody,
      author_name: viewer.name,
      author_email: viewer.email,
      author_role: viewer.role,
      status: initialStatus,
      admin_approved_by: viewer.role === 'admin' ? viewer.email : null,
      admin_approved_at: viewer.role === 'admin' ? new Date().toISOString() : null,
    }).select('id,title,subject,body,author_name,author_email,author_role,status,created_at').single();
    if (draft.error || !draft.data) return errorResponse(draft.error?.message || 'The newsletter draft could not be saved.', 503);

    await recordEvent(admin, draft.data.id, viewer, 'submitted');
    if (viewer.role === 'admin') await recordEvent(admin, draft.data.id, viewer, 'admin_approved');
    return NextResponse.json({ ok: true, draft: draft.data }, { status: 201 });
  }

  const newsletterId = cleanText(body.newsletter_id, 80);
  if (!newsletterId) return errorResponse('A newsletter id is required.');
  const current = await admin.from('newsletter_drafts').select('*').eq('id', newsletterId).maybeSingle();
  if (current.error || !current.data) return errorResponse('Newsletter draft not found.', 404);
  const draft = current.data;

  if (action === 'approve_worker') {
    if (viewer.role !== 'worker') return errorResponse('Only an approved worker can perform worker approval.');
    if (draft.status !== 'pending_worker_approval') return errorResponse('This newsletter is not waiting for worker approval.');
    const updated = await admin.from('newsletter_drafts').update({ status: 'pending_admin_approval', worker_approved_by: viewer.email, worker_approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', newsletterId).select('*').single();
    if (updated.error) return errorResponse('The newsletter could not be approved.', 503);
    await recordEvent(admin, newsletterId, viewer, 'worker_approved');
    return NextResponse.json({ ok: true, draft: updated.data });
  }

  if (action === 'approve_admin') {
    if (viewer.role !== 'admin') return errorResponse('Only an administrator can give final approval.');
    if (!['draft', 'pending_worker_approval', 'pending_admin_approval', 'rejected'].includes(draft.status)) return errorResponse('This newsletter is not waiting for admin approval.');
    const updated = await admin.from('newsletter_drafts').update({ status: 'approved', admin_approved_by: viewer.email, admin_approved_at: new Date().toISOString(), rejection_reason: null, updated_at: new Date().toISOString() }).eq('id', newsletterId).select('*').single();
    if (updated.error) return errorResponse('The newsletter could not be approved.', 503);
    await recordEvent(admin, newsletterId, viewer, 'admin_approved');
    return NextResponse.json({ ok: true, draft: updated.data });
  }

  if (action === 'reject') {
    if (viewer.role !== 'admin' && viewer.role !== 'worker') return errorResponse('Only an administrator or worker can reject a newsletter.');
    if (viewer.role === 'worker' && draft.status !== 'pending_worker_approval') return errorResponse('Workers may only reject drafts awaiting worker approval.');
    if (viewer.role === 'admin' && !['draft', 'pending_worker_approval', 'pending_admin_approval', 'approved'].includes(draft.status)) return errorResponse('This newsletter cannot be rejected in its current state.');
    const reason = cleanText(body.reason, 1000) || 'Please revise this draft before resubmitting.';
    const updated = await admin.from('newsletter_drafts').update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() }).eq('id', newsletterId).select('*').single();
    if (updated.error) return errorResponse('The newsletter could not be rejected.', 503);
    await recordEvent(admin, newsletterId, viewer, 'rejected', reason);
    return NextResponse.json({ ok: true, draft: updated.data });
  }

  if (action === 'send') {
    if (viewer.role !== 'admin') return errorResponse('Only an administrator can send newsletters.');
    if (draft.status !== 'approved') return errorResponse('Only an approved newsletter can be sent.');

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (!apiKey || !from) return errorResponse('Newsletter delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to Vercel.', 503);

    const subscribers = await admin.from('newsletter_subscribers').select('email,unsubscribe_token').eq('status', 'active').order('subscribed_at', { ascending: true });
    if (subscribers.error) return errorResponse('Newsletter subscriber data is unavailable. Run supabase/newsletter_patch.sql.', 503);
    if (!subscribers.data || subscribers.data.length === 0) return errorResponse('There are no active newsletter subscribers yet.');

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng';
    const emails = subscribers.data.map((subscriber) => ({
      from,
      to: [subscriber.email],
      subject: draft.subject,
      html: newsletterHtml(draft.title, draft.body, `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`),
    }));
    const deliveryLogs: Array<Record<string, unknown>> = [];
    for (let index = 0; index < emails.length; index += 100) {
      const batch = emails.slice(index, index + 100);
      const resendResponse = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `hmsi-newsletter-${newsletterId}-${index}` },
        body: JSON.stringify(batch),
      });
      const resendResult = await resendResponse.json().catch(() => ({}));
      if (!resendResponse.ok) {
        await admin.from('newsletter_delivery_logs').insert(batch.map((item) => ({ newsletter_id: newsletterId, subscriber_email: item.to[0], provider: 'resend', status: 'failed', error_message: resendResult?.message || 'Resend rejected the batch.' })));
        return errorResponse(`Newsletter delivery stopped at subscriber ${index + 1}. ${resendResult?.message || 'Resend rejected the batch.'}`, 502);
      }
      const ids = Array.isArray(resendResult?.data) ? resendResult.data : [];
      batch.forEach((item, batchIndex) => deliveryLogs.push({ newsletter_id: newsletterId, subscriber_email: item.to[0], provider: 'resend', provider_message_id: ids[batchIndex]?.id || null, status: 'sent' }));
    }

    if (deliveryLogs.length > 0) await admin.from('newsletter_delivery_logs').insert(deliveryLogs);
    const updated = await admin.from('newsletter_drafts').update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', newsletterId).select('*').single();
    if (updated.error) return errorResponse('Emails were accepted, but the newsletter status could not be updated.', 503);
    await recordEvent(admin, newsletterId, viewer, 'sent', `Sent to ${subscribers.data.length} active subscriber(s).`);
    return NextResponse.json({ ok: true, sentCount: subscribers.data.length, draft: updated.data });
  }

  return errorResponse('Unsupported newsletter action.');
}
