import { createHash, randomBytes } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface VolunteerCertificateData {
  certificateNumber: string;
  holderName: string;
  serviceTitle: string;
  serviceStart?: string | null;
  serviceEnd?: string | null;
  serviceHours?: number | null;
  issuedOn: string;
}

export function createVerificationCode() {
  return randomBytes(18).toString('base64url');
}

export function hashVerificationCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

export function createCertificateNumber(issuedOn = new Date()) {
  const date = issuedOn.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `HMSI-VOL-${date}-${suffix}`;
}

function dateLabel(value?: string | null) {
  if (!value) return 'Not specified';
  const parsed = new Date(`${value}T00:00:00Z`);
  return parsed.toLocaleDateString('en-NG', { dateStyle: 'long', timeZone: 'Africa/Lagos' });
}

function centeredX(font: { widthOfTextAtSize: (text: string, size: number) => number }, text: string, size: number, width = 841.89) {
  return Math.max(45, (width - font.widthOfTextAtSize(text, size)) / 2);
}

export async function createVolunteerCertificatePdf(data: VolunteerCertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const dark = rgb(0.09, 0.13, 0.118);
  const green = rgb(0.118, 0.357, 0.286);
  const gold = rgb(0.882, 0.678, 0.271);
  const muted = rgb(0.40, 0.45, 0.42);
  const pale = rgb(0.965, 0.957, 0.937);

  page.drawRectangle({ x: 0, y: 0, width: 841.89, height: 595.28, color: pale });
  page.drawRectangle({ x: 30, y: 30, width: 781.89, height: 535.28, borderColor: green, borderWidth: 2 });
  page.drawRectangle({ x: 45, y: 45, width: 751.89, height: 505.28, borderColor: gold, borderWidth: 1 });

  page.drawText('HELP-MEET SHINE INITIATIVE', { x: centeredX(bold, 'HELP-MEET SHINE INITIATIVE', 19), y: 492, size: 19, font: bold, color: green });
  page.drawText('CERTIFICATE OF VOLUNTEER SERVICE', { x: centeredX(bold, 'CERTIFICATE OF VOLUNTEER SERVICE', 27), y: 445, size: 27, font: bold, color: dark });
  page.drawText('This certificate acknowledges the service recorded below', { x: centeredX(regular, 'This certificate acknowledges the service recorded below', 12), y: 417, size: 12, font: regular, color: muted });

  page.drawText(data.holderName, { x: centeredX(bold, data.holderName, 30), y: 352, size: 30, font: bold, color: green });
  page.drawLine({ start: { x: 215, y: 337 }, end: { x: 627, y: 337 }, thickness: 1, color: gold });
  const serviceLine = `for completing volunteer service as ${data.serviceTitle}`;
  page.drawText(serviceLine, { x: centeredX(regular, serviceLine, 13), y: 304, size: 13, font: regular, color: dark });

  const period = data.serviceStart || data.serviceEnd
    ? `${dateLabel(data.serviceStart)} – ${dateLabel(data.serviceEnd)}`
    : 'Service period recorded by HMSI';
  const hours = data.serviceHours == null ? 'Hours not specified' : `${data.serviceHours.toLocaleString('en-NG')} hours recorded`;
  const periodLine = `${period} · ${hours}`;
  page.drawText(periodLine, { x: centeredX(regular, periodLine, 11), y: 267, size: 11, font: regular, color: muted });

  page.drawText(`Certificate no. ${data.certificateNumber}`, { x: 75, y: 115, size: 9, font: bold, color: dark });
  page.drawText(`Issued on ${dateLabel(data.issuedOn)}`, { x: 75, y: 98, size: 9, font: regular, color: muted });
  page.drawText('Verify at www.hmsi.org.ng/certificates/verify', { x: 540, y: 115, size: 9, font: bold, color: dark });
  page.drawText('Verification requires the certificate number and private verification code.', { x: 540, y: 98, size: 8, font: regular, color: muted, maxWidth: 235 });
  const disclaimer = 'The certificate records service information supplied and approved by HMSI; it is not an employment credential.';
  page.drawText(disclaimer, { x: centeredX(regular, disclaimer, 8), y: 68, size: 8, font: regular, color: muted });

  return pdf.save();
}
