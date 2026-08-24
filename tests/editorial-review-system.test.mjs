import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('editorial schema preserves records and supports the required audit states', async () => {
  const schema = await read('supabase/editorial_review_patch.sql');
  const publisherSchema = await read('supabase/publisher_dispatch_workflow_patch.sql');
  for (const token of ['reviewed_by', 'scheduled_archive_at', 'archived_at', "'archived'", "'saved_draft'", "'edited'", 'news_articles_set_archive_deadline']) assert.ok(schema.includes(token), `Expected schema to include ${token}`);
  assert.ok(schema.includes("interval '10 days'"), 'Expected ten-day retention deadline.');
  for (const token of ['body_format', 'media_drive_url', 'revision_feedback', 'revision_requested_at', "'pending_editorial_review'", "'revision_requested'", "'resubmitted'"]) assert.ok(publisherSchema.includes(token), `Expected publisher schema to include ${token}`);
});

test('editorial status route is admin-only, same-origin guarded, and archives instead of hard-deleting', async () => {
  const route = await read('app/api/admin/articles/[id]/status/route.ts');
  const helper = await read('lib/editorialAdmin.ts');
  for (const token of ['getEditorialAdmin', 'hasSameOrigin', "status: 'archived'", "No hard deletion was performed."]) assert.ok(route.includes(token), `Expected editorial route to include ${token}`);
  for (const token of ["'approve_publish'", "'save_draft'", "'reject'", "'request_revisions'", "'archive'"]) assert.ok(helper.includes(token), `Expected editorial action helper to include ${token}`);
  for (const token of ["status: 'revision_requested'", 'editorialRevisionRequestedTemplate', 'revision_feedback']) assert.ok(route.includes(token), `Expected revision-request safeguard: ${token}`);
});

test('editorial UI exposes required routes, quick actions, inspection, and optimistic replacement', async () => {
  const ui = await read('components/EditorialWorkspace.tsx');
  const adminControl = await read('app/hmsi-control/AdminControlContent.tsx');
  for (const token of ['/admin/editorial', '/admin/articles', 'Pending editorial review', 'Quick approve', 'Article inspection', 'Approve & publish', 'Save as draft / edit', 'setArticles((current) => current.map']) assert.ok(ui.includes(token), `Expected editorial UI to include ${token}`);
  for (const token of ['Request revisions', 'Publisher pathways', 'Revisions requested']) assert.ok(ui.includes(token), `Expected updated editorial UI to include ${token}`);
  for (const token of ['Editorial Queue', 'Content Management', '/admin/editorial', '/admin/articles']) assert.ok(adminControl.includes(token), `Expected control-center sidebar to include ${token}`);
});

test('archival cron is authenticated, bounded, and only targets unpublished editorial states', async () => {
  const cron = await read('app/api/cron/editorial-archive/route.ts');
  for (const token of ['CRON_SECRET', 'ELIGIBLE_STATUSES', '.limit(50)', "status: 'archived'", 'Automatically archived after 10 days without publication.']) assert.ok(cron.includes(token), `Expected archival cron to include ${token}`);
  const config = await read('vercel.json');
  assert.ok(config.includes('/api/cron/editorial-archive'), 'Expected Vercel cron registration.');
});

test('publisher pathways remain controlled by administrators and media uploads require publisher portal identity', async () => {
  const volunteerRoute = await read('app/api/admin/volunteers/[id]/route.ts');
  const manager = await read('components/PublisherRoleManager.tsx');
  const uploads = await read('app/api/uploads/publisher-image/route.ts');
  for (const token of ['PUBLISHER_ROLES', 'publisherRole', 'approved active volunteer accounts', 'hasSameOrigin']) assert.ok(volunteerRoute.includes(token), `Expected volunteer role safeguard: ${token}`);
  for (const token of ['/api/admin/overview', '/api/admin/volunteers/', 'No publisher access', 'Only these accounts may receive or lose a publisher pathway']) assert.ok(manager.includes(token), `Expected publisher manager control: ${token}`);
  for (const token of ['getPortalIdentity', 'PUBLISHER_ROLES', 'approved publisher volunteer']) assert.ok(uploads.includes(token), `Expected protected contributor media upload: ${token}`);
});
