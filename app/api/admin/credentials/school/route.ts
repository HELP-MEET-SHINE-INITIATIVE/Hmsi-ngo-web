import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Certificate records are unavailable.', 503);
  const result = await admin.from('hmsi_certificate_requests').select('id,enrollment_id,holder_role,holder_id,holder_name,holder_email,certificate_title,amount_ngn,status,paystack_reference,paid_at,issued_at,created_at').order('created_at', { ascending: false }).limit(200);
  if (result.error) return error('Certificate requests are unavailable. Apply the HMSI school migration first.', 503);
  return NextResponse.json({ requests: result.data || [] });
}

export async function POST(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Certificate records are unavailable.', 503);
  const body = await request.json().catch(() => ({}));
  const enrollmentId = typeof body.enrollment_id === 'string' ? body.enrollment_id.trim() : '';
  const certificateTitle = typeof body.certificate_title === 'string' ? body.certificate_title.trim().slice(0, 220) : 'HMSI Human Rights and Humanitarian Service School — Certificate of Completion';
  const amountNgn = Number(body.amount_ngn);
  if (!enrollmentId || certificateTitle.length < 10 || !Number.isSafeInteger(amountNgn) || amountNgn < 1) return error('Completed enrollment, certificate title, and a whole-number fee in NGN greater than zero are required.');
  const enrollment = await admin.from('hmsi_school_enrollments').select('id,holder_role,holder_id,holder_name,holder_email,status').eq('id', enrollmentId).maybeSingle();
  if (enrollment.error) return error('School enrollment records are unavailable.', 503);
  if (!enrollment.data || enrollment.data.status !== 'completed') return error('A certificate request can only be created after all published school modules are completed.');
  const requestRecord = await admin.from('hmsi_certificate_requests').insert({ enrollment_id: enrollmentId, holder_role: enrollment.data.holder_role, holder_id: enrollment.data.holder_id, holder_name: enrollment.data.holder_name, holder_email: enrollment.data.holder_email, certificate_title: certificateTitle, amount_ngn: amountNgn, status: 'eligible' }).select('id,enrollment_id,holder_role,holder_id,holder_name,holder_email,certificate_title,amount_ngn,status,created_at').single();
  if (requestRecord.error || !requestRecord.data) return error('The certificate request could not be created.', 503);
  return NextResponse.json({ request: requestRecord.data, createdBy: adminEmail, message: 'Certificate eligibility recorded. Payment may be initialized by the holder, and certificate issuance remains an administrator action after verified payment.' }, { status: 201 });
}
