import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface DonorReceiptData {
  donationId: string;
  donorName: string;
  donorEmail: string;
  isAnonymous: boolean;
  amountNgn: number;
  currency: string;
  paystackReference: string;
  channel?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  fundraiserTitle?: string | null;
}

function formatNaira(amount: number) {
  return `NGN ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }) + ' WAT';
}

function safeReceiptNumber(data: DonorReceiptData) {
  const suffix = data.donationId.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase();
  return `HMSI-${suffix || data.paystackReference.slice(-10).toUpperCase()}`;
}

export async function createDonorReceiptPdf(data: DonorReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.118, 0.357, 0.286);
  const dark = rgb(0.09, 0.13, 0.118);
  const muted = rgb(0.40, 0.45, 0.42);
  const gold = rgb(0.882, 0.678, 0.271);
  const pale = rgb(0.965, 0.957, 0.937);

  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: pale });
  page.drawRectangle({ x: 0, y: 760, width: 595.28, height: 81.89, color: dark });
  page.drawRectangle({ x: 42, y: 715, width: 511, height: 3, color: gold });

  page.drawText('HELP-MEET SHINE INITIATIVE', { x: 42, y: 802, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Verified donation acknowledgement', { x: 42, y: 780, size: 10, font: regular, color: rgb(0.78, 0.82, 0.79) });
  page.drawText('DONATION RECEIPT', { x: 42, y: 678, size: 25, font: bold, color: green });
  page.drawText(`Receipt no. ${safeReceiptNumber(data)}`, { x: 42, y: 656, size: 10, font: regular, color: muted });

  const rows: Array<[string, string]> = [
    ['Donor', data.isAnonymous ? 'Anonymous donor' : data.donorName],
    ['Donation amount', formatNaira(data.amountNgn)],
    ['Payment status', 'Verified successful'],
    ['Paystack reference', data.paystackReference],
    ['Payment channel', data.channel || 'Paystack'],
    ['Paid at', formatDate(data.paidAt || data.createdAt)],
  ];
  if (data.fundraiserTitle) rows.splice(1, 0, ['Fundraising page', data.fundraiserTitle]);

  let y = 600;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: 42, y, size: 8, font: bold, color: muted });
    page.drawText(value, { x: 205, y, size: 10.5, font: regular, color: dark, maxWidth: 345 });
    page.drawLine({ start: { x: 42, y: y - 13 }, end: { x: 553, y: y - 13 }, thickness: 0.6, color: rgb(0.84, 0.83, 0.79) });
    y -= 42;
  }

  page.drawRectangle({ x: 42, y: 280, width: 511, height: 116, color: rgb(0.91, 0.945, 0.91) });
  page.drawText('Thank you for supporting HMSI’s work.', { x: 62, y: 365, size: 14, font: bold, color: green });
  page.drawText('This acknowledgement confirms that the payment above was verified through Paystack', { x: 62, y: 340, size: 9.5, font: regular, color: dark });
  page.drawText('and recorded in the HMSI donation ledger. It is not a tax-exemption certificate or a', { x: 62, y: 324, size: 9.5, font: regular, color: dark });
  page.drawText('statement that the donation is tax-deductible. Consult the applicable authority for tax advice.', { x: 62, y: 308, size: 9.5, font: regular, color: dark });

  page.drawText('Privacy note', { x: 42, y: 228, size: 9, font: bold, color: green });
  page.drawText('HMSI does not publish donor contact details. Anonymous gifts are labelled “Anonymous donor”', { x: 42, y: 210, size: 9, font: regular, color: muted });
  page.drawText('in the internal ledger while the receipt is sent only to the payment email supplied by the donor.', { x: 42, y: 195, size: 9, font: regular, color: muted });

  page.drawText('Help Meet Shine Initiative · CAC/IT/NO 125103', { x: 42, y: 88, size: 8.5, font: bold, color: dark });
  page.drawText('For receipt questions, contact contact@hmsi.org.ng', { x: 42, y: 72, size: 8.5, font: regular, color: muted });
  page.drawText('Generated automatically after verified Paystack payment', { x: 42, y: 56, size: 8, font: regular, color: muted });

  return pdf.save();
}
