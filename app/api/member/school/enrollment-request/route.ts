import { NextResponse } from 'next/server';
import { getMemberSessionFromCookie } from '../../../../../lib/memberSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

async function getMember(request: Request) {
  const session = getMemberSessionFromCookie(request.headers.get('cookie'));
  if (!session || session.holderRole !== 'member') return { error: 'Activate an approved HMSI member ID before requesting school enrollment.', status: 401 };
  const admin = getSupabaseAdmin();
  if (!admin) return { error: 'School enrollment is temporarily unavailable.', status: 503 };
  const result = await admin.from('hmsi_members').select('id,name,email,status').eq('id', session.holderId).ilike('email', session.email).eq('status', 'active').maybeSingle();
  if (result.error || !result.data) return { error: 'Only active approved HMSI members may request school enrollment.', status: 403 };
  return { admin, member: result.data };
}

export async function GET(request: Request) {
  const result = await getMember(request);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const [requestResult, enrollmentResult] = await Promise.all([
    result.admin.from('hmsi_school_enrollment_requests').select('id,status,reason,reviewed_at,created_at').eq('member_id', result.member.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    result.admin.from('hmsi_school_enrollments').select('id,status,enrolled_at,completed_at').eq('holder_role', 'member').eq('holder_id', result.member.id).maybeSingle(),
  ]);
  if (requestResult.error || enrollmentResult.error) return NextResponse.json({ error: 'School enrollment status is temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ member: result.member, request: requestResult.data, enrollment: enrollmentResult.data });
}

export async function POST(request: Request) {
  const result = await getMember(request);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const existingEnrollment = await result.admin.from('hmsi_school_enrollments').select('id,status').eq('holder_role', 'member').eq('holder_id', result.member.id).maybeSingle();
  if (existingEnrollment.error) return NextResponse.json({ error: 'School enrollment status is temporarily unavailable.' }, { status: 503 });
  if (existingEnrollment.data) return NextResponse.json({ error: `You already have an HMSI school enrollment marked ${existingEnrollment.data.status}.` }, { status: 409 });
  const existingRequest = await result.admin.from('hmsi_school_enrollment_requests').select('id,status').eq('member_id', result.member.id).eq('status', 'pending').maybeSingle();
  if (existingRequest.error) return NextResponse.json({ error: 'School enrollment requests are temporarily unavailable.' }, { status: 503 });
  if (existingRequest.data) return NextResponse.json({ request: existingRequest.data, message: 'Your school enrollment request is already awaiting administrator review.' }, { status: 200 });
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
  const created = await result.admin.from('hmsi_school_enrollment_requests').insert({ member_id: result.member.id, member_name: result.member.name, member_email: result.member.email, reason }).select('id,status,created_at').single();
  if (created.error || !created.data) return NextResponse.json({ error: 'The school enrollment request could not be saved.' }, { status: 503 });
  return NextResponse.json({ request: created.data, message: 'Your HMSI school enrollment request was submitted for administrator review.' }, { status: 201 });
}
