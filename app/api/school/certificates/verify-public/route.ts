import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { hashCredentialCode } from '../../../../../lib/hmsiCredentials';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Certificate verification is temporarily unavailable.' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const number = typeof body.certificate_number === 'string' ? body.certificate_number.trim().toUpperCase() : '';
  const code = typeof body.verification_code === 'string' ? body.verification_code.trim().toUpperCase() : '';
  if (!/^HMSI-HS-\d{4}-[A-F0-9]{8}$/.test(number) || !/^[A-F0-9]{12}$/.test(code)) return NextResponse.json({ error: 'Enter a valid certificate number and private verification code.' }, { status: 400 });
  const result = await admin.from('hmsi_school_certificates').select('certificate_number,verification_code_hash,holder_name,certificate_title,issued_on,status').eq('certificate_number', number).maybeSingle();
  if (result.error || !result.data || result.data.status !== 'valid' || hashCredentialCode(code) !== result.data.verification_code_hash) return NextResponse.json({ error: 'The certificate could not be verified.' }, { status: 404 });
  return NextResponse.json({ certificate: { certificate_number: result.data.certificate_number, holder_name: result.data.holder_name, certificate_title: result.data.certificate_title, issued_on: result.data.issued_on, status: result.data.status, notice: 'HMSI completion credential; not a government identity document, professional licence, legal-practice certificate, university award, or proof of external accreditation.' } });
}
