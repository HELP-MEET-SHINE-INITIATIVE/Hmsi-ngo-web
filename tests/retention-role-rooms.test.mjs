import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const schema = read('supabase/retention_role_rooms_patch.sql');
const removal = read('app/api/admin/directory/[id]/remove/route.ts');
const generalRemoval = read('app/api/admin/users/[subjectType]/[id]/remove/route.ts');
const workers = read('app/api/admin/workers/route.ts');
const archiveApi = read('app/api/admin/application-archives/route.ts');
const archiveUi = read('components/ApplicationArchiveManager.tsx');
const cleanup = read('app/api/cron/retention-cleanup/route.ts');
const vercel = read('vercel.json');
const refresh = read('app/api/portal/auth/refresh/route.ts');
const portalAuth = read('lib/portalAuth.ts');
const authContext = read('lib/auth.tsx');
const roomApi = read('app/api/portal/rooms/[role]/route.ts');
const roleRoom = read('components/RoleRoom.tsx');

test('retention schema records recovery and archive state without adding immediate-delete defaults', () => {
  assert.match(schema, /removal_purge_after timestamptz/);
  assert.match(schema, /create table if not exists public\.archived_applications/);
  assert.match(schema, /create table if not exists public\.user_removal_records/);
  assert.match(schema, /recovery_until timestamptz not null/);
  assert.match(schema, /create table if not exists public\.role_room_messages/);
});

test('worker removal is admin-only, same-origin, explicitly confirmed, and starts a 30-day recovery period', () => {
  assert.match(removal, /getAdminEmailFromCookie/);
  assert.match(removal, /hasSameOrigin/);
  assert.match(removal, /confirmation !== 'REMOVE_30_DAYS'/);
  assert.match(removal, /30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(removal, /status: 'inactive'/);
  assert.match(removal, /from\('user_removal_records'\)/);
  assert.doesNotMatch(removal, /auth\.admin\.deleteUser/);
});

test('approved volunteer and member removal uses the same explicit 30-day recovery controls', () => {
  assert.match(generalRemoval, /getAdminEmailFromCookie/);
  assert.match(generalRemoval, /hasSameOrigin/);
  assert.match(generalRemoval, /subjectType !== 'volunteer' && subjectType !== 'member'/);
  assert.match(generalRemoval, /confirmation !== 'REMOVE_30_DAYS'/);
  assert.match(generalRemoval, /account_status: 'banned'/);
  assert.match(generalRemoval, /status: 'inactive'/);
  assert.match(generalRemoval, /from\('user_removal_records'\)/);
});

test('active worker directory excludes records under removal recovery', () => {
  assert.match(workers, /eq\('status', 'active'\)/);
  assert.match(workers, /is\('removal_requested_at', null\)/);
});

test('application inbox returns only pending records and archives are administrator-only', () => {
  assert.match(archiveApi, /getAdminEmailFromCookie/);
  assert.match(archiveApi, /eq\('status', 'pending'\)/);
  assert.match(archiveApi, /view === 'archives'/);
  assert.match(archiveApi, /from\('archived_applications'\)/);
  assert.match(archiveUi, /Pending inbox/);
  assert.match(archiveUi, /View archives/);
});

test('daily retention job is protected, archives approvals, schedules rejected purges for 30 days, and deletes workers only after recovery', () => {
  assert.match(cleanup, /CRON_SECRET/);
  assert.match(cleanup, /30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(cleanup, /status_at_archive: 'approved'/);
  assert.match(cleanup, /status_at_archive: 'rejected'/);
  assert.match(cleanup, /lte\('removal_purge_after', nowIso\)/);
  assert.match(cleanup, /auth\.admin\.deleteUser/);
  assert.match(vercel, /"path": "\/api\/cron\/retention-cleanup"/);
  assert.match(vercel, /"schedule": "30 2 \* \* \*"/);
});

test('session refresh rotates tokens server-side and never returns access or refresh tokens to browser code', () => {
  assert.match(portalAuth, /refreshPortalSession/);
  assert.match(portalAuth, /client\.auth\.setSession/);
  assert.match(refresh, /attachPortalSession/);
  assert.doesNotMatch(refresh, /NextResponse\.json\(\{[^}]*accessToken/);
  assert.doesNotMatch(refresh, /NextResponse\.json\(\{[^}]*refreshToken/);
  assert.match(authContext, /\/api\/portal\/auth\/refresh/);
  assert.match(authContext, /30 \* 60 \* 1000/);
});

test('role rooms require a matching active portal identity and use role-scoped persistent messages', () => {
  assert.match(roomApi, /getPortalIdentity/);
  assert.match(roomApi, /identity\.role !== rawRole/);
  assert.match(roomApi, /from\('role_room_messages'\)/);
  assert.match(roomApi, /author_auth_user_id: access\.identity\.authUserId/);
  assert.match(roleRoom, /Worker Operations & Daily Activities/);
  assert.match(roleRoom, /Volunteer Community Room/);
  assert.match(roleRoom, /HMSI Member Lounge/);
  assert.match(roleRoom, /15_000/);
});
