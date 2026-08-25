import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('launch seed is administrator-controlled and does not fabricate campaign progress or donor activity', async () => {
  const seed = await read('lib/launchSeed.ts');
  const route = await read('app/api/admin/launch/seed/route.ts');
  for (const token of ['Emergency Field Response & Community Outreach 2026', 'targetAmount: 500_000', 'Ground Inspection Report: Local Infrastructure Assessment', 'Community Relief Dispatch', 'HMSI Field Operations']) assert.ok(seed.includes(token), `Expected launch seed definition for ${token}.`);
  for (const token of ['getAdminEmailFromCookie', "raised_amount: 0", "status: 'active'", "status: 'published'", 'Campaign progress remains at ₦0']) assert.ok(route.includes(token), `Expected guarded seed behavior for ${token}.`);
});

test('public launch widgets use supported donation routing, verified-only supporter updates, and role-limited contributor pathways', async () => {
  const home = await read('app/page.tsx');
  const donation = await read('components/MicroDonationFastTrack.tsx');
  const supporters = await read('components/RecentSupportersTicker.tsx');
  const publicSupporters = await read('app/api/public/supporters/route.ts');
  const recruitment = await read('components/VolunteerPublisherBanner.tsx');
  for (const token of ['MicroDonationFastTrack', 'RecentSupportersTicker', 'VolunteerPublisherBanner', 'LAUNCH_CAMPAIGN_ID']) assert.ok(home.includes(token), `Expected homepage launch hook for ${token}.`);
  for (const token of ['const amounts = [500, 1000, 5000]', 'Give ₦{amount.toLocaleString()}', 'Custom amount', '/donate?fundraiser_id=']) assert.ok(donation.includes(token), `Expected fast-track donation control for ${token}.`);
  for (const token of ['status', "'success'", 'No donor names or payment amounts displayed']) assert.ok(`${supporters}\n${publicSupporters}`.includes(token), `Expected verified-only supporter safeguard for ${token}.`);
  for (const token of ['Independent publisher', 'Contributor approval does not grant direct publication rights', 'Independent%20Field%20Reporter']) assert.ok(recruitment.includes(token), `Expected recruitment boundary for ${token}.`);
});

test('templates and system check remain administrator-only and do not expose secrets or imply external webhook verification', async () => {
  const templates = await read('app/admin/templates/page.tsx');
  const templateContent = await read('components/LaunchTemplatesContent.tsx');
  const templateDefinitions = await read('lib/launchTemplates.ts');
  const checkRoute = await read('app/api/admin/system-check/route.ts');
  const checkPage = await read('app/admin/system-check/page.tsx');
  for (const token of ['getAdminEmailFromCookie', "redirect('/hmsi-control')"]) assert.ok(templates.includes(token) && checkPage.includes(token), `Expected protected administrative route token ${token}.`);
  for (const token of ['Welcome & Task Dashboard Walkthrough', 'Personal Google Drive Submission Guide', 'Call for Independent Publishers & Activists']) assert.ok(templateDefinitions.includes(token), `Expected template definition for ${token}.`);
  assert.ok(templateContent.includes('/api/admin/launch/seed'), 'Expected protected launch-seed control.');
  for (const token of ['RESEND_API_KEY', 'PAYSTACK_SECRET_KEY', 'This endpoint verifies local configuration only', 'donation_ingestion_events']) assert.ok(checkRoute.includes(token), `Expected bounded diagnostic safeguard for ${token}.`);
  assert.ok(!checkRoute.includes('process.env.RESEND_API_KEY?.trim() ??'), 'System check must not return a credential.');
});
