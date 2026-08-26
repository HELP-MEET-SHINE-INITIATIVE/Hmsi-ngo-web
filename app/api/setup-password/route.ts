import { NextResponse } from 'next/server';
import { hashPasswordSetupToken } from '../../../lib/passwordSetup';
import { attachPortalSession, signInPortal } from '../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const GENERIC = 'This setup link is invalid, expired, or has already been used.';

function validPassword(password: string) { return password.length >= 10 && password.length <= 256; }

async function loadLink(token: string, hmsiId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase is not configured.');
  const link = await admin.from('password_setup_links').select('id,onboarding_invitation_id,hmsi_id_card_id,expires_at,setup_completed_at,onboarding_invitations(email,role,worker_id,volunteer_application_id,member_id),hmsi_id_cards(member_number,holder_role,holder_id)').eq('token_hash', hashPasswordSetupToken(token)).maybeSingle();
  if (link.error) throw link.error;
  const card = link.data?.hmsi_id_cards as { member_number?: string; holder_role?: string; holder_id?: string } | null;
  if (!link.data || link.data.setup_completed_at || new Date(link.data.expires_at).getTime() < Date.now() || card?.member_number !== hmsiId) return { admin, link: null };
  return { admin, link: link.data, card };
}

export async function GET(request: Request) {
  const url = new URL(request.url); const token = url.searchParams.get('token')?.trim() || ''; const hmsiId = url.searchParams.get('id')?.trim().toUpperCase() || '';
  if (token.length < 20 || !hmsiId) return NextResponse.json({ error: GENERIC }, { status: 404 });
  try { const loaded = await loadLink(token, hmsiId); if (!loaded.link || !loaded.card) return NextResponse.json({ error: GENERIC }, { status: 404 }); return NextResponse.json({ hmsiId: loaded.card.member_number, expiresAt: loaded.link.expires_at }, { headers: { 'Cache-Control': 'no-store' } }); } catch { return NextResponse.json({ error: 'Password setup is temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : ''; const hmsiId = typeof body.hmsiId === 'string' ? body.hmsiId.trim().toUpperCase() : ''; const password = typeof body.password === 'string' ? body.password : ''; const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  if (token.length < 20 || !hmsiId || !validPassword(password) || password !== confirmPassword) return NextResponse.json({ error: 'Use matching passwords of at least 10 characters.' }, { status: 400 });
  try {
    const loaded = await loadLink(token, hmsiId); if (!loaded.link || !loaded.card) return NextResponse.json({ error: GENERIC }, { status: 404 });
    const invitation = loaded.link.onboarding_invitations as { email?: string; role?: string; worker_id?: string | null; volunteer_application_id?: string | null; member_id?: string | null } | null;
    const role = invitation?.role === 'worker' || invitation?.role === 'volunteer' || invitation?.role === 'member' ? invitation.role : null;
    const email = invitation?.email?.trim().toLowerCase() || '';
    if (!role || !email) return NextResponse.json({ error: GENERIC }, { status: 404 });
    const table = role === 'worker' ? 'workers' : role === 'volunteer' ? 'volunteer_applications' : 'hmsi_members';
    const profileFields = role === 'worker'
      ? 'id,name,email,auth_user_id,status,onboarding_status'
      : role === 'volunteer'
        ? 'id,name,email,auth_user_id,status,account_status'
        : 'id,name,email,auth_user_id,status,onboarding_status';
    const profile = await loaded.admin.from(table).select(profileFields).eq('id', loaded.card.holder_id).maybeSingle();
    if (profile.error) throw profile.error;
    const profileData = profile.data as { id: string; auth_user_id: string | null; status: string; onboarding_status?: string | null; account_status?: string | null } | null;
    const active = role === 'worker' ? profileData?.status === 'active' && profileData.onboarding_status === 'completed' : role === 'volunteer' ? profileData?.status === 'approved' && profileData.account_status === 'active' : profileData?.status === 'active' && profileData.onboarding_status === 'completed';
    if (!profileData || !active || profileData.auth_user_id) return NextResponse.json({ error: 'This portal account is not eligible for first-time setup.' }, { status: 409 });
    const created = await loaded.admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { hmsi_role: role, hmsi_profile_id: profileData.id } });
    if (created.error || !created.data.user) return NextResponse.json({ error: created.error?.message?.toLowerCase().includes('already') ? 'A portal account already exists. Sign in or use password recovery.' : 'Portal setup is temporarily unavailable.' }, { status: created.error?.message?.toLowerCase().includes('already') ? 409 : 503 });
    const linked = await loaded.admin.from(table).update({ auth_user_id: created.data.user.id }).eq('id', profileData.id).is('auth_user_id', null);
    if (linked.error) { await loaded.admin.auth.admin.deleteUser(created.data.user.id); throw linked.error; }
    const completed = await loaded.admin.from('password_setup_links').update({ setup_completed_at: new Date().toISOString() }).eq('id', loaded.link.id).is('setup_completed_at', null).select('id').maybeSingle();
    if (completed.error || !completed.data) return NextResponse.json({ error: GENERIC }, { status: 409 });
    const activated = await loaded.admin.from('hmsi_id_cards').update({ activated_at: new Date().toISOString() }).eq('id', loaded.card.holder_id ? loaded.link.hmsi_id_card_id : '').is('activated_at', null);
    if (activated.error) throw activated.error;
    const session = await signInPortal(email, password);
    const response = NextResponse.json({ user: session.identity, redirectTo: '/portal' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    return attachPortalSession(response, session.accessToken, session.refreshToken);
  } catch (error) { console.error('[Password setup] Failed:', error instanceof Error ? error.message : 'unknown'); return NextResponse.json({ error: 'Portal setup is temporarily unavailable.' }, { status: 503 }); }
}
