import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function createHmsiSchoolCertificatePdf(input: { certificateNumber: string; holderName: string; certificateTitle: string; issuedOn: string }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.12, 0.36, 0.29);
  const gold = rgb(0.88, 0.68, 0.27);
  page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderWidth: 3, borderColor: green });
  page.drawRectangle({ x: 36, y: 36, width: 770, height: 523, borderWidth: 1, borderColor: gold });
  page.drawText('HELP MEET SHINE INITIATIVE (HMSI)', { x: 170, y: 500, size: 20, font: bold, color: green });
  page.drawText('Human Rights & Humanitarian Service School', { x: 198, y: 463, size: 17, font: bold, color: gold });
  page.drawText('CERTIFICATE OF COMPLETION', { x: 228, y: 393, size: 27, font: bold, color: green });
  page.drawText('This certificate records that', { x: 306, y: 345, size: 13, font: regular, color: rgb(0.25, 0.29, 0.27) });
  page.drawText(input.holderName, { x: 421 - regular.widthOfTextAtSize(input.holderName, 27) / 2, y: 300, size: 27, font: bold, color: rgb(0.09, 0.13, 0.11) });
  page.drawText('has successfully completed the HMSI learning pathway', { x: 244, y: 255, size: 13, font: regular, color: rgb(0.25, 0.29, 0.27) });
  page.drawText(input.certificateTitle, { x: 421 - bold.widthOfTextAtSize(input.certificateTitle, 19) / 2, y: 215, size: 19, font: bold, color: green });
  page.drawText(`Issued on ${input.issuedOn}  |  Certificate no. ${input.certificateNumber}`, { x: 206, y: 145, size: 11, font: regular, color: rgb(0.25, 0.29, 0.27) });
  page.drawText('HMSI completion credential — not a government identity document, professional licence, legal-practice certificate,', { x: 142, y: 92, size: 9, font: regular, color: rgb(0.32, 0.35, 0.33) });
  page.drawText('university award, or proof of external accreditation. Verify with the certificate number and private code.', { x: 186, y: 76, size: 9, font: regular, color: rgb(0.32, 0.35, 0.33) });
  return pdf.save();
}
