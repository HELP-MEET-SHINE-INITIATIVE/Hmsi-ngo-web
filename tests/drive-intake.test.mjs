import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('personal Drive intake schema keeps external links private and requires an archive reference before ingestion', async () => {
  const sql = await read('supabase/personal_drive_intake_patch.sql');
  assert.match(sql, /personal_drive_url text/);
  assert.match(sql, /external_drive_submissions_ingested_archive_check/);
  assert.match(sql, /status <> 'ingested' or \(ingested_at is not null/);
  assert.match(sql, /status <> 'link_cleared' or \(personal_drive_url is null/);
  assert.match(sql, /enable row level security/);
});

test('portal API limits submissions to signed portal identities and accepts only HTTPS Google Drive links', async () => {
  const source = await read('app/api/portal/submissions/route.ts');
  const helper = await read('lib/driveIntake.ts');
  assert.match(source, /getPortalIdentity/);
  assert.match(source, /submitter_auth_user_id/);
  assert.match(source, /eq\('submitter_auth_user_id', actor\.authUserId\)/);
  assert.match(helper, /drive\.google\.com/);
  assert.match(helper, /docs\.google\.com/);
  assert.match(helper, /url\.protocol !== 'https:'/);
});

test('admin ingestion requires server-side archive bucket and object-key confirmation before status becomes ingested', async () => {
  const source = await read('app/api/admin/intake-routing/route.ts');
  const notifications = await read('lib/hmsiNotifications.ts');
  assert.match(source, /getAdminEmailFromCookie/);
  assert.match(source, /hasSameOrigin/);
  assert.match(source, /confirm_ingest/);
  assert.match(source, /getArchiveBucket/);
  assert.match(source, /parseArchiveObjectKey/);
  assert.match(source, /archive_bucket: archiveBucket/);
  assert.match(source, /status: 'ingested'/);
  assert.match(source, /hmsiDriveFilesIngestedTemplate/);
  assert.match(source, /sender: 'admin'/);
  assert.match(notifications, /hmsiDriveFilesIngestedTemplate/);
  assert.match(notifications, /Files Ingested \/ Downloaded/);
});

test('Drive intake views use protected routes and do not present a safe-to-delete message before ingestion', async () => {
  const portalPage = await read('app/portal/submissions/page.tsx');
  const adminPage = await read('app/admin/intake-routing/page.tsx');
  const portalUi = await read('components/DriveSubmissionPortal.tsx');
  const adminUi = await read('components/DriveIntakeRouting.tsx');
  const memberWorkspace = await read('components/MemberWorkspace.tsx');
  const dashboard = await read('app/dashboard/DashboardContent.tsx');
  assert.match(portalPage, /getPortalIdentity/);
  assert.match(adminPage, /getAdminEmailFromCookie/);
  assert.match(portalUi, /status === 'ingested'/);
  assert.match(portalUi, /Safe to delete/);
  assert.match(adminUi, /Confirm download & ingest/);
  assert.match(adminUi, /AWS\/S3 archive object key/);
  assert.match(memberWorkspace, /href="\/portal\/submissions"/);
  assert.match(dashboard, /href="\/portal\/submissions"/);
});
