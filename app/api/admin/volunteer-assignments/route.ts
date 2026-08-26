import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { hasSameOrigin } from '../../../../lib/editorialAdmin';
import { sendHmsiNotification, volunteerAssignmentTemplate } from '../../../../lib/hmsiNotifications';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { isUuid, isVolunteerAssignmentCategory, isVolunteerAssignmentPriority, normalizeOptionalDate } from '../../../../lib/volunteerAssignments';

export const runtime = 'nodejs';
const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const assignmentSelect = 'id,title,description,category,priority,status,assigned_volunteer_id,assigned_by,due_at,proof_required,completion_note,admin_note,review_note,reviewed_by,reviewed_at,completed_at,notification_status,notification_message_id,notification_sent_at,created_at,updated_at,is_deleted,recovery_until';

function failure(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function actorFor(request: Request) { return getAdminEmailFromCookie(request.headers.get('cookie')); }
function safeText(value: unknown, maximum: number) { return typeof value === 'string' ? value.trim().slice(0, maximum) : ''; }

async function recordEvent(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, assignmentId: string, actor: string, action: string, note?: string | null, metadata: Record<string, unknown> = {}) {
  const event = await admin.from('volunteer_assignment_events').insert({ assignment_id: assignmentId, actor_role: 'admin', actor_key: actor, action, note: note || null, metadata });
  if (event.error) console.warn('[Admin] Volunteer assignment audit event was not recorded.');
}

export async function GET(request: Request) {
  const actor = actorFor(request);
  if (!actor) return failure('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return failure('Supabase is not configured on the server.', 503);
  try {
    const [assignments, volunteers] = await Promise.all([
      admin.from('volunteer_assignments').select(assignmentSelect).eq('is_deleted', false).order('created_at', { ascending: false }).limit(300),
      admin.from('volunteer_applications').select('id,name,email,phone,interest,status,account_status,applicant_role,auth_user_id,reviewed_at,created_at').eq('applicant_role', 'volunteer').order('created_at', { ascending: false }).limit(500),
    ]);
    if (assignments.error) return failure('Volunteer assignments are unavailable. Run supabase/volunteer_assignment_workflow_patch.sql before using this menu.', 503);
    if (volunteers.error) throw volunteers.error;
    const ids = (assignments.data || []).map((row) => row.id);
    const proofs = ids.length ? await admin.from('volunteer_assignment_proofs').select('id,assignment_id,status,created_at,reviewed_at').in('assignment_id', ids).order('created_at', { ascending: false }) : { data: [], error: null };
    if (proofs.error) return failure('Volunteer proof progress is unavailable. Run supabase/volunteer_assignment_workflow_patch.sql before using this menu.', 503);
    const volunteerById = new Map((volunteers.data || []).map((row) => [row.id, row]));
    const proofByAssignment = new Map<string, Array<{ id: string; status: string; created_at: string; reviewed_at: string | null }>>();
    for (const proof of proofs.data || []) proofByAssignment.set(proof.assignment_id, [...(proofByAssignment.get(proof.assignment_id) || []), proof]);
    return NextResponse.json({
      volunteers: (volunteers.data || []).map((volunteer) => ({
        ...volunteer,
        assignment_ready: volunteer.status === 'approved' && volunteer.account_status === 'active',
        portal_ready: Boolean(volunteer.auth_user_id),
      })),
      assignments: (assignments.data || []).map((assignment) => ({ ...assignment, volunteer: volunteerById.get(assignment.assigned_volunteer_id) || null, proofs: proofByAssignment.get(assignment.id) || [], proof_count: (proofByAssignment.get(assignment.id) || []).length })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    console.error('[Admin] Volunteer assignment register failed:', cause instanceof Error ? cause.message : 'unknown');
    return failure('Volunteer assignments could not be loaded.', 503);
  }
}

export async function POST(request: Request) {
  const actor = actorFor(request);
  if (!actor) return failure('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return failure('Cross-site volunteer assignments are not allowed.', 403);
  const admin = getSupabaseAdmin();
  if (!admin) return failure('Supabase is not configured on the server.', 503);
  try {
    const body = await request.json().catch(() => ({}));
    const title = safeText(body.title, 200);
    const description = safeText(body.description, 12000);
    const volunteerId = safeText(body.volunteerId, 64);
    const category = safeText(body.category, 60);
    const priority = safeText(body.priority, 20);
    const dueAt = normalizeOptionalDate(body.dueAt);
    const idempotencyKey = safeText(request.headers.get('idempotency-key') || body.idempotencyKey, 180) || null;
    if (title.length < 3 || description.length < 10 || !isUuid(volunteerId) || !isVolunteerAssignmentCategory(category) || !isVolunteerAssignmentPriority(priority)) return failure('Title, description, category, priority, and an approved volunteer are required.');
    if (body.dueAt && !dueAt) return failure('Due date is invalid.');
    const volunteer = await admin.from('volunteer_applications').select('id,name,email,status,account_status,applicant_role,auth_user_id').eq('id', volunteerId).maybeSingle();
    if (volunteer.error) throw volunteer.error;
    if (!volunteer.data || volunteer.data.applicant_role !== 'volunteer' || volunteer.data.status !== 'approved' || volunteer.data.account_status !== 'active') return failure('Choose an approved, active volunteer.', 409);
    if (idempotencyKey) {
      const existing = await admin.from('volunteer_assignments').select(assignmentSelect).eq('idempotency_key', idempotencyKey).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return NextResponse.json({ assignment: existing.data, duplicate: true });
    }
    const created = await admin.from('volunteer_assignments').insert({ title, description, category, priority, assigned_volunteer_id: volunteerId, assigned_by: actor, due_at: dueAt, proof_required: Boolean(body.proofRequired), admin_note: safeText(body.adminNote, 4000) || null, idempotency_key: idempotencyKey, is_deleted: false }).select(assignmentSelect).single();
    if (created.error || !created.data) throw created.error || new Error('Assignment insert failed.');
    await recordEvent(admin, created.data.id, actor, 'created', null, { category, priority, proof_required: Boolean(body.proofRequired) });
    const portalBase = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng';
    let notification = { sent: false, status: 'not_sent', messageId: null as string | null, error: volunteer.data.auth_user_id ? null : 'activation_required' };
    if (volunteer.data.auth_user_id) {
      try {
        const email = volunteerAssignmentTemplate({ name: volunteer.data.name, title, priority, dueAt, dashboardUrl: `${portalBase}/portal/my-tasks` });
        const dispatched = await sendHmsiNotification({ sender: 'onboarding', to: [volunteer.data.email], subject: `New HMSI volunteer assignment: ${title}`, ...email, idempotencyKey: `volunteer_assignment_${created.data.id}` });
        notification = dispatched.sent ? { sent: true, status: 'sent', messageId: dispatched.messageId, error: null } : notification;
      } catch (mailError) {
        console.error('[Admin] Volunteer assignment notification failed:', mailError instanceof Error ? mailError.message : 'unknown');
        notification = { sent: false, status: 'failed', messageId: null, error: 'delivery_failed' };
      }
    }
    await admin.from('volunteer_assignments').update({ notification_status: notification.status, notification_message_id: notification.messageId, notification_sent_at: notification.sent ? new Date().toISOString() : null, notification_error: notification.error }).eq('id', created.data.id);
    await recordEvent(admin, created.data.id, actor, notification.sent ? 'notified' : 'notification_failed', null, { delivery_status: notification.error || notification.status });
    return NextResponse.json({ assignment: { ...created.data, notification_status: notification.status }, notification: { sent: notification.sent, status: notification.error || notification.status, messageId: notification.messageId } }, { status: 201 });
  } catch (cause) {
    console.error('[Admin] Failed to create volunteer assignment:', cause instanceof Error ? cause.message : 'unknown');
    return failure('Volunteer assignment could not be created. Run the volunteer-assignment migration if this is a new installation.', 503);
  }
}

export async function PATCH(request: Request) {
  const actor = actorFor(request);
  if (!actor) return failure('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return failure('Cross-site volunteer assignment updates are not allowed.', 403);
  const admin = getSupabaseAdmin();
  if (!admin) return failure('Supabase is not configured on the server.', 503);
  try {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    const action = safeText(body.action, 40) || 'update';
    const reviewNote = safeText(body.reviewNote, 4000);
    if (!isUuid(id)) return failure('Assignment selection is required.');
    const existing = await admin.from('volunteer_assignments').select(assignmentSelect).eq('id', id).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return failure('Volunteer assignment was not found.', 404);
    if (action === 'restore') {
      if (!existing.data.is_deleted || !existing.data.recovery_until || new Date(existing.data.recovery_until).getTime() < Date.now()) return failure('This recovery window has expired or the assignment is not archived.', 409);
      const restored = await admin.from('volunteer_assignments').update({ is_deleted: false, deleted_at: null, deleted_by: null, recovery_until: null, updated_at: new Date().toISOString() }).eq('id', id).select(assignmentSelect).single();
      if (restored.error) throw restored.error;
      await recordEvent(admin, id, actor, 'restored');
      return NextResponse.json({ assignment: restored.data });
    }
    if (existing.data.is_deleted) return failure('This assignment is in recovery. Restore it before editing.', 409);
    const now = new Date().toISOString();
    if (action === 'approve_completion') {
      if (existing.data.status !== 'submitted') return failure('Only submitted volunteer work can be approved.', 409);
      const updated = await admin.from('volunteer_assignments').update({ status: 'completed', review_note: reviewNote || null, reviewed_by: actor, reviewed_at: now, completed_at: now, updated_at: now }).eq('id', id).eq('status', 'submitted').select(assignmentSelect).single();
      if (updated.error) throw updated.error;
      await recordEvent(admin, id, actor, 'completed', reviewNote || null);
      return NextResponse.json({ assignment: updated.data });
    }
    if (action === 'request_revisions' || action === 'reject' || action === 'cancel') {
      if (!reviewNote) return failure('Add an administrator note for this review action.');
      const status = action === 'request_revisions' ? 'revisions_requested' : action === 'reject' ? 'rejected' : 'cancelled';
      if (action !== 'cancel' && existing.data.status !== 'submitted') return failure('Only submitted volunteer work can be reviewed.', 409);
      const updated = await admin.from('volunteer_assignments').update({ status, review_note: reviewNote, reviewed_by: actor, reviewed_at: now, updated_at: now }).eq('id', id).select(assignmentSelect).single();
      if (updated.error) throw updated.error;
      await recordEvent(admin, id, actor, action === 'request_revisions' ? 'revisions_requested' : status, reviewNote);
      return NextResponse.json({ assignment: updated.data });
    }
    const title = safeText(body.title, 200);
    const description = safeText(body.description, 12000);
    const category = safeText(body.category, 60);
    const priority = safeText(body.priority, 20);
    const dueAt = normalizeOptionalDate(body.dueAt);
    if (title.length < 3 || description.length < 10 || !isVolunteerAssignmentCategory(category) || !isVolunteerAssignmentPriority(priority)) return failure('Title, description, category, and priority are required.');
    if (body.dueAt && !dueAt) return failure('Due date is invalid.');
    const updated = await admin.from('volunteer_assignments').update({ title, description, category, priority, due_at: dueAt, proof_required: Boolean(body.proofRequired), admin_note: safeText(body.adminNote, 4000) || null, updated_at: now }).eq('id', id).select(assignmentSelect).single();
    if (updated.error) throw updated.error;
    await recordEvent(admin, id, actor, 'created', 'Administrator updated assignment details.', { updated: true });
    return NextResponse.json({ assignment: updated.data });
  } catch (cause) {
    console.error('[Admin] Failed to update volunteer assignment:', cause instanceof Error ? cause.message : 'unknown');
    return failure('Volunteer assignment could not be updated.', 503);
  }
}

export async function DELETE(request: Request) {
  const actor = actorFor(request);
  if (!actor) return failure('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return failure('Cross-site volunteer assignment removal is not allowed.', 403);
  const admin = getSupabaseAdmin();
  if (!admin) return failure('Supabase is not configured on the server.', 503);
  try {
    const body = await request.json().catch(() => ({}));
    const id = safeText(body.id, 64);
    if (!isUuid(id)) return failure('Assignment selection is required.');
    const now = new Date();
    const removed = await admin.from('volunteer_assignments').update({ is_deleted: true, deleted_at: now.toISOString(), deleted_by: actor, recovery_until: new Date(now.getTime() + RECOVERY_WINDOW_MS).toISOString(), updated_at: now.toISOString() }).eq('id', id).eq('is_deleted', false).select('id,is_deleted,recovery_until').single();
    if (removed.error) throw removed.error;
    await recordEvent(admin, id, actor, 'deleted');
    return NextResponse.json({ assignment: removed.data, message: 'Volunteer assignment moved to 30-day recovery.' });
  } catch (cause) {
    console.error('[Admin] Failed to remove volunteer assignment:', cause instanceof Error ? cause.message : 'unknown');
    return failure('Volunteer assignment could not be moved to recovery.', 503);
  }
}
