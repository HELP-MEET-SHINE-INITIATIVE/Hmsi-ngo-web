import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from './supabaseAdmin';

export const ONBOARDING_INVITATION_DAYS = 30;

export interface OnboardingInvitationResult {
  invitationId: string;
  token: string;
  email: string;
  role: 'worker' | 'volunteer' | 'member';
}

export function createOnboardingToken() {
  return randomBytes(32).toString('base64url');
}

export function hashOnboardingToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createOnboardingInvitation({
  applicationId,
  workerId,
  memberId,
  email,
  role,
}: {
  applicationId?: string | null;
  workerId?: string | null;
  memberId?: string | null;
  email: string;
  role: 'worker' | 'volunteer' | 'member';
}): Promise<OnboardingInvitationResult> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase is not configured.');
  const subjectCount = Number(Boolean(applicationId)) + Number(Boolean(workerId)) + Number(Boolean(memberId));
  if (!subjectCount) throw new Error('An approved HMSI onboarding subject is required.');
  if (role === 'member' && !memberId) throw new Error('An approved HMSI member is required for member onboarding.');
  if (role === 'volunteer' && !applicationId) throw new Error('An approved volunteer application is required for volunteer onboarding.');
  if (role === 'worker' && !workerId) throw new Error('An approved worker is required for worker onboarding.');

  const token = createOnboardingToken();
  const expiresAt = new Date(Date.now() + ONBOARDING_INVITATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const inserted = await admin.from('onboarding_invitations').insert({
    volunteer_application_id: applicationId || null,
    worker_id: workerId || null,
    member_id: memberId || null,
    email: email.trim().toLowerCase(),
    role,
    token_hash: hashOnboardingToken(token),
    expires_at: expiresAt,
  }).select('id,email,role').single();
  if (inserted.error) throw inserted.error;

  const tasks = await admin.from('onboarding_tasks').select('id').in('role', ['all', role]).eq('is_active', true).order('sort_order', { ascending: true });
  if (tasks.error) throw tasks.error;
  if (tasks.data?.length) {
    const progress = await admin.from('onboarding_progress').insert(tasks.data.map((task) => ({ invitation_id: inserted.data.id, task_id: task.id, status: 'pending' })));
    if (progress.error) throw progress.error;
  }

  if (workerId) {
    const workerUpdate = await admin.from('workers').update({ onboarding_status: 'invited' }).eq('id', workerId);
    if (workerUpdate.error) throw workerUpdate.error;
  }
  if (applicationId) {
    const applicationUpdate = await admin.from('volunteer_applications').update({ onboarding_invited_at: new Date().toISOString() }).eq('id', applicationId);
    if (applicationUpdate.error) throw applicationUpdate.error;
  }
  if (memberId) {
    const memberUpdate = await admin.from('hmsi_members').update({ onboarding_status: 'invited', onboarding_invited_at: new Date().toISOString() }).eq('id', memberId);
    if (memberUpdate.error) throw memberUpdate.error;
  }

  return { invitationId: inserted.data.id, token, email: inserted.data.email, role: inserted.data.role };
}
