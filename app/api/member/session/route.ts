import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { clearMemberSession, getMemberSessionFromCookie } from '../../../../lib/memberSession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = getMemberSessionFromCookie(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ authenticated: false });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ authenticated: false }, { status: 503 });
  const card = await admin.from('hmsi_id_cards').select('member_number,holder_role,holder_id,holder_name,holder_email,role_display,status,expires_at').eq('holder_id', session.holderId).eq('holder_role', session.holderRole).eq('holder_email', session.email).eq('status', 'active').maybeSingle();
  if (card.error || !card.data) return NextResponse.json({ authenticated: false });
  if (card.data.holder_role === 'member') {
    const member = await admin.from('hmsi_members').select('id,status').eq('id', session.holderId).eq('email', session.email).maybeSingle();
    if (member.error || !member.data || member.data.status !== 'active') return NextResponse.json({ authenticated: false });
  }
  if (card.data.expires_at && new Date(`${card.data.expires_at}T23:59:59Z`).getTime() < Date.now()) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, member: card.data });
}

export async function DELETE() {
  return clearMemberSession(NextResponse.json({ ok: true }));
}
