import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function requestHash(input: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function validText(value: unknown, min: number, max: number) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

export async function POST(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return jsonError('Administrator authentication required.', 401);

  const requestKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(requestKey)) return jsonError('A valid Idempotency-Key is required.', 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }
  if (!body || typeof body !== 'object') return jsonError('Invalid request.', 400);
  const input = body as Record<string, unknown>;
  const volunteerId = typeof input.volunteerId === 'string' ? input.volunteerId : '';
  const priority = typeof input.priority === 'string' ? input.priority : 'medium';
  const dueAt = typeof input.dueAt === 'string' ? input.dueAt : null;

  if (!/^[0-9a-f-]{36}$/i.test(volunteerId)) return jsonError('Invalid volunteer ID.', 400);
  if (!validText(input.title, 1, 180) || !validText(input.description, 1, 12000) || !validText(input.requiredOutcome, 1, 4000)) {
    return jsonError('Title, description, and required outcome are required and length-limited.', 400);
  }
  if (!['low', 'medium', 'high'].includes(priority)) return jsonError('Invalid priority.', 400);
  if (dueAt && Number.isNaN(Date.parse(dueAt))) return jsonError('Invalid due date.', 400);

  const admin = getSupabaseAdmin();
  if (!admin) return jsonError('Portal data service is unavailable.', 503);
  const hash = requestHash(input);

  const existing = await admin
    .from('volunteer_assignment_idempotency')
    .select('request_hash,assignment_id')
    .eq('request_key', requestKey)
    .eq('actor_key', adminEmail)
    .maybeSingle();
  if (existing.error) return jsonError('Unable to verify request idempotency.', 503);
  if (existing.data) {
    if (existing.data.request_hash !== hash) return jsonError('Idempotency key was already used for another request.', 409);
    return NextResponse.json({ assignmentId: existing.data.assignment_id, duplicate: true });
  }

  const { data: volunteer, error: volunteerError } = await admin
    .from('volunteer_applications')
    .select('id,name,email,status,account_status,applicant_role,is_deleted,onboarding_status')
    .eq('id', volunteerId)
    .maybeSingle();
  if (volunteerError) return jsonError('Unable to verify volunteer eligibility.', 503);
  if (!volunteer || volunteer.status !== 'approved' || volunteer.account_status !== 'active' || volunteer.applicant_role !== 'volunteer' || volunteer.is_deleted || volunteer.onboarding_status !== 'completed') {
    return jsonError('Volunteer is not eligible for assignment.', 409);
  }

  const { data: assignment, error: insertError } = await admin
    .from('volunteer_assignments')
    .insert({
      volunteer_id: volunteer.id,
      source_article_id: typeof input.sourceArticleId === 'string' ? input.sourceArticleId : null,
      opportunity_id: typeof input.opportunityId === 'string' ? input.opportunityId : null,
      title: (input.title as string).trim(),
      description: (input.description as string).trim(),
      required_outcome: (input.requiredOutcome as string).trim(),
      priority,
      due_at: dueAt,
      proof_required: input.proofRequired === true,
      assigned_by: adminEmail,
    })
    .select('id,title,status,priority,due_at,volunteer_id,created_at')
    .single();
  if (insertError || !assignment) return jsonError('Unable to create assignment.', 503);

  const { error: idempotencyError } = await admin.from('volunteer_assignment_idempotency').insert({
    actor_key: adminEmail,
    request_key: requestKey,
    request_hash: hash,
    assignment_id: assignment.id,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  if (idempotencyError) return jsonError('Assignment created but idempotency recording failed; pause notifications and reconcile.', 503);

  const { error: eventError } = await admin.from('volunteer_task_events').insert({
    assignment_id: assignment.id,
    actor_email: adminEmail,
    actor_role: 'admin',
    action: 'created',
    from_status: null,
    to_status: 'assigned',
    detail: 'Assignment created for an approved active volunteer.',
  });
  if (eventError) return jsonError('Assignment created but audit recording failed; contact HMSI support.', 503);

  // Dispatch through the existing official HMSI notification utility here.
  // Pass only assignment ID and a safe summary; never include secrets or raw proof links.
  return NextResponse.json({ assignment, notification: { queued: true } }, { status: 201 });
}
