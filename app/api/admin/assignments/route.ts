import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { createCredentialCode, createMemberNumber, hashCredentialCode } from '../../../../lib/hmsiCredentials';
import { assignmentEmail, sendPortalEmail } from '../../../../lib/portalEmail';

export const runtime = 'nodejs';
const ALLOWED_KINDS = new Set(['assistance', 'job']);
const ALLOWED_STATUSES = new Set(['assigned', 'in_progress', 'completed']);
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function adminEmail(request: Request) { return getAdminEmailFromCookie(request.headers.get('cookie')); }

export async function POST(request: Request) {
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const kind = String(body.kind || '').toLowerCase();
    const workerId = String(body.workerId || '').trim();
    const fundraiserId = String(body.fundraiserId || '').trim() || null;
    const dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : null;
    const idempotencyKey = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim().slice(0, 180) || null;
    if (!title || !description || !workerId || !ALLOWED_KINDS.has(kind)) return error('Title, description, type, and worker are required.');
    if (body.dueAt && !dueAt) return error('Due date is invalid.');
    const worker = await admin.from('workers').select('id,name,email,role,status,onboarding_status').eq('id', workerId).maybeSingle();
    if (worker.error) throw worker.error;
    if (!worker.data || worker.data.status !== 'active') return error('Choose an active worker.');
    if (worker.data.onboarding_status !== 'completed') return error('This worker must complete HMSI onboarding before receiving an assignment.', 409);

    if (idempotencyKey) {
      const existing = await admin.from('work_assignments').select('id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,created_at,notification_status,notification_message_id,notification_sent_at').eq('idempotency_key', idempotencyKey).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return NextResponse.json({ assignment: existing.data, notification: { sent: existing.data.notification_status === 'sent', status: existing.data.notification_status, messageId: existing.data.notification_message_id } }, { status: 200 });
    }

    const inserted = await admin.from('work_assignments').insert({ title, description, kind, assigned_worker_id: workerId, fundraiser_id: fundraiserId, due_at: dueAt, status: 'assigned', idempotency_key: idempotencyKey }).select('id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,created_at,notification_status,notification_message_id,notification_sent_at').single();
    if (inserted.error || !inserted.data) {
      if (idempotencyKey) {
        const retry = await admin.from('work_assignments').select('id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,created_at,notification_status,notification_message_id,notification_sent_at').eq('idempotency_key', idempotencyKey).maybeSingle();
        if (retry.data) return NextResponse.json({ assignment: retry.data, notification: { sent: retry.data.notification_status === 'sent', status: retry.data.notification_status, messageId: retry.data.notification_message_id } }, { status: 200 });
      }
      throw inserted.error || new Error('Assignment was not created.');
    }

    const activeCard = await admin.from('hmsi_id_cards').select('id,member_number,activated_at').eq('holder_role', 'worker').eq('holder_id', workerId).eq('status', 'active').order('issued_at', { ascending: false }).limit(1).maybeSingle();
    let memberNumber: string | null = activeCard.data?.member_number || null;
    let activationCode: string | undefined;
    const activated = Boolean(activeCard.data?.activated_at);
    if (!activeCard.data || !activated) {
      await admin.from('hmsi_id_cards').update({ status: 'revoked' }).eq('holder_role', 'worker').eq('holder_id', workerId).eq('status', 'active');
      activationCode = createCredentialCode();
      memberNumber = createMemberNumber('worker');
      const card = await admin.from('hmsi_id_cards').insert({ holder_role: 'worker', holder_id: workerId, holder_name: worker.data.name, holder_email: worker.data.email.trim().toLowerCase(), member_number: memberNumber, role_display: worker.data.role === 'coordinator' ? 'HMSI Worker Coordinator' : 'HMSI Worker', activation_code_hash: hashCredentialCode(activationCode), activation_code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'active', issued_by: actor }).select('id').single();
      if (card.error) throw card.error;
    }

    const emailContent = assignmentEmail({ workerName: worker.data.name, assignmentTitle: title, assignmentDescription: description, dueAt, memberNumber, activationCode, activated });
    let notification: { sent: boolean; status: string; messageId?: string | null } = { sent: false, status: 'not_configured' };
    try {
      const sent = await sendPortalEmail({ to: worker.data.email, subject: `New HMSI assignment: ${title}`, ...emailContent });
      notification = sent.sent ? { sent: true, status: 'sent', messageId: sent.messageId } : { sent: false, status: 'not_configured' };
    } catch (emailError) {
      console.error('[Admin] Assignment email failed:', emailError instanceof Error ? emailError.message : 'unknown');
      notification = { sent: false, status: 'failed' };
    }
    await admin.from('work_assignments').update({ notification_status: notification.status, notification_message_id: notification.messageId || null, notification_sent_at: notification.sent ? new Date().toISOString() : null, notification_error: notification.status === 'failed' ? 'delivery_failed' : null }).eq('id', inserted.data.id);
    return NextResponse.json({ assignment: { ...inserted.data, notification_status: notification.status, notification_message_id: notification.messageId || null }, notification }, { status: 201 });
  } catch (cause) {
    console.error('[Admin] Failed to create assignment:', cause instanceof Error ? cause.message : 'unknown');
    return error('We could not create this assignment.', 500);
  }
}

export async function PATCH(request: Request) {
  if (!adminEmail(request)) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const status = String(body.status || '').toLowerCase();
    if (!id || !ALLOWED_STATUSES.has(status)) return error('Assignment and valid status are required.');
    const updated = await admin.from('work_assignments').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('id,status').single();
    if (updated.error) throw updated.error;
    return NextResponse.json({ assignment: updated.data });
  } catch (cause) {
    console.error('[Admin] Failed to update assignment:', cause instanceof Error ? cause.message : 'unknown');
    return error('We could not update this assignment.', 500);
  }
}
