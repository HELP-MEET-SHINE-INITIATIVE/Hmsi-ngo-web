import { NextResponse } from 'next/server';
import { getMemberSessionFromCookie } from '../../../../../../lib/memberSession';
import { getSupabaseAdmin } from '../../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getMemberSessionFromCookie(request.headers.get('cookie'));
  if (!session || session.holderRole !== 'member') return error('Activate an approved HMSI member session before expressing interest.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Member applications are temporarily unavailable.', 503);
  const member = await admin.from('hmsi_members').select('id,name,email,phone,status').eq('id', session.holderId).eq('email', session.email).maybeSingle();
  if (member.error) return error('Member records are temporarily unavailable.', 503);
  if (!member.data || member.data.status !== 'active') return error('This member account is not active.', 403);

  const { id } = await params;
  const opportunity = await admin.from('opportunities').select('id,title,status,member_visible,requires_hmsi_certificate').eq('id', id).maybeSingle();
  if (opportunity.error) return error('The opportunity could not be loaded.', 503);
  if (!opportunity.data || opportunity.data.status !== 'open' || !opportunity.data.member_visible) return error('This member opportunity is not currently open.', 404);

  if (opportunity.data.requires_hmsi_certificate) {
    const certificate = await admin.from('hmsi_school_certificates').select('id').eq('holder_role', 'member').eq('holder_id', session.holderId).eq('holder_email', session.email).eq('status', 'valid').limit(1);
    if (certificate.error) return error('Certificate eligibility could not be checked.', 503);
    if (!certificate.data?.length) return error('Complete the HMSI school and obtain a valid HMSI certificate of completion before expressing interest in this leadership pathway.', 403);
  }

  const application = await admin.from('opportunity_applications').insert({ opportunity_id: id, applicant_name: member.data.name, applicant_email: member.data.email.toLowerCase(), applicant_phone: member.data.phone || null, applicant_role: 'member', status: 'pending' }).select('id,opportunity_id,applicant_name,applicant_email,applicant_role,status,created_at').single();
  if (application.error) {
    if (application.error.code === '23505') return error('You have already expressed interest in this opportunity.', 409);
    return error('The member opportunity interest could not be saved.', 503);
  }
  return NextResponse.json({ application: application.data, message: 'Your expression of interest was submitted for administrator review.' }, { status: 201 });
}
