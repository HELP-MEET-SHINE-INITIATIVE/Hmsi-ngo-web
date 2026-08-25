import { NextResponse } from 'next/server';
import { createCredentialCode, createMemberNumber, hashCredentialCode } from '../../../../lib/hmsiCredentials';
import { hashOnboardingToken } from '../../../../lib/onboarding';
import { attachPortalSession, signInPortal } from '../../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

type OnboardingRole = 'worker' | 'volunteer';

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function validPassword(password: string) {
  return password.length >= 10 && password.length <= 256;
}

async function issueIdCard(input: {
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>;
  role: OnboardingRole;
  profileId: string;
  name: string;
  email: string;
}) {
  const existing = await input.admin
    .from('hmsi_id_cards')
    .select('id,member_number,activated_at')
    .eq('holder_role', input.role)
    .eq('holder_id', input.profileId)
    .eq('status', 'active')
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { card: existing.data, newlyIssued: false };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const activationCode = createCredentialCode();
    const inserted = await input.admin
      .from('hmsi_id_cards')
      .insert({
        holder_role: input.role,
        holder_id: input.profileId,
        holder_name: input.name,
        holder_email: input.email,
        member_number: createMemberNumber(input.role),
        role_display: input.role === 'worker' ? 'HMSI Worker' : 'HMSI Volunteer',
        activation_code_hash: hashCredentialCode(activationCode),
        activation_code_expires_at: new Date(Date.now() + 60_000).toISOString(),
        status: 'active',
        issued_by: 'system_onboarding',
      })
      .select('id,member_number,activated_at')
      .single();
    if (!inserted.error && inserted.data) return { card: inserted.data, newlyIssued: true };
    if (inserted.error?.code !== '23505') throw inserted.error;
  }
  throw new Error('A unique HMSI ID could not be issued. Please try again.');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  if (token.length < 20 || !validPassword(password) || password !== confirmPassword) {
    return error('Use a matching password of at least 10 characters.');
  }

  const admin = getSupabaseAdmin();
  if (!admin) return error('Portal identity service is unavailable.', 503);

  try {
    const invitation = await admin
      .from('onboarding_invitations')
      .select('id,email,role,worker_id,volunteer_application_id,expires_at')
      .eq('token_hash', hashOnboardingToken(token))
      .maybeSingle();
    if (invitation.error) throw invitation.error;
    if (!invitation.data || new Date(invitation.data.expires_at).getTime() < Date.now()) {
      return error('This onboarding invitation is invalid or expired.', 404);
    }
    if (invitation.data.role !== 'worker' && invitation.data.role !== 'volunteer') return error('This invitation does not support portal setup.', 409);

    const incomplete = await admin
      .from('onboarding_progress')
      .select('id')
      .eq('invitation_id', invitation.data.id)
      .neq('status', 'completed')
      .limit(1);
    if (incomplete.error) throw incomplete.error;
    if ((incomplete.data || []).length > 0) return error('Complete every onboarding task before creating your portal password.', 409);

    const email = invitation.data.email.trim().toLowerCase();
    const role = invitation.data.role as OnboardingRole;
    let profileId = '';
    let profileName = '';
    let profileTable: 'workers' | 'volunteer_applications' = 'workers';

    if (role === 'worker') {
      if (!invitation.data.worker_id) return error('Your approved worker record is unavailable. Contact HMSI support.', 409);
      const worker = await admin.from('workers').select('id,name,email,status,onboarding_status,auth_user_id').eq('id', invitation.data.worker_id).eq('email', email).maybeSingle();
      if (worker.error) throw worker.error;
      if (!worker.data || worker.data.status !== 'active' || worker.data.onboarding_status !== 'completed') return error('Your worker portal is not ready for activation.', 403);
      profileId = worker.data.id;
      profileName = worker.data.name;
      profileTable = 'workers';
      if (worker.data.auth_user_id) return error('A portal account already exists. Sign in or use password recovery.', 409);
    } else {
      const volunteer = await admin.from('volunteer_applications').select('id,name,email,status,account_status,auth_user_id').eq('id', invitation.data.volunteer_application_id).eq('email', email).maybeSingle();
      if (volunteer.error) throw volunteer.error;
      if (!volunteer.data || volunteer.data.status !== 'approved' || volunteer.data.account_status !== 'active') return error('Your volunteer portal is not ready for activation.', 403);
      profileId = volunteer.data.id;
      profileName = volunteer.data.name;
      profileTable = 'volunteer_applications';
      if (volunteer.data.auth_user_id) return error('A portal account already exists. Sign in or use password recovery.', 409);
    }

    const issued = await issueIdCard({ admin, role, profileId, name: profileName, email });
    const card = issued.card;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { hmsi_role: role, hmsi_profile_id: profileId },
    });
    if (created.error || !created.data.user) {
      return error(created.error?.message?.toLowerCase().includes('already') ? 'A portal account already exists. Sign in or use password recovery.' : 'The portal account could not be created.', created.error?.message?.toLowerCase().includes('already') ? 409 : 503);
    }

    const linked = await admin.from(profileTable).update({ auth_user_id: created.data.user.id }).eq('id', profileId);
    if (linked.error) {
      await admin.auth.admin.deleteUser(created.data.user.id);
      throw linked.error;
    }
    const activated = await admin.from('hmsi_id_cards').update({ activated_at: new Date().toISOString() }).eq('id', card.id).is('activated_at', null);
    if (activated.error) throw activated.error;
    if (role === 'worker') {
      const events = [
        ...(issued.newlyIssued ? [{ worker_id: profileId, event_type: 'hmsi_id_issued', actor_email: 'system_onboarding', metadata: { source: 'password_setup_fallback' } }] : []),
        { worker_id: profileId, event_type: 'password_created', actor_email: email, metadata: { source: 'onboarding' } },
      ];
      const eventInsert = await admin.from('portal_access_events').insert(events);
      if (eventInsert.error) throw eventInsert.error;
    }

    const session = await signInPortal(email, password);
    const response = NextResponse.json({ user: session.identity, hmsiId: card.member_number, redirectTo: '/portal/my-tasks' }, { status: 201 });
    attachPortalSession(response, session.accessToken, session.refreshToken);
    return response;
  } catch (cause) {
    console.error('[Onboarding password] Setup failed:', cause instanceof Error ? cause.message : 'unknown');
    return error('Portal setup is temporarily unavailable.', 503);
  }
}
