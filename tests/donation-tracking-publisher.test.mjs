import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [trackingMigration, webhook, manualRecord, trackingHelper, adminLedger, ledgerUi, acknowledgementAction, publisherMigration, portalAuth, publisherApi, publisherUi, donationAlias] = await Promise.all([
  readFile(new URL('../supabase/donation_tracking_patch.sql', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/donations/webhook/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/admin/donations/record/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/donationTracking.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/admin/donations/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../components/DonationsLedger.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/admin/donations/[id]/acknowledgement/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/volunteer_publisher_roles_patch.sql', import.meta.url), 'utf8'),
  readFile(new URL('../lib/portalAuth.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/portal/news-submissions/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../components/NewsSubmissionPortal.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/donations/record/route.ts', import.meta.url), 'utf8'),
]);

test('donation tracking migration is additive and keeps manual records verification-pending', () => {
  assert.match(trackingMigration, /add column if not exists donor_phone/);
  assert.match(trackingMigration, /payment_provider in \('paystack', 'flutterwave', 'stripe', 'manual'\)/);
  assert.match(trackingMigration, /'manual_verification'/);
  assert.match(trackingMigration, /create table if not exists public\.donation_ingestion_events/);
  assert.match(trackingMigration, /provider_event_id varchar\(180\) not null unique/);
  assert.doesNotMatch(trackingMigration, /drop table/i);
});

test('Paystack receiver verifies raw signed events and never trusts an unsigned client payment status', () => {
  assert.match(webhook, /const raw = await request\.text\(\)/);
  assert.match(webhook, /createHmac\('sha512', secret\)/);
  assert.match(webhook, /x-paystack-signature/);
  assert.match(webhook, /payload\.event !== 'charge\.success' \|\| payload\.data\?\.status !== 'success'/);
  assert.match(webhook, /providerEventId = `paystack:\$\{createHash/);
  assert.match(webhook, /status: 400/);
  assert.match(webhook, /dispatchDonationAcknowledgement/);
});

test('manual donation path is admin-only, same-origin guarded, and requires a separate verification action', () => {
  assert.match(manualRecord, /Admin authentication required/);
  assert.match(manualRecord, /Cross-site manual donation intake is not allowed/);
  assert.match(manualRecord, /status: 'manual_verification'/);
  assert.match(manualRecord, /body\.action !== 'verify_manual'/);
  assert.match(manualRecord, /status: 'success'/);
  assert.match(manualRecord, /dispatchDonationAcknowledgement/);
  assert.match(donationAlias, /export \{ POST, PATCH \}/);
});

test('tracked acknowledgement dispatch uses the official sender, a dynamic reference subject, and a receipt attachment', () => {
  assert.match(trackingHelper, /HMSI_SENDERS\.admin/);
  assert.match(trackingHelper, /Thank You for Supporting Help Meet Shine Initiative/);
  assert.match(trackingHelper, /HMSI-donation-receipt/);
  assert.match(trackingHelper, /eventType: 'queued'/);
  assert.match(trackingHelper, /eventType: 'sent'/);
  assert.match(trackingHelper, /eventType: 'failed'/);
});

test('protected ledger exposes status-aware records, bounded refresh, receipt details, and guarded acknowledgement resend', () => {
  assert.match(adminLedger, /manual_verification/);
  assert.match(adminLedger, /payment_provider,payment_method,campaign_name_snapshot/);
  assert.match(ledgerUi, /setInterval\(\(\) => \{ void load\(true\); \}, 20000\)/);
  assert.match(ledgerUi, /Record manual donation/);
  assert.match(ledgerUi, /Receipt and processing details/);
  assert.match(acknowledgementAction, /Wait 15 minutes before resending this acknowledgement/);
});

test('publisher role migration and portal API permit submission only for approved publisher volunteers and force editorial review', () => {
  assert.match(publisherMigration, /community_publisher/);
  assert.match(publisherMigration, /humanitarian_activist/);
  assert.match(publisherMigration, /independent_field_reporter/);
  assert.match(portalAuth, /publisherRole/);
  assert.match(portalAuth, /publisher_role/);
  assert.match(publisherApi, /identity\.role !== 'volunteer'/);
  assert.match(publisherApi, /pending_admin_approval/);
  assert.match(publisherApi, /author_role: 'volunteer'/);
  assert.doesNotMatch(publisherApi, /status:\s*'published'/);
  assert.match(publisherUi, /never publishes a story directly to the public HMSI feed/);
});
