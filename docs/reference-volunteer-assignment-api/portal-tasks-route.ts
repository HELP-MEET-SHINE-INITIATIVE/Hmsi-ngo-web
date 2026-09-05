import { NextResponse } from 'next/server';
import { getPortalIdentity } from '../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

const volunteerStatuses = new Set(['assigned', 'accepted', 'in_progress', 'submitted', 'completed', 'needs_revision', 'rejected', 'cancelled']);
const transitions: Record<string, Set<string>> = {
  assigned: new Set(['accepted', 'in_progress']),
  accepted: new Set(['in_progress']),
  in_progress: new Set(['submitted']),
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return jsonError('Authentication required.', 401);
  if (identity.role !== 'volunteer') return jsonError('This workspace is not available for this role.', 403);

  const admin = getSupabaseAdmin();
  if (!admin) return jsonError('Portal data service is unavailable.', 503);

  const { data, error } = await admin
    .from('volunteer_assignments')
    .select('id,title,description,required_outcome,priority,status,due_at,proof_required,source_article_id,opportunity_id,created_at,updated_at')
    .eq('volunteer_id', identity.profileId)
    .eq('is_deleted', false)
    .order('due_at', { ascending: true, nullsFirst: false });

  if (error) return jsonError('Unable to load volunteer jobs.', 503);
  return NextResponse.json({ assignments: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return jsonError('Authentication required.', 401);
  if (identity.role !== 'volunteer') return jsonError('This workspace is not available for this role.', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  if (!body || typeof body !== 'object') return jsonError('Invalid request.', 400);
  const input = body as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id : '';
  const requestedStatus = typeof input.status === 'string' ? input.status : '';
  const expectedStatus = typeof input.expectedStatus === 'string' ? input.expectedStatus : '';
  const completionNote = typeof input.completionNote === 'string' ? input.completionNote.trim() : null;

  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError('Invalid assignment ID.', 400);
  if (!volunteerStatuses.has(requestedStatus) || !volunteerStatuses.has(expectedStatus)) return jsonError('Invalid assignment status.', 400);
  if (completionNote && completionNote.length > 4000) return jsonError('Completion note is too long.', 400);
  if (!transitions[expectedStatus]?.has(requestedStatus)) return jsonError('Invalid status transition.', 409);
  if (requestedStatus === 'submitted' && !completionNote) return jsonError('A completion note is required before submission.', 400);

  const admin = getSupabaseAdmin();
  if (!admin) return jsonError('Portal data service is unavailable.', 503);

  // The conditional predicate prevents stale tabs and cross-volunteer updates.
  const patch: Record<string, unknown> = { status: requestedStatus };
  if (requestedStatus === 'accepted') patch.accepted_at = new Date().toISOString();
  if (requestedStatus === 'submitted') {
    patch.submitted_at = new Date().toISOString();
    patch.completion_note = completionNote;
  }

  const { data: assignment, error } = await admin
    .from('volunteer_assignments')
    .update(patch)
    .eq('id', id)
    .eq('volunteer_id', identity.profileId)
    .eq('status', expectedStatus)
    .eq('is_deleted', false)
    .select('id,title,status,updated_at')
    .maybeSingle();

  if (error) return jsonError('Unable to update the assignment.', 503);
  if (!assignment) return jsonError('Assignment is stale, closed, deleted, or not owned by this account.', 409);

  const { error: eventError } = await admin.from('volunteer_task_events').insert({
    assignment_id: assignment.id,
    actor_auth_user_id: identity.authUserId,
    actor_email: identity.email,
    actor_role: 'volunteer',
    action: requestedStatus === 'accepted' ? 'accepted' : requestedStatus === 'in_progress' ? 'started' : 'proof_submitted',
    from_status: expectedStatus,
    to_status: requestedStatus,
    detail: completionNote ? 'Completion note supplied.' : null,
  });

  if (eventError) return jsonError('Assignment changed but audit recording failed; contact HMSI support.', 503);
  return NextResponse.json({ assignment });
}
