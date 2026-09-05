import { NextResponse } from 'next/server';
import { getPortalIdentity } from '../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

const allowedHosts = new Set(['drive.google.com', 'docs.google.com']);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function validDriveUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowedHosts.has(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getPortalIdentity(request);
  if (!identity) return jsonError('Authentication required.', 401);
  if (identity.role !== 'volunteer') return jsonError('This proof route is not available for this role.', 403);

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError('Invalid assignment ID.', 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }
  if (!body || typeof body !== 'object') return jsonError('Invalid request.', 400);
  const input = body as Record<string, unknown>;
  const driveUrl = input.driveUrl;
  const note = typeof input.note === 'string' ? input.note.trim() : null;
  if (!validDriveUrl(driveUrl)) return jsonError('Use an HTTPS Google Drive or Google Docs link.', 400);
  if (note && note.length > 2000) return jsonError('Proof note is too long.', 400);

  const admin = getSupabaseAdmin();
  if (!admin) return jsonError('Portal data service is unavailable.', 503);

  const { data: assignment, error: assignmentError } = await admin
    .from('volunteer_assignments')
    .select('id,status,volunteer_id,is_deleted,proof_required')
    .eq('id', id)
    .eq('volunteer_id', identity.profileId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (assignmentError) return jsonError('Unable to verify assignment.', 503);
  if (!assignment) return jsonError('Assignment not found or not owned by this account.', 404);
  if (assignment.status !== 'in_progress') return jsonError('The assignment must be in progress before proof is submitted.', 409);

  // For strict atomicity, replace the following sequence with a reviewed SQL RPC
  // that inserts proof, updates the assignment, and writes the event in one transaction.
  const { data: proof, error: proofError } = await admin
    .from('volunteer_task_proofs')
    .insert({
      assignment_id: assignment.id,
      submitted_by: identity.profileId,
      drive_url: driveUrl,
      note,
      status: 'pending_review',
    })
    .select('id,assignment_id,status,created_at')
    .single();
  if (proofError || !proof) return jsonError('Unable to record proof submission.', 503);

  const { data: updated, error: updateError } = await admin
    .from('volunteer_assignments')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', assignment.id)
    .eq('volunteer_id', identity.profileId)
    .eq('status', 'in_progress')
    .eq('is_deleted', false)
    .select('id,status,submitted_at')
    .maybeSingle();
  if (updateError || !updated) return jsonError('Proof recorded but assignment transition failed; administrator reconciliation is required.', 503);

  const { error: eventError } = await admin.from('volunteer_task_events').insert({
    assignment_id: assignment.id,
    actor_auth_user_id: identity.authUserId,
    actor_email: identity.email,
    actor_role: 'volunteer',
    action: 'proof_submitted',
    from_status: 'in_progress',
    to_status: 'submitted',
    detail: 'Private proof metadata submitted for administrator review.',
  });
  if (eventError) return jsonError('Proof recorded but audit recording failed; contact HMSI support.', 503);

  return NextResponse.json({
    proof: { id: proof.id, assignmentId: proof.assignment_id, status: proof.status, createdAt: proof.created_at },
    assignment: updated,
  }, { status: 201 });
}
