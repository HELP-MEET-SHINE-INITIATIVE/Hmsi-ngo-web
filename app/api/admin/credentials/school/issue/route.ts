import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../../lib/supabaseAdmin';
import { createSchoolCertificateNumber, createCredentialCode, hashCredentialCode } from '../../../../../../lib/hmsiCredentials';
import { createHmsiSchoolCertificatePdf } from '../../../../../../lib/hmsiSchoolCertificate';
import { sendResendEmailWithRetry } from '../../../../../../lib/resendRetryQueue';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Certificate records are unavailable.', 503);
  const body = await request.json().catch(() => ({}));
  const requestId = typeof body.request_id === 'string' ? body.request_id.trim() : '';
  if (!requestId) return error('A paid certificate request is required.');
  const requestRecord = await admin.from('hmsi_certificate_requests').select('id,holder_name,holder_email,certificate_title,amount_ngn,status').eq('id', requestId).maybeSingle();
  if (requestRecord.error) return error('Certificate request could not be loaded.', 503);
  if (!requestRecord.data) return error('Certificate request not found.', 404);
  if (requestRecord.data.status !== 'paid') return error('Only a verified paid certificate request can be issued.', 409);

  const certificateNumber = createSchoolCertificateNumber();
  const verificationCode = createCredentialCode();
  const inserted = await admin.from('hmsi_school_certificates').insert({ certificate_request_id: requestId, certificate_number: certificateNumber, verification_code_hash: hashCredentialCode(verificationCode), holder_name: requestRecord.data.holder_name, holder_email: requestRecord.data.holder_email, certificate_title: requestRecord.data.certificate_title, status: 'valid' }).select('id,certificate_request_id,certificate_number,holder_name,holder_email,certificate_title,issued_on,status').single();
  if (inserted.error || !inserted.data) return error(inserted.error?.code === '23505' ? 'A certificate has already been issued for this request.' : 'The school certificate could not be issued.', inserted.error?.code === '23505' ? 409 : 503);
  await admin.from('hmsi_certificate_requests').update({ status: 'issued', issued_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'paid');

  let emailSent = false;
  let emailError = '';
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    try {
      const pdf = await createHmsiSchoolCertificatePdf({ certificateNumber, holderName: requestRecord.data.holder_name, certificateTitle: requestRecord.data.certificate_title, issuedOn: inserted.data.issued_on });
      const dispatch = await sendResendEmailWithRetry(apiKey, { from: process.env.RESEND_FROM_EMAIL?.trim() || 'contact@hmsi.org.ng', to: [requestRecord.data.holder_email], subject: 'HMSI Human Rights and Humanitarian Service School certificate', html: `<p>Dear ${requestRecord.data.holder_name},</p><p>HMSI has issued your school completion certificate for <strong>${requestRecord.data.certificate_title}</strong>. The printable PDF is attached.</p><p>Keep the private verification code safe: <strong>${verificationCode}</strong>. This certificate is an HMSI completion credential, not a government identity document, professional licence, legal-practice certificate, university award, or proof of external accreditation.</p>`, text: `HMSI has issued your school completion certificate for ${requestRecord.data.certificate_title}. The printable PDF is attached. Keep the private verification code safe: ${verificationCode}.`, attachments: [{ filename: `HMSI-school-certificate-${certificateNumber}.pdf`, content: Buffer.from(pdf).toString('base64') }], idempotencyKey: `hmsi_school_certificate_${certificateNumber}` }, { maxRetries: 3, baseDelayMs: 200, maxDelayMs: 2500 });
      emailSent = dispatch.ok; if (!dispatch.ok) emailError = dispatch.error || 'Certificate email could not be delivered.';
    } catch (cause) { emailError = cause instanceof Error ? cause.message : 'Certificate PDF generation or delivery failed.'; }
  } else emailError = 'Certificate email delivery is not configured.';
  return NextResponse.json({ certificate: inserted.data, verificationCode, emailSent, emailError: emailError || undefined, issuedBy: adminEmail }, { status: 201 });
}
