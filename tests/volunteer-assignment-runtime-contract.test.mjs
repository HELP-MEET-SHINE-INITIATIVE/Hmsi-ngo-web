import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, `${root}/`), 'utf8');

test('volunteer assignment migration is additive, private, retained, and RLS protected', async () => {
  const sql = await read('supabase/volunteer_assignment_workflow_patch.sql');
  assert.match(sql, /create table if not exists public\.volunteer_assignments/i);
  assert.match(sql, /create table if not exists public\.volunteer_assignment_proofs/i);
  assert.match(sql, /recovery_until timestamptz/i);
  assert.match(sql, /alter table public\.volunteer_assignments enable row level security/i);
  assert.match(sql, /Volunteer can view own active assignments/i);
  assert.match(sql, /auth_user_id = auth\.uid\(\)/i);
  assert.match(sql, /No direct policy is granted for assignment\/event\/proof inserts/i);
});

test('administrator route requires an admin session, same-origin mutation, approved active volunteer, and idempotency', async () => {
  const route = await read('app/api/admin/volunteer-assignments/route.ts');
  assert.match(route, /getAdminEmailFromCookie/);
  assert.match(route, /hasSameOrigin\(request\)/);
  assert.match(route, /status !== 'approved'/);
  assert.match(route, /account_status !== 'active'/);
  assert.match(route, /volunteer\.data\.status !== 'approved'/);
  assert.match(route, /volunteer\.data\.account_status !== 'active'/);
  assert.match(route, /activation_required/);
  assert.match(route, /idempotency_key/);
  assert.match(route, /recovery_until/);
  assert.match(route, /new Date\(now\.getTime\(\) \+ RECOVERY_WINDOW_MS\)/);
});

test('volunteer task route enforces own assignment, explicit transitions, and proof-required completion', async () => {
  const route = await read('app/api/portal/tasks/route.ts');
  assert.match(route, /identity\.role === 'volunteer'/);
  assert.match(route, /assigned_volunteer_id', identity\.profileId/);
  assert.match(route, /canVolunteerTransition/);
  assert.match(route, /assignment\.data\.proof_required/);
  assert.match(route, /volunteer_assignment_events/);
  assert.match(route, /hasSameOrigin\(request\)/);
});

test('proof submission requires volunteer session, same origin, owned in-progress task, and approved Google host', async () => {
  const route = await read('app/api/portal/volunteer-proofs/route.ts');
  const rules = await read('lib/volunteerAssignments.ts');
  assert.match(route, /identity\.role !== 'volunteer'/);
  assert.match(route, /assigned_volunteer_id', identity\.profileId/);
  assert.match(route, /status !== 'in_progress'/);
  assert.match(route, /volunteer_assignment_proofs/);
  assert.match(rules, /GOOGLE_PROOF_HOSTS/);
  assert.match(rules, /drive\.google\.com/);
  assert.match(rules, /docs\.google\.com/);
  assert.match(rules, /url\.protocol !== 'https:'/);
});

test('administrator and volunteer portal surfaces expose assignment issuance, progress, review, and private proof actions', async () => {
  const manager = await read('app/admin/volunteer-assignments/VolunteerAssignmentsManager.tsx');
  const control = await read('app/hmsi-control/AdminControlContent.tsx');
  const portal = await read('app/portal/my-tasks/PortalTasksContent.tsx');
  assert.match(manager, /Issue a volunteer assignment/);
  assert.match(manager, /proof_count/);
  assert.match(manager, /approve_completion/);
  assert.match(manager, /request_revisions/);
  assert.match(control, /Volunteer Assignments/);
  assert.match(control, /\/admin\/volunteer-assignments/);
  assert.match(portal, /\/api\/portal\/volunteer-proofs/);
  assert.match(portal, /Submit proof for review/);
  assert.match(portal, /HMSI review:/);
});
