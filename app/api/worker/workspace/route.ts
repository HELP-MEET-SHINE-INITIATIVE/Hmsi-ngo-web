import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getWorkerSessionFromCookie } from '../../../../lib/workerSession';
import { hasSameOrigin } from '../../../../lib/editorialAdmin';

export const runtime = 'nodejs';

function getSession(request: Request) { return getWorkerSessionFromCookie(request.headers.get('cookie')); }

export async function GET(request: Request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Complete HMSI onboarding to access the worker workspace.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Worker workspace is temporarily unavailable.' }, { status: 503 });
  const worker = await admin.from('workers').select('id,name,email,role,status,onboarding_status,onboarded_at,ads_manager_enabled,assignments_manager_enabled').eq('id', session.workerId).eq('email', session.email).maybeSingle();
  if (worker.error) return NextResponse.json({ error: 'Worker workspace is temporarily unavailable.' }, { status: 503 });
  if (!worker.data || worker.data.status !== 'active' || worker.data.onboarding_status !== 'completed') return NextResponse.json({ error: 'Complete HMSI onboarding to access the worker workspace.' }, { status: 403 });
  const assignments = await admin.from('work_assignments').select('id,title,description,kind,status,due_at,fundraiser_id,completion_note,review_note,submitted_at,completed_at,created_at,updated_at').eq('assigned_worker_id', session.workerId).eq('is_deleted', false).order('due_at', { ascending: true, nullsFirst: false }).limit(100);
  if (assignments.error) return NextResponse.json({ error: 'Assignments are temporarily unavailable.' }, { status: 503 });
  const sponsorships = await admin.from('sponsorship_requests').select('id,title,budget_ngn,status,created_at,paid_at').eq('requester_email', session.email).order('created_at', { ascending: false }).limit(50);
  if (sponsorships.error) return NextResponse.json({ error: 'Sponsored placements are temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ worker: worker.data, assignments: assignments.data || [], sponsorships: sponsorships.data || [] });
}

export async function PATCH(request: Request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Complete HMSI onboarding to access the worker workspace.' }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-site task changes are not allowed.' }, { status: 403 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Worker workspace is temporarily unavailable.' }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'A valid assignment update is required.' }, { status: 400 }); }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
  const completionNote = typeof body.completion_note === 'string' ? body.completion_note.trim().slice(0, 4000) : '';
  if (!id || !['in_progress', 'submitted'].includes(status)) return NextResponse.json({ error: 'Assignment id and valid status are required.' }, { status: 400 });
  const current = await admin.from('work_assignments').select('id,status').eq('id', id).eq('assigned_worker_id', session.workerId).eq('is_deleted', false).maybeSingle();
  if (current.error || !current.data) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
  if (!['assigned', 'in_progress'].includes(current.data.status)) return NextResponse.json({ error: 'This job cannot be updated from its current state.' }, { status: 409 });
  if (status === 'submitted' && !completionNote) return NextResponse.json({ error: 'Add a completion note before sending the job for administrator review.' }, { status: 400 });
  const update = await admin.from('work_assignments').update({ status, completion_note: status === 'submitted' ? completionNote : null, submitted_at: status === 'submitted' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', id).eq('assigned_worker_id', session.workerId).eq('status', current.data.status).select('id,status,completion_note,submitted_at,updated_at').maybeSingle();
  if (update.error) return NextResponse.json({ error: 'The assignment could not be updated.' }, { status: 503 });
  if (!update.data) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
  const event = await admin.from('work_assignment_events').insert({ assignment_id: id, actor_role: 'worker', actor_key: session.email, action: status === 'submitted' ? 'submitted' : 'accepted', note: status === 'submitted' ? completionNote : null });
  if (event.error) console.warn('[Worker] Assignment event was not recorded.');
  return NextResponse.json({ assignment: update.data });
}
