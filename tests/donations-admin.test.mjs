import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [adminDonationsRoute, ledgerSource, adminControlSource, donationRoute, notificationSource, trackingSource, overviewRoute] = await Promise.all([
  readFile(new URL('../app/api/admin/donations/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../components/DonationsLedger.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/hmsi-control/AdminControlContent.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/donations/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/hmsiNotifications.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/donationTracking.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/admin/overview/route.ts', import.meta.url), 'utf8'),
]);

test('successful-donation listing is protected, paginated, and filters to verified payments', () => {
  assert.match(adminDonationsRoute, /getAdminEmailFromCookie/);
  assert.match(adminDonationsRoute, /manual_verification/);
  assert.match(adminDonationsRoute, /count: 'exact'/);
  assert.match(adminDonationsRoute, /\.range\(from, from \+ limit - 1\)/);
  assert.match(adminDonationsRoute, /MAX_PAGE_SIZE = 50/);
});

test('ledger displays only protected verified payments and reduces payment reference exposure', () => {
  assert.match(ledgerSource, /\/api\/admin\/donations\?page=\$\{page\}&limit=\$\{pageSize\}&status=\$\{status\}/);
  assert.match(ledgerSource, /payment_reference_suffix/);
  assert.match(ledgerSource, /Only a server-verified successful payment/);
  assert.match(adminControlSource, /<DonationsLedger \/>/);
});

test('future verified donation receipts use the official thank-you template', () => {
  assert.match(notificationSource, /export function verifiedDonationThankYouTemplate/);
  assert.match(donationRoute, /dispatchDonationAcknowledgement/);
  assert.match(trackingSource, /verifiedDonationThankYouTemplate/);
  assert.match(trackingSource, /html: acknowledgement\.html/);
  assert.match(trackingSource, /text: acknowledgement\.text/);
});

test('admin overview no longer preloads donor records before the donations view is opened', () => {
  assert.doesNotMatch(overviewRoute, /from\('donations'\)/);
});
