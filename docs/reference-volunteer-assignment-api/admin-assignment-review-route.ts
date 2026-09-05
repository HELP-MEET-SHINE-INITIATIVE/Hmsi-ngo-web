import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

const allowedActions = new Set(['completed', 'needs_revision', 'rejected', 'cancelled', 'restored']);
const allowedFrom: Record<string, Set<string>> = {
  completed: new Set(['submitted']),
  needs_revision: new Set(['submitted']),
  rejected: new Set(['submitted', 'assigned', 'accepted', 'in_progress']),
  cancelled: new Set(['assigned', 'accepted', 'in_progress', 'submitted', 'needs_revision']),
  restored: new Set(['completed', 'rejected', 'cancelled']),
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return jsonError('Administrator authentication required.', 401);

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
  const action = typeof input.action === 'string' ? input.action : '';
  const expectedStatus = typeof input.expectedStatus === 'string' ? input.expectedStatus : '';
  const feedback = typeof input.feedback === 'string' ? input.feedback.trim() : null;
  if (!allowedActions.has(action) || !allowedFrom[action]?.has(expectedStatus)) return jsonError('Invalid administrator transition.', 409);
  if (feedback && feedback.length > 4000) return jsonError('Feedback is too long.', 400);

  const admin = getSupabaseAdmin();
  if (!admin) return jsonError('Portal data service is unavailable.', 503);

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: action, updated_at: now };
  if (action === 'completed') patch.completed_at = now;
  if (action === 'needs_revision') patch.completion_note = feedback;
  if (action === 'rejected' || action === 'cancelled') patch.completion_note = feedback;
  if (action === 'restored') {
    patch.is_deleted = false;
    patch.deleted_at = null;
    patch.deleted_by = null;
    patch.recovery_until = null;
  }

  const query = admin
    .from('volunteer_assignments')
    .update(patch)
    .eq('id', id)
    .eq('status', expectedStatus);
  if (action === 'restored') query.eq('is_deleted', true).gte('recovery_until', now);
  const { data: assignment, error } = await query.select('id,status,is_deleted,completed_at,updated_at').maybeSingle();
  if (error) return jsonError('Unable to update assignment.', 503);
  if (!assignment) return jsonError('Assignment is stale, closed, or outside the recovery window.', 409);

  const eventAction = action === 'restored' ? 'restored' : action;
  const { error: eventError } = await admin.from('volunteer_task_events').insert({
    assignment_id: assignment.id,
    actor_email: adminEmail,
    actor_role: 'admin',
    action: eventAction,
    from_status: expectedStatus,
    to_status: assignment.status,
    detail: feedback ? 'Administrator supplied bounded review feedback.' : null,
  });
  if (eventError) return jsonError('Assignment changed but audit recording failed; contact HMSI support.', 503);

  return NextResponse.json({ assignment });
}
