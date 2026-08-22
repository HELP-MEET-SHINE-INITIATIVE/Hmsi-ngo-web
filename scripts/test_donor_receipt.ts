import { createDonorReceiptPdf } from '../lib/donorReceipt';

async function main() {
  const pdf = await createDonorReceiptPdf({
    donationId: '11111111-2222-3333-4444-555555555555',
    donorName: 'Anonymous donor',
    donorEmail: 'supporter@example.org',
    isAnonymous: true,
    amountNgn: 25000,
    currency: 'NGN',
    paystackReference: 'ref_test_20260822',
    channel: 'card',
    paidAt: '2026-08-22T09:00:00.000Z',
    createdAt: '2026-08-22T09:00:00.000Z',
  });

  if (pdf.length < 1000) throw new Error(`Receipt PDF is unexpectedly small: ${pdf.length} bytes`);
  const header = Buffer.from(pdf.slice(0, 5)).toString('ascii');
  if (header !== '%PDF-') throw new Error(`Invalid PDF header: ${header}`);

  const output = '/tmp/hmsi-donor-receipt-test.pdf';
  await import('node:fs/promises').then((fs) => fs.writeFile(output, pdf));
  console.log(`✓ Donor receipt PDF generated: ${pdf.length} bytes`);
  console.log(`✓ PDF header verified: ${header}`);
  console.log(`✓ Test artifact written to ${output}`);
}

main().catch((error) => {
  console.error('Donor receipt test failed:', error);
  process.exit(1);
});
