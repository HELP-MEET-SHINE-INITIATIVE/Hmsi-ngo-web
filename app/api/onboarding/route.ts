import { NextResponse } from 'next/server';
import { hashOnboardingToken } from '../../../lib/onboarding';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { attachWorkerSession } from '../../../lib/workerSession';

export const runtime = 'nodejs';

function tokenFrom(request: Request) {
  return new URL(request.url).searchParams.get('token')?.trim() || '';
}

async function loadInvitation(token: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase is not configured.');
  const invitation = await admin.from('onboarding_invitations').select('id,email,role,expires_at,accepted_at,worker_id').eq('token_hash', hashOnboardingToken(token)).maybeSingle();
  if (invitation.error) throw invitation.error;
  if (!invitation.data || new Date(invitation.data.expires_at).getTime() < Date.now()) return null;
  return { admin, invitation: invitation.data };
}

export async function GET(request: Request) {
  const token = tokenFrom(request);
  if (token.length < 20) return NextResponse.json({ error: 'A valid onboarding invitation is required.' }, { status: 400 });
  try {
    const loaded = await loadInvitation(token);
    if (!loaded) return NextResponse.json({ error: 'This onboarding invitation is invalid or has expired.' }, { status: 404 });
    const { admin, invitation } = loaded;
    const progress = await admin.from('onboarding_progress').select('id,status,completed_at,task_id,onboarding_tasks(id,title,description,sort_order,role)').eq('invitation_id', invitation.id).order('task_id');
    if (progress.error) throw progress.error;
    const tasks = (progress.data || []).map((item: any) => ({ id: item.task_id, title: item.onboarding_tasks?.title || 'Onboarding task', description: item.onboarding_tasks?.description || '', sortOrder: item.onboarding_tasks?.sort_order || 0, status: item.status, completedAt: item.completed_at }));
    const response = NextResponse.json({ invitation: { email: invitation.email, role: invitation.role, expiresAt: invitation.expires_at, acceptedAt: invitation.accepted_at }, tasks });
    if (invitation.worker_id && invitation.accepted_at) attachWorkerSession(response, invitation.worker_id, invitation.email);
    return response;
  } catch (error) {
    console.error('[Onboarding] Failed to load invitation:', error);
    return NextResponse.json({ error: 'Onboarding is temporarily unavailable.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const token = tokenFrom(request);
  if (token.length < 20) return NextResponse.json({ error: 'A valid onboarding invitation is required.' }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'A valid JSON task update is required.' }, { status: 400 }); }
  const taskId = typeof body.task_id === 'string' ? body.task_id.trim() : '';
  const status = body.status === 'completed' ? 'completed' : 'pending';
  if (!taskId) return NextResponse.json({ error: 'Task id is required.' }, { status: 400 });

  try {
    const loaded = await loadInvitation(token);
    if (!loaded) return NextResponse.json({ error: 'This onboarding invitation is invalid or has expired.' }, { status: 404 });
    const { admin, invitation } = loaded;
    const update = await admin.from('onboarding_progress').update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null }).eq('task_id', taskId).eq('invitation_id', invitation.id).select('id,status,completed_at').maybeSingle();
    if (update.error) throw update.error;
    if (!update.data) return NextResponse.json({ error: 'This onboarding task was not found.' }, { status: 404 });

    const remaining = await admin.from('onboarding_progress').select('id').eq('invitation_id', invitation.id).neq('status', 'completed').limit(1);
    if (remaining.error) throw remaining.error;
    if ((remaining.data || []).length === 0) {
      await admin.from('onboarding_invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id);
      if (invitation.worker_id) await admin.from('workers').update({ onboarding_status: 'completed', onboarded_at: new Date().toISOString(), assignments_manager_enabled: true, ads_manager_enabled: true }).eq('id', invitation.worker_id);
    } else if (invitation.worker_id) {
      await admin.from('workers').update({ onboarding_status: 'in_progress' }).eq('id', invitation.worker_id);
    }
    const allCompleted = (remaining.data || []).length === 0;
    const response = NextResponse.json({ task: update.data, allCompleted });
    if (allCompleted && invitation.worker_id) attachWorkerSession(response, invitation.worker_id, invitation.email);
    return response;
  } catch (error) {
    console.error('[Onboarding] Failed to update task:', error);
    return NextResponse.json({ error: 'The onboarding task could not be updated.' }, { status: 503 });
  }
}
