import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { createCredentialCode, createMemberNumber, hashCredentialCode } from '../../../../../lib/hmsiCredentials';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Credential storage is unavailable.', 503);
  const result = await admin.from('hmsi_id_cards').select('id,holder_role,holder_id,holder_name,holder_email,member_number,role_display,activation_code_expires_at,activated_at,status,issued_by,issued_at,expires_at').order('issued_at', { ascending: false }).limit(200);
  if (result.error) return error('ID cards are unavailable. Apply the HMSI school migration first.', 503);
  return NextResponse.json({ cards: result.data || [] });
}

export async function POST(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Credential storage is unavailable.', 503);
  const body = await request.json().catch(() => ({}));
  const holderRole = body.holder_role === 'worker' || body.holder_role === 'volunteer' || body.holder_role === 'member' ? body.holder_role : null;
  const holderId = typeof body.holder_id === 'string' ? body.holder_id.trim() : '';
  const expiresAt = typeof body.expires_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.expires_at) ? body.expires_at : null;
  if (!holderRole || !holderId) return error('An approved worker, volunteer, or general member is required.');

  let holder: { id: string; name: string; email: string; role: string; status: string } | null = null;
  if (holderRole === 'worker') {
    const result = await admin.from('workers').select('id,name,email,role,status,onboarding_status').eq('id', holderId).maybeSingle();
    if (result.error) return error('Worker records are unavailable.', 503);
    if (!result.data || result.data.status !== 'active' || result.data.onboarding_status !== 'completed') return error('Only active, successfully onboarded workers may receive an HMSI ID card.');
    holder = { id: result.data.id, name: result.data.name, email: result.data.email, role: result.data.role, status: result.data.status };
  } else if (holderRole === 'volunteer') {
    const result = await admin.from('volunteer_applications').select('id,name,email,applicant_role,status,account_status').eq('id', holderId).maybeSingle();
    if (result.error) return error('Volunteer records are unavailable.', 503);
    if (!result.data || result.data.status !== 'approved' || result.data.account_status !== 'active' || result.data.applicant_role === 'worker') return error('Only approved active volunteers may receive a volunteer HMSI ID card.');
    holder = { id: result.data.id, name: result.data.name, email: result.data.email, role: 'volunteer', status: result.data.account_status };
  } else {
    const result = await admin.from('hmsi_members').select('id,name,email,status').eq('id', holderId).maybeSingle();
    if (result.error) return error('General member records are unavailable.', 503);
    if (!result.data || result.data.status !== 'active') return error('Only active approved members may receive a general-member HMSI ID card.');
    holder = { id: result.data.id, name: result.data.name, email: result.data.email, role: 'member', status: result.data.status };
  }

  await admin.from('hmsi_id_cards').update({ status: 'revoked' }).eq('holder_role', holderRole).eq('holder_id', holder.id).eq('status', 'active');
  const activationCode = createCredentialCode();
  const inserted = await admin.from('hmsi_id_cards').insert({
    holder_role: holderRole,
    holder_id: holder.id,
    holder_name: holder.name,
    holder_email: holder.email.trim().toLowerCase(),
    member_number: createMemberNumber(holderRole),
    role_display: holderRole === 'worker' ? (holder.role === 'coordinator' ? 'HMSI Worker Coordinator' : 'HMSI Worker') : holderRole === 'volunteer' ? 'HMSI Volunteer' : 'HMSI Member',
    activation_code_hash: hashCredentialCode(activationCode),
    activation_code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    issued_by: adminEmail,
    expires_at: expiresAt,
  }).select('id,holder_role,holder_id,holder_name,holder_email,member_number,role_display,activation_code_expires_at,activated_at,status,issued_by,issued_at,expires_at').single();
  if (inserted.error || !inserted.data) return error('The ID card could not be issued.', 503);
  return NextResponse.json({ card: inserted.data, activationCode, warning: 'Show the activation code only to the holder. It is a temporary activation credential, not a permanent password.' }, { status: 201 });
}
