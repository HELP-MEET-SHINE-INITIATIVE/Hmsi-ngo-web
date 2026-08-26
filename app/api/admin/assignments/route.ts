import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { createCredentialCode, createMemberNumber, hashCredentialCode } from '../../../../lib/hmsiCredentials';
import { assignmentEmail, sendPortalEmail } from '../../../../lib/portalEmail';
import { hasSameOrigin } from '../../../../lib/editorialAdmin';

export const runtime = 'nodejs';
const ALLOWED_KINDS = new Set(['assistance', 'job']);
const ALLOWED_STATUSES = new Set(['assigned', 'in_progress', 'submitted', 'completed', 'cancelled']);
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function adminEmail(request: Request) { return getAdminEmailFromCookie(request.headers.get('cookie')); }

const assignmentSelect = 'id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,completion_note,review_note,submitted_at,completed_at,reviewed_at,reviewed_by,created_at,updated_at,admin_note';

export async function GET(request: Request) {
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);
  try {
    const assignments = await admin.from('work_assignments').select(assignmentSelect).eq('is_deleted', false).order('created_at', { ascending: false });
    if (assignments.error) throw assignments.error;
    const workerIds = [...new Set((assignments.data || []).map((item) => item.assigned_worker_id).filter(Boolean))];
    const workers = workerIds.length ? await admin.from('workers').select('id,name,email,phone,status,onboarding_status').in('id', workerIds) : { data: [], error: null };
    if (workers.error) throw workers.error;
    const workerById = new Map((workers.data || []).map((worker) => [worker.id, worker]));
    return NextResponse.json({ assignments: (assignments.data || []).map((item) => ({ ...item, assigned_worker_name: workerById.get(item.assigned_worker_id)?.name || null, assigned_worker_email: workerById.get(item.assigned_worker_id)?.email || null })), workers: workers.data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    console.error('[Admin] Failed to load assignments:', cause instanceof Error ? cause.message : 'unknown');
    return error('Assignments could not be loaded.', 503);
  }
}

export async function POST(request: Request) {
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return error('Cross-site assignment changes are not allowed.', 403);
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

    const inserted = await admin.from('work_assignments').insert({ title, description, kind, assigned_worker_id: workerId, fundraiser_id: fundraiserId, due_at: dueAt, status: 'assigned', idempotency_key: idempotencyKey, is_deleted: false }).select('id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,created_at,notification_status,notification_message_id,notification_sent_at').single();
    if (inserted.error || !inserted.data) {
      if (idempotencyKey) {
        const retry = await admin.from('work_assignments').select('id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,created_at,notification_status,notification_message_id,notification_sent_at').eq('idempotency_key', idempotencyKey).maybeSingle();
        if (retry.data) return NextResponse.json({ assignment: retry.data, notification: { sent: retry.data.notification_status === 'sent', status: retry.data.notification_status, messageId: retry.data.notification_message_id } }, { status: 200 });
      }
      throw inserted.error || new Error('Assignment was not created.');
    }
    const creationAudit = await admin.from('work_assignment_events').insert({ assignment_id: inserted.data.id, actor_role: 'admin', actor_key: actor, action: 'created' });
    if (creationAudit.error) console.warn('[Admin] Worker-assignment creation audit event was not recorded.');

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
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return error('Cross-site assignment changes are not allowed.', 403);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const kind = String(body.kind || '').toLowerCase();
    const status = String(body.status || '').toLowerCase();
    const workerId = String(body.workerId || '').trim();
    const dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : null;
    if (!id || !title || !description || !workerId || !ALLOWED_KINDS.has(kind) || !ALLOWED_STATUSES.has(status)) return error('Assignment, title, description, type, worker, and valid status are required.');
    if (body.dueAt && !dueAt) return error('Due date is invalid.');
    const current = await admin.from('work_assignments').select('id,status').eq('id', id).eq('is_deleted', false).maybeSingle();
    if (current.error || !current.data) return error('Assignment was not found.', 404);
    const reviewNote = String(body.reviewNote || body.adminNote || '').trim().slice(0, 4000) || null;
    if (current.data.status === 'submitted' && !['submitted', 'completed', 'cancelled'].includes(status)) return error('Submitted work can only remain submitted, be approved, or be cancelled.', 409);
    if (status === 'completed' && current.data.status !== 'submitted') return error('A worker must submit the job before the administrator can approve it.', 409);
    if ((status === 'completed' || status === 'cancelled') && !reviewNote) return error('Add an administrator review note before approving or cancelling a job.');
    const worker = await admin.from('workers').select('id,status,onboarding_status').eq('id', workerId).maybeSingle();
    if (worker.error) throw worker.error;
    if (!worker.data || worker.data.status !== 'active' || worker.data.onboarding_status !== 'completed') return error('Choose an active worker with completed onboarding.', 409);
    const now = new Date().toISOString();
    const updated = await admin.from('work_assignments').update({ title, description, kind, status, assigned_worker_id: workerId, due_at: dueAt, admin_note: reviewNote, review_note: reviewNote, completed_at: status === 'completed' ? now : null, reviewed_at: ['completed', 'cancelled'].includes(status) ? now : null, reviewed_by: ['completed', 'cancelled'].includes(status) ? actor : null, updated_at: now }).eq('id', id).eq('is_deleted', false).select(assignmentSelect).single();
    if (updated.error) throw updated.error;
    const action = status === 'completed' ? 'approved' : status === 'cancelled' ? 'cancelled' : 'accepted';
    const auditEvent = await admin.from('work_assignment_events').insert({ assignment_id: id, actor_role: 'admin', actor_key: actor, action, note: reviewNote });
    if (auditEvent.error) console.warn('[Admin] Assignment audit event was not recorded.');
    return NextResponse.json({ assignment: updated.data });
  } catch (cause) {
    console.error('[Admin] Failed to update assignment:', cause instanceof Error ? cause.message : 'unknown');
    return error('We could not update this assignment.', 500);
  }
}

export async function DELETE(request: Request) {
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return error('Cross-site assignment changes are not allowed.', 403);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return error('Assignment is required.');
    const deleted = await admin.from('work_assignments').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: actor, updated_at: new Date().toISOString() }).eq('id', id).eq('is_deleted', false).select('id,is_deleted,deleted_at').single();
    if (deleted.error) throw deleted.error;
    const audit = await admin.from('work_assignment_events').insert({ assignment_id: id, actor_role: 'admin', actor_key: actor, action: 'deleted' });
    if (audit.error) console.warn('[Admin] Assignment deletion audit event was not recorded.');
    return NextResponse.json({ assignment: deleted.data, message: 'Assignment moved to recovery.' });
  } catch (cause) {
    console.error('[Admin] Failed to remove assignment:', cause instanceof Error ? cause.message : 'unknown');
    return error('We could not remove this assignment.', 500);
  }
}
