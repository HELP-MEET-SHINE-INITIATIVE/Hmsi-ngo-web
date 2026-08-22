import { NextResponse } from 'next/server';
import { getMemberSessionFromCookie } from '../../../../lib/memberSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const session = getMemberSessionFromCookie(request.headers.get('cookie'));
  if (!session || session.holderRole !== 'member') return error('Activate an approved HMSI member session to view member opportunities.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Member opportunities are temporarily unavailable.', 503);

  const member = await admin.from('hmsi_members').select('id,name,email,status').eq('id', session.holderId).eq('email', session.email).maybeSingle();
  if (member.error) return error('Member records are temporarily unavailable.', 503);
  if (!member.data || member.data.status !== 'active') return error('This member account is not active.', 403);

  const [opportunities, certificates] = await Promise.all([
    admin.from('opportunities').select('id,title,description,audience,location,starts_at,ends_at,status,category,eligibility_note,requires_hmsi_certificate,member_visible,work_mode').eq('status', 'open').eq('member_visible', true).order('starts_at', { ascending: true }).limit(100),
    admin.from('hmsi_school_certificates').select('id,certificate_title,issued_on,status').eq('holder_role', 'member').eq('holder_id', session.holderId).eq('holder_email', session.email).eq('status', 'valid').order('issued_on', { ascending: false }).limit(10),
  ]);
  if (opportunities.error || certificates.error) return error('Member opportunities are temporarily unavailable.', 503);
  const hasValidCertificate = (certificates.data || []).length > 0;
  return NextResponse.json({ opportunities: opportunities.data || [], hasValidCertificate });
}
