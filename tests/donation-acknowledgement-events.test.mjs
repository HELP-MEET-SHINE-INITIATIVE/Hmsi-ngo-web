import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [helper, webhook, donationRoute, trackingSource, adminRoute, ledger] = await Promise.all([
  readFile(new URL('../lib/donationAcknowledgements.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/webhooks/resend/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/donations/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/donationTracking.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/admin/donations/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../components/DonationsLedger.tsx', import.meta.url), 'utf8'),
]);

test('acknowledgement audit event helper preserves idempotency and event ordering', () => {
  assert.match(helper, /provider_event_id: input\.providerEventId \|\| null/);
  assert.match(helper, /eventInsert\.error\?\.code === '23505'/);
  assert.match(helper, /nextTime < currentTime/);
  assert.match(helper, /acknowledgement_updated_at: occurredAt/);
});

test('Resend webhook verifies the raw body and Svix signature before any database operation', () => {
  assert.match(webhook, /import \{ Webhook \} from 'svix'/);
  assert.match(webhook, /const rawPayload = await request\.text\(\)/);
  assert.match(webhook, /new Webhook\(webhookSecret\)\.verify\(rawPayload, headers\)/);
  assert.match(webhook, /'svix-id'/);
  assert.match(webhook, /return NextResponse\.json\(\{ error: 'Invalid webhook signature\.'/);
});

test('verified donation dispatch records queued, sent, and failed acknowledgement states without blocking the ledger', () => {
  assert.match(donationRoute, /dispatchDonationAcknowledgement/);
  assert.match(trackingSource, /eventType: 'queued'/);
  assert.match(trackingSource, /eventType: 'sent'/);
  assert.match(trackingSource, /eventType: 'failed'/);
  assert.match(trackingSource, /providerMessageId: result\.resendId \|\| null/);
});

test('protected donations ledger exposes acknowledgement status but not full payment references', () => {
  assert.match(adminRoute, /acknowledgement_status,acknowledgement_updated_at/);
  assert.match(ledger, /Acknowledgement/);
  assert.match(ledger, /acknowledgementLabel/);
  assert.match(ledger, /payment_reference_suffix/);
});
