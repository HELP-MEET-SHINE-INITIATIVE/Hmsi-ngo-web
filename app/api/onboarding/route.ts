import { NextResponse } from 'next/server';
import { createCredentialCode, createMemberNumber, hashCredentialCode } from '../../../lib/hmsiCredentials';
import { hashOnboardingToken } from '../../../lib/onboarding';
import { createPasswordSetupToken, getPasswordSetupUrl, hashPasswordSetupToken, PASSWORD_SETUP_LINK_DAYS } from '../../../lib/passwordSetup';
import { passwordSetupTemplate, sendHmsiNotification } from '../../../lib/hmsiNotifications';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function tokenFrom(request: Request) {
  return new URL(request.url).searchParams.get('token')?.trim() || '';
}

async function loadInvitation(token: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase is not configured.');
  const invitation = await admin.from('onboarding_invitations').select('id,email,role,expires_at,accepted_at,worker_id,volunteer_application_id,member_id').eq('token_hash', hashOnboardingToken(token)).maybeSingle();
  if (invitation.error) throw invitation.error;
  if (!invitation.data || new Date(invitation.data.expires_at).getTime() < Date.now()) return null;
  return { admin, invitation: invitation.data };
}

async function ensureHmsiId(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, profile: { id: string; name: string; email: string; role: 'worker' | 'volunteer' | 'member' }) {
  const existing = await admin.from('hmsi_id_cards').select('id,member_number').eq('holder_role', profile.role).eq('holder_id', profile.id).eq('status', 'active').order('issued_at', { ascending: false }).limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.member_number) return { id: existing.data.id, memberNumber: existing.data.member_number, newlyIssued: false };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const inserted = await admin.from('hmsi_id_cards').insert({
      holder_role: profile.role, holder_id: profile.id, holder_name: profile.name, holder_email: profile.email.trim().toLowerCase(), member_number: createMemberNumber(profile.role), role_display: profile.role === 'worker' ? 'HMSI Worker' : profile.role === 'volunteer' ? 'HMSI Volunteer' : 'HMSI Member', activation_code_hash: hashCredentialCode(createCredentialCode()), activation_code_expires_at: new Date(Date.now() + 60_000).toISOString(), status: 'active', issued_by: 'system_onboarding',
    }).select('id,member_number').single();
    if (inserted.data?.member_number && !inserted.error) return { id: inserted.data.id, memberNumber: inserted.data.member_number, newlyIssued: true };
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
    const card = invitation.accepted_at
      ? await admin.from('hmsi_id_cards').select('id,member_number').eq('holder_role', invitation.role).eq('holder_id', invitation.role === 'worker' ? invitation.worker_id : invitation.role === 'member' ? invitation.member_id : invitation.volunteer_application_id).eq('status', 'active').order('issued_at', { ascending: false }).limit(1).maybeSingle()
      : { data: null, error: null };
    if (card.error) throw card.error;
    const setup = card.data?.id ? await admin.from('password_setup_links').select('id,email_sent_at,setup_completed_at,expires_at').eq('hmsi_id_card_id', card.data.id).is('setup_completed_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle() : { data: null, error: null };
    if (setup.error) throw setup.error;
    return NextResponse.json({ invitation: { email: invitation.email, role: invitation.role, expiresAt: invitation.expires_at, acceptedAt: invitation.accepted_at }, tasks, hmsiId: card.data?.member_number || null, setupLinkIssued: Boolean(setup.data && new Date(setup.data.expires_at).getTime() > Date.now()), setupEmailSent: Boolean(setup.data?.email_sent_at) });
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
      let setupEmailSent = false;
      if ((remaining.data || []).length === 0) {
        const firstCompletion = !invitation.accepted_at;
        await admin.from('onboarding_invitations').update({ accepted_at: invitation.accepted_at || new Date().toISOString() }).eq('id', invitation.id);
        if (invitation.role === 'worker' && invitation.worker_id) {
          const worker = await admin.from('workers').update({ onboarding_status: 'completed', onboarded_at: new Date().toISOString(), assignments_manager_enabled: true, ads_manager_enabled: true }).eq('id', invitation.worker_id).select('id,name,email').single();
          if (worker.error || !worker.data) throw worker.error || new Error('Worker record is unavailable.');
          const issued = await ensureHmsiId(admin, { ...worker.data, role: 'worker' });
          hmsiId = issued.memberNumber;
          if (issued.newlyIssued) {
            const event = await admin.from('portal_access_events').insert([
            { worker_id: worker.data.id, event_type: 'onboarding_completed', actor_email: invitation.email.trim().toLowerCase(), metadata: { source: 'onboarding' } },
            { worker_id: worker.data.id, event_type: 'hmsi_id_issued', actor_email: 'system_onboarding', metadata: { source: 'onboarding' } },
          ]);
            if (event.error) throw event.error;
          }
          if (firstCompletion) {
            const rawToken = createPasswordSetupToken();
            const expiresAt = new Date(Date.now() + PASSWORD_SETUP_LINK_DAYS * 24 * 60 * 60 * 1000).toISOString();
            const link = await admin.from('password_setup_links').insert({ onboarding_invitation_id: invitation.id, hmsi_id_card_id: issued.id, token_hash: hashPasswordSetupToken(rawToken), expires_at: expiresAt }).select('id').single();
            if (link.error) throw link.error;
            const setupUrl = getPasswordSetupUrl({ token: rawToken, hmsiId: issued.memberNumber });
            const mail = passwordSetupTemplate({ name: worker.data.name, hmsiId: issued.memberNumber, setupUrl });
            const delivery = await sendHmsiNotification({ sender: 'onboarding', to: [invitation.email.trim().toLowerCase()], subject: 'Your HMSI ID and one-time portal setup link', ...mail, idempotencyKey: `password_setup_${link.data.id}` });
            if (delivery.sent) {
              const marked = await admin.from('password_setup_links').update({ email_sent_at: new Date().toISOString() }).eq('id', link.data.id);
              if (marked.error) throw marked.error;
              setupEmailSent = true;
            }
          }
        } else if (invitation.role === 'volunteer' && invitation.volunteer_application_id) {
          const volunteer = await admin.from('volunteer_applications').select('id,name,email,status,account_status').eq('id', invitation.volunteer_application_id).maybeSingle();
          if (volunteer.error || !volunteer.data || volunteer.data.status !== 'approved' || volunteer.data.account_status !== 'active') throw volunteer.error || new Error('Volunteer record is unavailable.');
          const issued = await ensureHmsiId(admin, { id: volunteer.data.id, name: volunteer.data.name, email: volunteer.data.email, role: 'volunteer' });
          hmsiId = issued.memberNumber;
          if (firstCompletion) {
            const rawToken = createPasswordSetupToken();
            const expiresAt = new Date(Date.now() + PASSWORD_SETUP_LINK_DAYS * 24 * 60 * 60 * 1000).toISOString();
            const link = await admin.from('password_setup_links').insert({ onboarding_invitation_id: invitation.id, hmsi_id_card_id: issued.id, token_hash: hashPasswordSetupToken(rawToken), expires_at: expiresAt }).select('id').single();
            if (link.error) throw link.error;
            const setupUrl = getPasswordSetupUrl({ token: rawToken, hmsiId: issued.memberNumber });
            const mail = passwordSetupTemplate({ name: volunteer.data.name, hmsiId: issued.memberNumber, setupUrl });
            const delivery = await sendHmsiNotification({ sender: 'onboarding', to: [invitation.email.trim().toLowerCase()], subject: 'Your HMSI ID and one-time portal setup link', ...mail, idempotencyKey: `password_setup_${link.data.id}` });
            if (delivery.sent) { const marked = await admin.from('password_setup_links').update({ email_sent_at: new Date().toISOString() }).eq('id', link.data.id); if (marked.error) throw marked.error; setupEmailSent = true; }
          }
        } else if (invitation.role === 'member' && invitation.member_id) {
          const member = await admin.from('hmsi_members').update({ onboarding_status: 'completed', onboarded_at: new Date().toISOString() }).eq('id', invitation.member_id).eq('status', 'active').select('id,name,email').single();
          if (member.error || !member.data) throw member.error || new Error('Member record is unavailable.');
          const issued = await ensureHmsiId(admin, { ...member.data, role: 'member' });
          hmsiId = issued.memberNumber;
          if (firstCompletion) {
            const rawToken = createPasswordSetupToken();
            const expiresAt = new Date(Date.now() + PASSWORD_SETUP_LINK_DAYS * 24 * 60 * 60 * 1000).toISOString();
            const link = await admin.from('password_setup_links').insert({ onboarding_invitation_id: invitation.id, hmsi_id_card_id: issued.id, token_hash: hashPasswordSetupToken(rawToken), expires_at: expiresAt }).select('id').single();
            if (link.error) throw link.error;
            const setupUrl = getPasswordSetupUrl({ token: rawToken, hmsiId: issued.memberNumber });
            const mail = passwordSetupTemplate({ name: member.data.name, hmsiId: issued.memberNumber, setupUrl });
            const delivery = await sendHmsiNotification({ sender: 'onboarding', to: [invitation.email.trim().toLowerCase()], subject: 'Your HMSI ID and one-time portal setup link', ...mail, idempotencyKey: `password_setup_${link.data.id}` });
            if (delivery.sent) { const marked = await admin.from('password_setup_links').update({ email_sent_at: new Date().toISOString() }).eq('id', link.data.id); if (marked.error) throw marked.error; setupEmailSent = true; }
          }
        }
    } else if (invitation.worker_id) {
      await admin.from('workers').update({ onboarding_status: 'in_progress' }).eq('id', invitation.worker_id);
    } else if (invitation.member_id) {
      await admin.from('hmsi_members').update({ onboarding_status: 'in_progress' }).eq('id', invitation.member_id).eq('status', 'active');
    }
    const allCompleted = (remaining.data || []).length === 0;
    return NextResponse.json({ task: update.data, allCompleted, hmsiId, setupEmailSent });
  } catch (error) {
    console.error('[Onboarding] Failed to update task:', error);
    return NextResponse.json({ error: 'The onboarding task could not be updated.' }, { status: 503 });
  }
}
