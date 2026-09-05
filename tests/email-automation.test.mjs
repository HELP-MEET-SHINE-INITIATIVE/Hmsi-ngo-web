import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url).pathname;
const read = (relative) => fs.readFileSync(`${root}${relative}`, 'utf8');

test('email automation migration is draft-first and service-role protected', () => {
  const sql = read('supabase/email_automation_patch.sql');
  assert.match(sql, /mode text not null default 'draft'/);
  assert.match(sql, /transactional_enabled boolean not null default false/);
  assert.match(sql, /marketing_enabled boolean not null default false/);
  assert.match(sql, /abandoned_donation_enabled boolean not null default false/);
  assert.match(sql, /recurring_donor_enabled boolean not null default false/);
  assert.match(sql, /create policy "Service role manages email outbox"/);
  assert.doesNotMatch(sql, /to anon/);
});

test('email outbox worker has no in-process timer and requires live mode', () => {
  const source = read('lib/emailAutomation.ts');
  assert.match(source, /config\.mode !== 'live'/);
  assert.match(source, /status: 'draft'/);
  assert.match(source, /status: 'suppressed'/);
  assert.doesNotMatch(source, /setInterval|node-cron/);
});

test('scheduled processor uses CRON_SECRET and safe response boundaries', () => {
  const source = read('app/api/cron/email-outbox/route.ts');
  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /Bearer \$\{secret\}/);
  assert.match(source, /Email outbox processing failed/);
  assert.doesNotMatch(source, /RESEND_API_KEY/);
});

test('newsletter signup and unsubscribe synchronize explicit consent', () => {
  const subscribe = read('app/api/newsletter/subscribe/route.ts');
  const unsubscribe = read('app/api/newsletter/unsubscribe/route.ts');
  const send = read('app/api/newsletter/route.ts');
  assert.match(subscribe, /marketing_opt_in: true/);
  assert.match(subscribe, /consent_source: 'newsletter_subscribe'/);
  assert.match(unsubscribe, /marketing_opt_in: false/);
  assert.match(unsubscribe, /email_contacts/);
  assert.match(send, /marketing_opt_in', true/);
  assert.match(send, /unsubscribed_at/);
});

test('verified donation ingestion synchronizes donor contact consent safely', () => {
  const source = read('app/api/donations/webhook/route.ts');
  assert.match(source, /from\('email_contacts'\)/);
  assert.match(source, /marketing_opt_in: marketingOptIn/);
  assert.match(source, /marketingOptIn = metadataValue\(payment, 'marketing_opt_in'\)/);
  assert.match(source, /dispatchDonationAcknowledgement/);
});

test('admin email automation endpoint requires explicit live and marketing confirmations', () => {
  const source = read('app/api/admin/email-automation/route.ts');
  assert.match(source, /ENABLE_HMSI_EMAIL_AUTOMATION/);
  assert.match(source, /ENABLE_HMSI_MARKETING_AUTOMATION/);
  assert.match(source, /getAdminEmailFromCookie/);
});
