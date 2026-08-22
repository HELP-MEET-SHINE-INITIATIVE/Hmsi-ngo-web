import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function adminEmail(request: Request) { return getAdminEmailFromCookie(request.headers.get('cookie')); }
function fail(error: string, status = 400) { return NextResponse.json({ error }, { status }); }

export async function GET(request: Request) {
  const email = adminEmail(request);
  if (!email) return fail('Administrator authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return fail('School enrollment requests are unavailable.', 503);
  const result = await admin.from('hmsi_school_enrollment_requests').select('id,member_id,member_name,member_email,status,reason,reviewed_by,reviewed_at,created_at').order('created_at', { ascending: false }).limit(100);
  if (result.error) return fail('School enrollment requests are unavailable.', 503);
  return NextResponse.json({ requests: result.data || [], reviewedBy: email });
}

export async function PATCH(request: Request) {
  const email = adminEmail(request);
  if (!email) return fail('Administrator authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return fail('School enrollment requests are unavailable.', 503);
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const action = body.action === 'approve' || body.action === 'reject' ? body.action : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
  if (!id || !action) return fail('A request and review action are required.');
  if (action === 'reject' && !reason) return fail('Add a reason when rejecting a school enrollment request.');
  const existing = await admin.from('hmsi_school_enrollment_requests').select('id,member_id,member_name,member_email,status').eq('id', id).maybeSingle();
  if (existing.error || !existing.data) return fail('School enrollment request not found.', 404);
  if (existing.data.status !== 'pending') return fail('This school enrollment request has already been reviewed.', 409);
  if (action === 'reject') {
    const updated = await admin.from('hmsi_school_enrollment_requests').update({ status: 'rejected', reason, reviewed_by: email, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).select('id,status,reviewed_at').single();
    if (updated.error || !updated.data) return fail('The enrollment request could not be rejected.', 503);
    return NextResponse.json({ request: updated.data, message: 'School enrollment request rejected.' });
  }
  const member = await admin.from('hmsi_members').select('id,name,email,status').eq('id', existing.data.member_id).maybeSingle();
  if (member.error || !member.data || member.data.status !== 'active') return fail('Only an active approved member can be enrolled.', 409);
  const enrollment = await admin.from('hmsi_school_enrollments').upsert({ holder_role: 'member', holder_id: member.data.id, holder_name: member.data.name, holder_email: member.data.email, status: 'enrolled' }, { onConflict: 'holder_role,holder_id' }).select('id,holder_role,holder_id,status,enrolled_at').single();
  if (enrollment.error || !enrollment.data) return fail('The school enrollment could not be created.', 503);
  const updated = await admin.from('hmsi_school_enrollment_requests').update({ status: 'approved', reviewed_by: email, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).select('id,status,reviewed_at').single();
  if (updated.error || !updated.data) return fail('The request was enrolled but its review record could not be updated.', 503);
  return NextResponse.json({ request: updated.data, enrollment: enrollment.data, message: 'Member approved and enrolled in the HMSI school.' });
}
