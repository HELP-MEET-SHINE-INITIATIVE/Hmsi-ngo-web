import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('volunteer directory is admin-only and exposes only approved active non-worker records', async () => {
  const [route, page, component] = await Promise.all([
    read('app/api/admin/volunteers/route.ts'),
    read('app/admin/volunteer-directory/page.tsx'),
    read('components/PeopleDirectory.tsx'),
  ]);
  assert.match(route, /getAdminEmailFromCookie/);
  assert.match(route, /\.eq\('status', 'approved'\)/);
  assert.match(route, /\.eq\('account_status', 'active'\)/);
  assert.match(route, /\.neq\('applicant_role', 'worker'\)/);
  assert.match(route, /removal_requested_at/);
  assert.match(page, /getAdminEmailFromCookie/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(component, /person\.email/);
  assert.match(component, /person\.location/);
});

test('member directory reuses the protected member register and has no-index metadata', async () => {
  const [route, page] = await Promise.all([
    read('app/api/admin/members/route.ts'),
    read('app/admin/member-directory/page.tsx'),
  ]);
  assert.match(route, /getAdminEmailFromCookie/);
  assert.match(route, /hmsi_members/);
  assert.match(route, /\.limit\(200\)/);
  assert.match(page, /endpoint="\/api\/admin\/members"/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});
