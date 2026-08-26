import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { syncApprovedContact } from '../../../../lib/approvedContacts';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export async function GET(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin(); if (!admin) return error('Member records are unavailable.', 503);
  const [applications, members] = await Promise.all([
    admin.from('hmsi_member_applications').select('id,name,email,phone,purpose,status,reviewed_by,reviewed_at,created_at').order('created_at', { ascending: false }).limit(200),
    admin.from('hmsi_members').select('id,application_id,name,email,phone,status,created_at,updated_at').order('created_at', { ascending: false }).limit(200),
  ]);
  if (applications.error || members.error) return error('Member records are unavailable. Apply the HMSI member migration first.', 503);
  return NextResponse.json({ applications: applications.data || [], members: members.data || [] });
}
export async function PATCH(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie')); if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin(); if (!admin) return error('Member records are unavailable.', 503);
  const body = await request.json().catch(() => ({})); const id = typeof body.id === 'string' ? body.id.trim() : ''; const action = body.action === 'approve' || body.action === 'reject' ? body.action : '';
  if (!id || !action) return error('A member application and review action are required.');
  const application = await admin.from('hmsi_member_applications').select('id,name,email,phone,purpose,status').eq('id', id).maybeSingle(); if (application.error || !application.data) return error('Member application not found.', 404);
  if (application.data.status !== 'pending') return error('This member application has already been reviewed.', 409);
  if (action === 'reject') {
    const rejected = await admin.from('hmsi_member_applications').update({ status: 'rejected', reviewed_by: adminEmail, reviewed_at: new Date().toISOString() }).eq('id', id).select('id,status,reviewed_at').single(); if (rejected.error) return error('The member application could not be rejected.', 503);
    return NextResponse.json({ application: rejected.data, message: 'Member application rejected.' });
  }
  const member = await admin.from('hmsi_members').upsert({ application_id: id, name: application.data.name, email: application.data.email.toLowerCase(), phone: application.data.phone || null, status: 'active', updated_at: new Date().toISOString() }, { onConflict: 'email' }).select('id,name,email,phone,status,created_at').single();
  if (member.error || !member.data) return error('The HMSI member record could not be created.', 503);
  const approved = await admin.from('hmsi_member_applications').update({ status: 'approved', reviewed_by: adminEmail, reviewed_at: new Date().toISOString() }).eq('id', id).select('id,status,reviewed_at').single();
  if (approved.error) return error('The member was created but application status could not be updated.', 503);
  try {
    await syncApprovedContact(admin, { role: 'member', sourceId: member.data.id, name: member.data.name, email: member.data.email, approvedAt: approved.data.reviewed_at });
  } catch {
    return error('The member was approved, but contact-notification readiness could not be recorded. Apply the people-operations migration, then retry the approved contact check.', 503);
  }
  return NextResponse.json({ member: member.data, application: approved.data, message: 'Member approved. Issue an HMSI ID card to activate member portal access.' });
}
