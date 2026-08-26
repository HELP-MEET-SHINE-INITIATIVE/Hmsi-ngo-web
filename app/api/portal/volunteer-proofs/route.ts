import { NextResponse } from 'next/server';
import { hasSameOrigin } from '../../../../lib/editorialAdmin';
import { getPortalIdentity } from '../../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { isUuid, normalizeGoogleProofUrl } from '../../../../lib/volunteerAssignments';

export const runtime = 'nodejs';
const assignmentFields = 'id,title,status,proof_required,assigned_volunteer_id,completion_note,updated_at';

export async function POST(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Portal sign-in is required.' }, { status: 401 });
  if (identity.role !== 'volunteer') return NextResponse.json({ error: 'Volunteer portal access is required.' }, { status: 403 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-site proof submissions are not allowed.' }, { status: 403 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Your proof route is temporarily unavailable.' }, { status: 503 });
  try {
    const body = await request.json().catch(() => ({}));
    const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : '';
    const proofUrl = normalizeGoogleProofUrl(body.proofUrl);
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 4000) : '';
    if (!isUuid(assignmentId) || !proofUrl) return NextResponse.json({ error: 'Choose your assignment and provide a private HTTPS Google Drive or Google Docs link.' }, { status: 400 });
    const assignment = await admin.from('volunteer_assignments').select(assignmentFields).eq('id', assignmentId).eq('assigned_volunteer_id', identity.profileId).eq('is_deleted', false).maybeSingle();
    if (assignment.error) throw assignment.error;
    if (!assignment.data || assignment.data.status !== 'in_progress') return NextResponse.json({ error: 'This assignment is unavailable for proof submission.' }, { status: 409 });
    const proof = await admin.from('volunteer_assignment_proofs').insert({ assignment_id: assignmentId, submitted_by_volunteer_id: identity.profileId, proof_url: proofUrl, note: note || null }).select('id,assignment_id,status,created_at').single();
    if (proof.error || !proof.data) throw proof.error || new Error('Proof insert failed.');
    const now = new Date().toISOString();
    const updated = await admin.from('volunteer_assignments').update({ status: 'submitted', completion_note: note || assignment.data.completion_note || null, updated_at: now }).eq('id', assignmentId).eq('assigned_volunteer_id', identity.profileId).eq('status', 'in_progress').select('id,title,status,proof_required,completion_note,updated_at').single();
    if (updated.error || !updated.data) return NextResponse.json({ error: 'Proof was received but the assignment status could not be updated. Contact HMSI administration; do not submit the same proof again.' }, { status: 409 });
    const event = await admin.from('volunteer_assignment_events').insert({ assignment_id: assignmentId, actor_role: 'volunteer', actor_key: identity.authUserId, action: 'proof_submitted', note: note || null, metadata: { proof_id: proof.data.id } });
    if (event.error) console.warn('[Portal] Volunteer proof audit event was not recorded.');
    return NextResponse.json({ proof: proof.data, task: updated.data }, { status: 201 });
  } catch (cause) {
    console.error('[Portal] Volunteer proof submission failed:', cause instanceof Error ? cause.message : 'unknown');
    return NextResponse.json({ error: 'Your proof could not be submitted. Please try again without sharing proof by email.' }, { status: 503 });
  }
}
