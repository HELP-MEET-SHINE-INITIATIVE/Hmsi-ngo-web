import { createVolunteerCertificatePdf, createCertificateNumber, createVerificationCode, hashVerificationCode } from '../lib/volunteerCertificate';

async function main() {
  const issuedOn = new Date('2026-08-22T00:00:00Z');
  const number = createCertificateNumber(issuedOn);
  const code = createVerificationCode();
  const pdf = await createVolunteerCertificatePdf({
    certificateNumber: number,
    holderName: 'Test Volunteer',
    serviceTitle: 'Community outreach support',
    serviceStart: '2026-07-01',
    serviceEnd: '2026-08-01',
    serviceHours: 24,
    issuedOn: '2026-08-22',
  });

  if (!/^HMSI-VOL-20260822-[A-F0-9]{8}$/.test(number)) throw new Error(`Invalid certificate number: ${number}`);
  if (code.length < 12 || hashVerificationCode(code).length !== 64) throw new Error('Verification code hashing failed.');
  if (Buffer.from(pdf.slice(0, 5)).toString('ascii') !== '%PDF-') throw new Error('Certificate output is not a PDF.');
  console.log(`✓ Certificate number format verified: ${number}`);
  console.log('✓ Private verification code hashed with SHA-256.');
  console.log(`✓ Certificate PDF generated: ${pdf.length} bytes`);
}

main().catch((error) => {
  console.error('Volunteer certificate test failed:', error);
  process.exit(1);
});
