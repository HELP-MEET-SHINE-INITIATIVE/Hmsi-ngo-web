import { NextResponse } from 'next/server';
import { hasSameOrigin } from '../../../../lib/editorialAdmin';
import { getPortalIdentity } from '../../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { canVolunteerTransition, isUuid } from '../../../../lib/volunteerAssignments';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Portal sign-in is required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Your task portal is temporarily unavailable.' }, { status: 503 });
  if (identity.role === 'volunteer') {
    const assignments = await admin
      .from('volunteer_assignments')
      .select('id,title,description,category,priority,status,due_at,proof_required,completion_note,review_note,created_at,updated_at,completed_at')
      .eq('assigned_volunteer_id', identity.profileId)
      .eq('is_deleted', false)
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(100);
    if (assignments.error) return NextResponse.json({ error: 'Volunteer assignments are temporarily unavailable. HMSI administration may need to complete the volunteer-assignment database setup.' }, { status: 503 });
    const assignmentIds = (assignments.data || []).map((assignment) => assignment.id);
    const proofs = assignmentIds.length
      ? await admin.from('volunteer_assignment_proofs').select('id,assignment_id,status,created_at').eq('submitted_by_volunteer_id', identity.profileId).in('assignment_id', assignmentIds).order('created_at', { ascending: false })
      : { data: [], error: null };
    if (proofs.error) return NextResponse.json({ error: 'Volunteer proof status is temporarily unavailable.' }, { status: 503 });
    const proofCount = new Map<string, number>();
    for (const proof of proofs.data || []) proofCount.set(proof.assignment_id, (proofCount.get(proof.assignment_id) || 0) + 1);
    return NextResponse.json({ identity, assignments: (assignments.data || []).map((assignment) => ({ ...assignment, kind: assignment.category, proof_count: proofCount.get(assignment.id) || 0 })), message: null });
  }
  if (identity.role === 'worker') {
    const assignments = await admin
      .from('work_assignments')
      .select('id,title,description,kind,status,due_at,created_at,updated_at')
      .eq('assigned_worker_id', identity.profileId)
      .eq('is_deleted', false)
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(100);
    if (assignments.error) return NextResponse.json({ error: 'Assignments are temporarily unavailable.' }, { status: 503 });
    return NextResponse.json({ identity, assignments: assignments.data || [], message: null });
  }
  const assignments = await admin
    .from('hmsi_member_tasks')
    .select('id,title,description,kind,priority,status,due_at,completion_note,created_at,updated_at,completed_at')
    .eq('assigned_member_id', identity.profileId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(100);
  if (assignments.error) return NextResponse.json({ error: 'Member tasks are temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ identity, assignments: assignments.data || [], message: null });
}

export async function PATCH(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Portal sign-in is required.' }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-site task changes are not allowed.' }, { status: 403 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Your task portal is temporarily unavailable.' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status : '';
  const completionNote = typeof body.completion_note === 'string' ? body.completion_note.trim().slice(0, 4000) : null;
  if (!id) return NextResponse.json({ error: 'Task selection is required.' }, { status: 400 });
  if (identity.role === 'volunteer') {
    if (!isUuid(id) || (status !== 'in_progress' && status !== 'submitted')) return NextResponse.json({ error: 'Choose an allowed volunteer task status.' }, { status: 400 });
    const assignment = await admin.from('volunteer_assignments').select('id,status,proof_required').eq('id', id).eq('assigned_volunteer_id', identity.profileId).eq('is_deleted', false).maybeSingle();
    if (assignment.error) return NextResponse.json({ error: 'Volunteer assignments are temporarily unavailable.' }, { status: 503 });
    if (!assignment.data || !canVolunteerTransition(assignment.data.status, status)) return NextResponse.json({ error: 'This task cannot be updated from its current state.' }, { status: 409 });
    if (status === 'submitted' && assignment.data.proof_required) {
      const proof = await admin.from('volunteer_assignment_proofs').select('id').eq('assignment_id', id).eq('submitted_by_volunteer_id', identity.profileId).limit(1).maybeSingle();
      if (proof.error) return NextResponse.json({ error: 'Proof status is temporarily unavailable.' }, { status: 503 });
      if (!proof.data) return NextResponse.json({ error: 'Submit the requested private proof link before sending this task for review.' }, { status: 409 });
    }
    if (status === 'submitted' && !assignment.data.proof_required && !completionNote) return NextResponse.json({ error: 'Add a completion note before sending this task for review.' }, { status: 400 });
    const updated = await admin.from('volunteer_assignments').update({ status, completion_note: status === 'submitted' ? completionNote : null, updated_at: new Date().toISOString() }).eq('id', id).eq('assigned_volunteer_id', identity.profileId).eq('is_deleted', false).eq('status', assignment.data.status).select('id,title,description,category,priority,status,due_at,proof_required,completion_note,review_note,created_at,updated_at,completed_at').single();
    if (updated.error || !updated.data) return NextResponse.json({ error: 'This task could not be updated. Refresh the page before trying again.' }, { status: 409 });
    const action = status === 'submitted' ? 'submitted' : assignment.data.status === 'assigned' ? 'accepted' : 'started';
    const audit = await admin.from('volunteer_assignment_events').insert({ assignment_id: id, actor_role: 'volunteer', actor_key: identity.authUserId, action, note: status === 'submitted' ? completionNote : null });
    if (audit.error) console.warn('[Portal] Volunteer task audit event was not recorded.');
    return NextResponse.json({ task: { ...updated.data, kind: updated.data.category } });
  }
  if (identity.role === 'worker') {
    if (status !== 'in_progress' && status !== 'completed') return NextResponse.json({ error: 'Choose an allowed worker task status.' }, { status: 400 });
    const updated = await admin
      .from('work_assignments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('assigned_worker_id', identity.profileId)
      .eq('is_deleted', false)
      .in('status', ['assigned', 'in_progress'])
      .select('id,title,description,kind,status,due_at,created_at,updated_at')
      .single();
    if (updated.error || !updated.data) return NextResponse.json({ error: 'This task could not be updated or is not assigned to you.' }, { status: 403 });
    return NextResponse.json({ task: updated.data });
  }
  if (status !== 'in_progress' && status !== 'submitted') return NextResponse.json({ error: 'Choose an allowed member task status.' }, { status: 400 });
  if (status === 'submitted' && !completionNote) return NextResponse.json({ error: 'Add a completion note before submitting this task.' }, { status: 400 });
  const updated = await admin
    .from('hmsi_member_tasks')
    .update({ status, completion_note: completionNote, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('assigned_member_id', identity.profileId)
    .in('status', ['assigned', 'in_progress'])
    .select('id,title,description,kind,priority,status,due_at,completion_note,created_at,updated_at,completed_at')
    .single();
  if (updated.error || !updated.data) return NextResponse.json({ error: 'This task could not be updated or is not assigned to you.' }, { status: 403 });
  await admin.from('hmsi_member_task_events').insert({ task_id: id, actor_email: identity.email, actor_role: 'member', action: status, note: completionNote });
  return NextResponse.json({ task: updated.data });
}
