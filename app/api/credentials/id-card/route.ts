import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { attachMemberSession } from '../../../../lib/memberSession';
import { hashCredentialCode } from '../../../../lib/hmsiCredentials';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return error('ID-card verification is temporarily unavailable.', 503);
  const body = await request.json().catch(() => ({}));
  const memberNumber = typeof body.member_number === 'string' ? body.member_number.trim().toUpperCase() : '';
  const activationCode = typeof body.activation_code === 'string' ? body.activation_code.trim().toUpperCase() : '';
  if (!/^HMSI-[WVM]-\d{4}-[A-F0-9]{8}$/.test(memberNumber) || !/^[A-F0-9]{12}$/.test(activationCode)) return error('Enter the member number and activation code exactly as printed on the HMSI ID card.');

  const card = await admin.from('hmsi_id_cards').select('id,holder_role,holder_id,holder_name,holder_email,member_number,role_display,activation_code_hash,activation_code_expires_at,activated_at,status,expires_at').eq('member_number', memberNumber).maybeSingle();
  if (card.error || !card.data) return error('The HMSI ID card could not be verified.', 404);
  if (card.data.status !== 'active') return error('This HMSI ID card is no longer active.', 403);
  if (card.data.activated_at) return error('This activation code has already been used. Sign in with the member session already activated for this card.', 409);
  if (new Date(card.data.activation_code_expires_at).getTime() < Date.now()) {
    await admin.from('hmsi_id_cards').update({ status: 'expired' }).eq('id', card.data.id);
    return error('This activation code has expired. Ask an HMSI administrator to issue a replacement card.', 410);
  }
  if (hashCredentialCode(activationCode) !== card.data.activation_code_hash) return error('The ID-card details could not be verified.', 403);

  const updated = await admin.from('hmsi_id_cards').update({ activated_at: new Date().toISOString() }).eq('id', card.data.id).is('activated_at', null).select('id,holder_role,holder_id,holder_name,holder_email,member_number,role_display,activated_at,status,expires_at').single();
  if (updated.error || !updated.data) return error('This activation code has already been used.', 409);
  const response = NextResponse.json({ card: updated.data, message: 'HMSI member session activated. Keep your physical ID card secure.' });
  return attachMemberSession(response, updated.data.holder_id, updated.data.holder_role, updated.data.holder_email);
}
