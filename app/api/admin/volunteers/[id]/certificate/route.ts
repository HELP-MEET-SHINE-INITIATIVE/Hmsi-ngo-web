import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../../lib/supabaseAdmin';
import { createVolunteerCertificatePdf, createCertificateNumber, createVerificationCode, hashVerificationCode } from '../../../../../../lib/volunteerCertificate';
import { sendResendEmailWithRetry } from '../../../../../../lib/resendRetryQueue';

export const runtime = 'nodejs';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('A valid JSON certificate request is required.');
  }

  const { id } = await params;
  const serviceTitle = typeof body.service_title === 'string' ? body.service_title.trim() : '';
  const serviceStart = typeof body.service_start === 'string' && datePattern.test(body.service_start) ? body.service_start : null;
  const serviceEnd = typeof body.service_end === 'string' && datePattern.test(body.service_end) ? body.service_end : null;
  const issuedOn = typeof body.issued_on === 'string' && datePattern.test(body.issued_on) ? body.issued_on : new Date().toISOString().slice(0, 10);
  const serviceHours = body.service_hours == null || body.service_hours === '' ? null : Number(body.service_hours);

  if (serviceTitle.length < 2 || serviceTitle.length > 200) return badRequest('Service title must be between 2 and 200 characters.');
  if (body.service_start && !serviceStart) return badRequest('Service start must use YYYY-MM-DD format.');
  if (body.service_end && !serviceEnd) return badRequest('Service end must use YYYY-MM-DD format.');
  if (!datePattern.test(issuedOn)) return badRequest('Issued date must use YYYY-MM-DD format.');
  if (serviceStart && serviceEnd && serviceStart > serviceEnd) return badRequest('Service end cannot be earlier than service start.');
  if (serviceHours !== null && (!Number.isFinite(serviceHours) || serviceHours < 0 || serviceHours > 10000)) return badRequest('Service hours must be between 0 and 10,000.');

  try {
    const application = await admin
      .from('volunteer_applications')
      .select('id,name,email,status')
      .eq('id', id)
      .maybeSingle();
    if (application.error) throw application.error;
    if (!application.data) return NextResponse.json({ error: 'This volunteer application was not found.' }, { status: 404 });
    if (application.data.status !== 'approved') return badRequest('Certificates can only be issued for approved volunteer applications.');
    if (!emailPattern.test(application.data.email)) return badRequest('The volunteer application does not contain a valid email address.');

    const certificateNumber = createCertificateNumber(new Date(`${issuedOn}T00:00:00Z`));
    const verificationCode = createVerificationCode();
    const verificationCodeHash = hashVerificationCode(verificationCode);

    const inserted = await admin.from('volunteer_certificates').insert({
      volunteer_application_id: application.data.id,
      certificate_number: certificateNumber,
      verification_code_hash: verificationCodeHash,
      holder_name: application.data.name,
      holder_email: application.data.email.trim().toLowerCase(),
      service_title: serviceTitle,
      service_start: serviceStart,
      service_end: serviceEnd,
      service_hours: serviceHours,
      issued_on: issuedOn,
      status: 'valid',
    }).select('id,certificate_number,holder_name,holder_email,service_title,service_start,service_end,service_hours,issued_on,status').single();

    if (inserted.error) {
      if (inserted.error.code === '23505') return badRequest('A certificate for this service and issue date already exists.');
      throw inserted.error;
    }

    const pdf = await createVolunteerCertificatePdf({
      certificateNumber,
      holderName: application.data.name,
      serviceTitle,
      serviceStart,
      serviceEnd,
      serviceHours,
      issuedOn,
    });

    let emailSent = false;
    let emailError = '';
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
      const dispatch = await sendResendEmailWithRetry(resendApiKey, {
        from: process.env.RESEND_FROM_EMAIL?.trim() || 'contact@hmsi.org.ng',
        to: [application.data.email.trim().toLowerCase()],
        subject: 'HMSI volunteer service certificate',
        html: `<p>Dear ${application.data.name},</p><p>HMSI has issued your volunteer service certificate for <strong>${serviceTitle}</strong>. The certificate is attached as a PDF.</p><p>Keep your private verification code safe: <strong>${verificationCode}</strong>. It is required with the certificate number to verify the certificate at <a href="https://www.hmsi.org.ng/certificates/verify">hmsi.org.ng/certificates/verify</a>.</p><p>For questions, contact <a href="mailto:contact@hmsi.org.ng">contact@hmsi.org.ng</a>.</p>`,
        text: `HMSI has issued your volunteer service certificate for ${serviceTitle}. The PDF is attached. Keep your private verification code safe: ${verificationCode}. Verify at https://www.hmsi.org.ng/certificates/verify using the certificate number and code. For questions, contact contact@hmsi.org.ng.`,
        attachments: [{ filename: `HMSI-volunteer-certificate-${certificateNumber}.pdf`, content: Buffer.from(pdf).toString('base64') }],
        idempotencyKey: `volunteer_certificate_${certificateNumber}`,
      }, { maxRetries: 3, baseDelayMs: 200, maxDelayMs: 2500 });
      emailSent = dispatch.ok;
      if (!dispatch.ok) emailError = dispatch.error || 'Certificate email could not be delivered.';
    } else {
      emailError = 'Certificate email delivery is not configured.';
    }

    return NextResponse.json({ certificate: inserted.data, verificationCode, emailSent, emailError: emailError || undefined });
  } catch (error) {
    console.error('[Admin] Failed to issue volunteer certificate:', error);
    return NextResponse.json({ error: 'We could not issue this volunteer certificate.' }, { status: 500 });
  }
}
