import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, `${root}/`), 'utf8');

test('cross-role migration stores location additively and reserves one normalized email without browser policies', async () => {
  const sql = await read('supabase/cross_role_location_duplicate_application_patch.sql');
  for (const table of ['volunteer_applications', 'workers', 'hmsi_member_applications', 'hmsi_members']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} add column if not exists location`, 'i'));
  }
  assert.match(sql, /create table if not exists public\.application_email_registry/i);
  assert.match(sql, /email varchar\(320\) not null unique check \(email = lower\(email\)\)/i);
  assert.match(sql, /alter table public\.application_email_registry enable row level security/i);
  assert.doesNotMatch(sql, /create policy/i);
  assert.match(sql, /on conflict \(email\) do nothing/i);
});

test('worker, volunteer, and member public applications require location and reject duplicate email reservations before inserting records', async () => {
  const volunteerForm = await read('app/volunteer/VolunteerForm.tsx');
  const memberForm = await read('app/member-apply/page.tsx');
  const signupForm = await read('app/signup/SignupContent.tsx');
  const volunteerRoute = await read('app/api/volunteer/route.ts');
  const memberRoute = await read('app/api/members/apply/route.ts');
  assert.match(volunteerForm, /volunteer-location/);
  assert.match(memberForm, /Location \(City, State \/ Province, Country\)/);
  assert.match(signupForm, /Volunteer application/);
  assert.match(signupForm, /location: location\.trim\(\)/);
  assert.doesNotMatch(signupForm, /useAuth\(|\.signup\(/);
  assert.match(volunteerRoute, /reserveApplicationEmail/);
  assert.match(volunteerRoute, /DUPLICATE_APPLICATION_MESSAGE/);
  assert.match(volunteerRoute, /location/);
  assert.match(memberRoute, /reserveApplicationEmail/);
  assert.match(memberRoute, /DUPLICATE_APPLICATION_MESSAGE/);
  assert.match(memberRoute, /location/);
});

test('approved cross-role directories retain location only in authorized administration responses', async () => {
  const presidentRoute = await read('app/api/admin/presidents-office/route.ts');
  const presidentDashboard = await read('app/admin/presidents-office/PresidentOfficeDashboard.tsx');
  const volunteerRoute = await read('app/api/admin/volunteer-assignments/route.ts');
  const workerRoute = await read('app/api/admin/assignments/route.ts');
  assert.match(presidentRoute, /getAdminEmailFromCookie/);
  assert.match(presidentRoute, /phone,location,interest/);
  assert.match(presidentDashboard, /person\.location \|\| 'Location pending'/);
  assert.match(volunteerRoute, /phone,location,interest/);
  assert.match(workerRoute, /phone,location,status,onboarding_status,auth_user_id/);
});

test('approved active volunteers and workers may be assigned before portal activation without an unusable notification', async () => {
  const volunteerRoute = await read('app/api/admin/volunteer-assignments/route.ts');
  const workerRoute = await read('app/api/admin/assignments/route.ts');
  const volunteerUi = await read('app/admin/volunteer-assignments/VolunteerAssignmentsManager.tsx');
  const workerUi = await read('app/admin/assignments/AssignmentsManager.tsx');
  assert.match(volunteerRoute, /activation_required/);
  assert.match(volunteerRoute, /if \(volunteer\.data\.auth_user_id\)/);
  assert.match(workerRoute, /worker\.data\.onboarding_status !== 'completed'/);
  assert.match(workerRoute, /notification_status: 'not_sent'/);
  assert.match(volunteerUi, /activation pending/);
  assert.match(workerUi, /activation pending/);
});
