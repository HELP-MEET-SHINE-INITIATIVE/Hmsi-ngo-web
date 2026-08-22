import { NextResponse } from 'next/server';
import { hashVerificationCode } from '../../../../lib/volunteerCertificate';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const certificatePattern = /^HMSI-VOL-\d{8}-[A-F0-9]{8}$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const certificateNumber = (searchParams.get('certificate_number') || '').trim().toUpperCase();
  const verificationCode = (searchParams.get('code') || '').trim();

  if (!certificatePattern.test(certificateNumber) || verificationCode.length < 12 || verificationCode.length > 80) {
    return NextResponse.json({ verified: false, error: 'Enter a valid certificate number and verification code.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ verified: false, error: 'Certificate verification is temporarily unavailable.' }, { status: 503 });

  const certificate = await admin
    .from('volunteer_certificates')
    .select('certificate_number,holder_name,service_title,service_start,service_end,service_hours,issued_on,status')
    .eq('certificate_number', certificateNumber)
    .eq('verification_code_hash', hashVerificationCode(verificationCode))
    .maybeSingle();

  if (certificate.error) {
    console.error('[Certificate Verification] Query failed:', certificate.error);
    return NextResponse.json({ verified: false, error: 'Certificate verification is temporarily unavailable.' }, { status: 503 });
  }
  if (!certificate.data || certificate.data.status !== 'valid') {
    return NextResponse.json({ verified: false, error: 'No valid HMSI certificate matched those details.' }, { status: 404 });
  }

  return NextResponse.json({ verified: true, certificate: certificate.data }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
