import { NextResponse } from 'next/server';
import { getPortalIdentity } from '../../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Portal sign-in is required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Your task portal is temporarily unavailable.' }, { status: 503 });
  if (identity.role === 'volunteer') {
    return NextResponse.json({ identity, assignments: [], message: 'Your volunteer workspace is active. Task assignment is not yet configured for this role; use the Volunteer Community Room for approved coordination.' });
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
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Your task portal is temporarily unavailable.' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status : '';
  const completionNote = typeof body.completion_note === 'string' ? body.completion_note.trim().slice(0, 4000) : null;
  if (!id) return NextResponse.json({ error: 'Task selection is required.' }, { status: 400 });
  if (identity.role === 'volunteer') return NextResponse.json({ error: 'Volunteer tasks are not configured for this portal yet.' }, { status: 403 });
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
