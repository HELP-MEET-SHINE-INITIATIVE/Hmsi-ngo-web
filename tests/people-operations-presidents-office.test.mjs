import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, `${root}/`), 'utf8');

test('people-operations migration creates private, RLS-protected approved contacts and auditable worker review records', async () => {
  const sql = await read('supabase/people_operations_president_office_patch.sql');
  assert.match(sql, /create table if not exists public\.approved_contact_directory/i);
  assert.match(sql, /unique \(role, source_id\)/i);
  assert.match(sql, /notification_status text not null default 'ready'/i);
  assert.match(sql, /alter table public\.approved_contact_directory enable row level security/i);
  assert.match(sql, /create table if not exists public\.work_assignment_events/i);
  assert.match(sql, /alter table public\.work_assignment_events enable row level security/i);
  assert.doesNotMatch(sql, /create policy/i, 'new sensitive tables must not grant direct browser access');
});

test('approved-contact migration backfills only active approved role records and replaces only the verified status constraint', async () => {
  const sql = await read('supabase/people_operations_president_office_patch.sql');
  assert.match(sql, /from public\.volunteer_applications/i);
  assert.match(sql, /status = 'approved'/i);
  assert.match(sql, /account_status = 'active'/i);
  assert.match(sql, /from public\.workers/i);
  assert.match(sql, /from public\.hmsi_members/i);
  assert.match(sql, /removal_requested_at is null/i);
  assert.match(sql, /drop constraint if exists work_assignments_status_check/i);
  assert.doesNotMatch(sql, /pg_get_constraintdef/i, 'migration must not discover and remove an arbitrary check constraint');
  assert.match(sql, /status in \('assigned', 'in_progress', 'submitted', 'completed', 'cancelled'\)/i);
});

test('President’s Office route is administrator-only, non-cacheable, and excludes proof links from its aggregate response', async () => {
  const route = await read('app/api/admin/presidents-office/route.ts');
  const dashboard = await read('app/admin/presidents-office/PresidentOfficeDashboard.tsx');
  assert.match(route, /getAdminEmailFromCookie/);
  assert.match(route, /Administrator authentication required\./);
  assert.match(route, /approved_contact_directory/);
  assert.match(route, /Cache-Control': 'no-store'/);
  assert.doesNotMatch(route, /proof_url|google_drive_url|service_role/i);
  assert.match(dashboard, /does not expose contact information to public users/i);
  assert.match(dashboard, /\/admin\/volunteer-assignments/);
  assert.match(dashboard, /\/admin\/assignments/);
});

test('workers can submit work for review but cannot self-complete it, while administrator completion requires submitted work and a review note', async () => {
  const workerRoute = await read('app/api/worker/workspace/route.ts');
  const adminRoute = await read('app/api/admin/assignments/route.ts');
  const portal = await read('app/portal/my-tasks/PortalTasksContent.tsx');
  const manager = await read('app/admin/assignments/AssignmentsManager.tsx');
  assert.match(workerRoute, /hasSameOrigin\(request\)/);
  assert.match(workerRoute, /!\['in_progress', 'submitted'\]\.includes\(status\)/);
  assert.match(workerRoute, /status === 'submitted' && !completionNote/);
  assert.match(workerRoute, /work_assignment_events/);
  assert.match(adminRoute, /hasSameOrigin\(request\)/);
  assert.match(adminRoute, /status === 'completed' && current\.data\.status !== 'submitted'/);
  assert.match(adminRoute, /status === 'completed' \|\| status === 'cancelled'\) && !reviewNote/);
  assert.match(adminRoute, /Submitted work can only remain submitted, be approved, or be cancelled\./);
  assert.doesNotMatch(adminRoute, /status === 'submitted' \? 'revisions_requested'/);
  assert.match(portal, /Awaiting approval/);
  assert.match(manager, /Only an authorised administrator can approve a submitted job as completed\./);
  assert.match(manager, /Required administrator review note/);
});

test('approval flows synchronize notification-ready contacts only through protected administration paths', async () => {
  const contacts = await read('lib/approvedContacts.ts');
  const volunteerRoute = await read('app/api/admin/volunteers/[id]/route.ts');
  const memberRoute = await read('app/api/admin/members/route.ts');
  const workersRoute = await read('app/api/admin/workers/route.ts');
  assert.match(contacts, /toLowerCase\(\)/);
  assert.match(contacts, /approved_contact_directory/);
  assert.match(volunteerRoute, /getAdminEmailFromCookie/);
  assert.match(volunteerRoute, /hasSameOrigin\(request\)/);
  assert.match(volunteerRoute, /syncApprovedContact/);
  assert.match(volunteerRoute, /blockApprovedContact/);
  assert.match(memberRoute, /syncApprovedContact/);
  assert.match(workersRoute, /syncApprovedContact/);
});
