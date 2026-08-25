import { NextResponse } from 'next/server';
import { createCredentialCode, createMemberNumber, hashCredentialCode } from '../../../lib/hmsiCredentials';
import { hashOnboardingToken } from '../../../lib/onboarding';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

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

async function ensureWorkerHmsiId(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, worker: { id: string; name: string; email: string }) {
  const existing = await admin.from('hmsi_id_cards').select('member_number').eq('holder_role', 'worker').eq('holder_id', worker.id).eq('status', 'active').order('issued_at', { ascending: false }).limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.member_number) return { memberNumber: existing.data.member_number, newlyIssued: false };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const inserted = await admin.from('hmsi_id_cards').insert({
      holder_role: 'worker', holder_id: worker.id, holder_name: worker.name, holder_email: worker.email.trim().toLowerCase(), member_number: createMemberNumber('worker'), role_display: 'HMSI Worker', activation_code_hash: hashCredentialCode(createCredentialCode()), activation_code_expires_at: new Date(Date.now() + 60_000).toISOString(), status: 'active', issued_by: 'system_onboarding',
    }).select('member_number').single();
    if (inserted.data?.member_number && !inserted.error) return { memberNumber: inserted.data.member_number, newlyIssued: true };
    if (inserted.error?.code !== '23505') throw inserted.error;
  }
  throw new Error('Unable to issue a unique HMSI ID.');
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
    const card = invitation.worker_id && invitation.accepted_at
      ? await admin.from('hmsi_id_cards').select('member_number').eq('holder_role', 'worker').eq('holder_id', invitation.worker_id).eq('status', 'active').order('issued_at', { ascending: false }).limit(1).maybeSingle()
      : { data: null, error: null };
    if (card.error) throw card.error;
    return NextResponse.json({ invitation: { email: invitation.email, role: invitation.role, expiresAt: invitation.expires_at, acceptedAt: invitation.accepted_at }, tasks, hmsiId: card.data?.member_number || null });
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
    let hmsiId: string | null = null;
    if ((remaining.data || []).length === 0) {
      await admin.from('onboarding_invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id);
      if (invitation.worker_id) {
        const worker = await admin.from('workers').update({ onboarding_status: 'completed', onboarded_at: new Date().toISOString(), assignments_manager_enabled: true, ads_manager_enabled: true }).eq('id', invitation.worker_id).select('id,name,email').single();
        if (worker.error || !worker.data) throw worker.error || new Error('Worker record is unavailable.');
        const issued = await ensureWorkerHmsiId(admin, worker.data);
        hmsiId = issued.memberNumber;
        if (issued.newlyIssued) {
          const event = await admin.from('portal_access_events').insert([
            { worker_id: worker.data.id, event_type: 'onboarding_completed', actor_email: invitation.email.trim().toLowerCase(), metadata: { source: 'onboarding' } },
            { worker_id: worker.data.id, event_type: 'hmsi_id_issued', actor_email: 'system_onboarding', metadata: { source: 'onboarding' } },
          ]);
          if (event.error) throw event.error;
        }
      }
    } else if (invitation.worker_id) {
      await admin.from('workers').update({ onboarding_status: 'in_progress' }).eq('id', invitation.worker_id);
    }
    const allCompleted = (remaining.data || []).length === 0;
    return NextResponse.json({ task: update.data, allCompleted, hmsiId });
  } catch (error) {
    console.error('[Onboarding] Failed to update task:', error);
    return NextResponse.json({ error: 'The onboarding task could not be updated.' }, { status: 503 });
  }
}
