import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [adminDonationsRoute, ledgerSource, adminControlSource, donationRoute, notificationSource, overviewRoute] = await Promise.all([
  readFile(new URL('../app/api/admin/donations/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../components/DonationsLedger.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/hmsi-control/AdminControlContent.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/donations/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/hmsiNotifications.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/admin/overview/route.ts', import.meta.url), 'utf8'),
]);

test('successful-donation listing is protected, paginated, and filters to verified payments', () => {
  assert.match(adminDonationsRoute, /getAdminEmailFromCookie/);
  assert.match(adminDonationsRoute, /\.eq\('status', 'success'\)/);
  assert.match(adminDonationsRoute, /count: 'exact'/);
  assert.match(adminDonationsRoute, /\.range\(from, from \+ limit - 1\)/);
  assert.match(adminDonationsRoute, /MAX_PAGE_SIZE = 50/);
});

test('ledger displays only protected verified payments and reduces payment reference exposure', () => {
  assert.match(ledgerSource, /\/api\/admin\/donations\?page=\$\{page\}&limit=\$\{pageSize\}/);
  assert.match(ledgerSource, /payment_reference_suffix/);
  assert.match(ledgerSource, /Only successful Paystack payments appear here/);
  assert.match(adminControlSource, /<DonationsLedger \/>/);
});

test('future verified donation receipts use the official thank-you template', () => {
  assert.match(notificationSource, /export function verifiedDonationThankYouTemplate/);
  assert.match(donationRoute, /verifiedDonationThankYouTemplate/);
  assert.match(donationRoute, /html: acknowledgement\.html/);
  assert.match(donationRoute, /text: acknowledgement\.text/);
});

test('admin overview no longer preloads donor records before the donations view is opened', () => {
  assert.doesNotMatch(overviewRoute, /from\('donations'\)/);
});

