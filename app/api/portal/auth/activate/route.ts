import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { activationCodeMatches } from '../../../../../lib/portalAuth';
export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const memberNumber = typeof body.memberNumber === 'string' ? body.memberNumber.trim().toUpperCase() : '';
  const activationCode = typeof body.activationCode === 'string' ? body.activationCode.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!memberNumber || !activationCode || password.length < 10 || password.length > 256) return error('ID number, activation code, and a password of at least 10 characters are required.');
  const admin = getSupabaseAdmin();
  if (!admin) return error('Portal identity service is unavailable.', 503);
  const card = await admin.from('hmsi_id_cards').select('id,holder_role,holder_id,holder_email,activation_code_hash,activation_code_expires_at,activated_at,status').eq('member_number', memberNumber).eq('status', 'active').maybeSingle();
  if (card.error || !card.data) return error('The ID card could not be verified.', 404);
  if (card.data.activated_at || new Date(card.data.activation_code_expires_at) < new Date() || !activationCodeMatches(activationCode, card.data.activation_code_hash)) return error('The ID card activation details are invalid or expired.', 401);
  const created = await admin.auth.admin.createUser({ email: card.data.holder_email, password, email_confirm: true, user_metadata: { hmsi_role: card.data.holder_role, hmsi_profile_id: card.data.holder_id } });
  if (created.error || !created.data.user) return error(created.error?.message?.includes('already') ? 'An account already exists for this email. Use sign-in or password recovery.' : 'The portal account could not be created.', created.error?.message?.includes('already') ? 409 : 503);
  const table = card.data.holder_role === 'worker' ? 'workers' : card.data.holder_role === 'volunteer' ? 'volunteer_applications' : 'hmsi_members';
  const linked = await admin.from(table).update({ auth_user_id: created.data.user.id }).eq('id', card.data.holder_id);
  if (linked.error) { await admin.auth.admin.deleteUser(created.data.user.id); return error('The portal identity could not be linked to its HMSI record.', 503); }
  const activated = await admin.from('hmsi_id_cards').update({ activated_at: new Date().toISOString() }).eq('id', card.data.id);
  if (activated.error) return error('The account was created, but the ID card activation could not be finalized.', 503);
  return NextResponse.json({ message: 'Your HMSI portal account is ready. You can now sign in.' }, { status: 201 });
}
