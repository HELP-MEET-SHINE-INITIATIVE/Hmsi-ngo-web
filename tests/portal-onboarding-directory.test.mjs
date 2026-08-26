import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const onboardingApi = read('app/api/onboarding/route.ts');
const passwordApi = read('app/api/onboarding/password/route.ts');
const setupApi = read('app/api/setup-password/route.ts');
const setupUi = read('app/setup-password/page.tsx');
const setupHelper = read('lib/passwordSetup.ts');
const notifications = read('lib/hmsiNotifications.ts');
const loginApi = read('app/api/portal/auth/login/route.ts');
const portalAuth = read('lib/portalAuth.ts');
const portalTasksApi = read('app/api/portal/tasks/route.ts');
const portalEntry = read('app/portal/page.tsx');
const workerPortal = read('app/portal/worker/page.tsx');
const volunteerPortal = read('app/portal/volunteer/page.tsx');
const memberPortal = read('app/portal/member/page.tsx');
const roleRoom = read('components/RoleRoom.tsx');
const directoryApi = read('app/api/admin/directory/[id]/route.ts');
const resetApi = read('app/api/admin/directory/[id]/reset/route.ts');
const onboardingUi = read('app/onboarding/OnboardingContent.tsx');
const loginUi = read('app/login/LoginContent.tsx');
const clientAuth = read('lib/auth.tsx');
const directoryUi = read('components/WorkerDirectory.tsx');
const recoveryApi = read('app/api/portal/auth/recover/route.ts');
const portalTasksUi = read('app/portal/my-tasks/PortalTasksContent.tsx');
const submissionsUi = read('components/DriveSubmissionPortal.tsx');
const adminAssignmentsApi = read('app/api/admin/assignments/route.ts');
const adminAssignmentsUi = read('app/admin/assignments/AssignmentsManager.tsx');
const adminControlUi = read('app/hmsi-control/AdminControlContent.tsx');

test('onboarding completion issues an HMSI ID and dispatches a hashed, expiring one-time setup link without attaching a legacy worker session', () => {
  assert.match(onboardingApi, /ensureHmsiId/);
  assert.match(onboardingApi, /event_type: 'hmsi_id_issued'/);
  assert.match(onboardingApi, /password_setup_links/);
  assert.match(onboardingApi, /hashPasswordSetupToken/);
  assert.match(onboardingApi, /passwordSetupTemplate/);
  assert.match(onboardingApi, /sendHmsiNotification/);
  assert.match(onboardingApi, /hmsiId/);
  assert.doesNotMatch(onboardingApi, /attachWorkerSession/);
});

test('one-time setup requires matching passwords, validates the hashed link and ID, consumes it once, and issues the existing secure portal session', () => {
  assert.match(setupApi, /hashPasswordSetupToken/);
  assert.match(setupApi, /setup_completed_at/);
  assert.match(setupApi, /password !== confirmPassword/);
  assert.match(setupApi, /auth\.admin\.createUser/);
  assert.match(setupApi, /attachPortalSession/);
  assert.match(setupApi, /redirectTo: '\/portal'/);
  assert.match(setupUi, /HMSI ID/);
  assert.match(setupUi, /Save password & launch workspace/);
  assert.match(setupHelper, /randomBytes\(32\)/);
  assert.match(setupHelper, /PASSWORD_SETUP_LINK_DAYS = 7/);
  assert.match(notifications, /Your HMSI ID and password setup link/);
  assert.match(notifications, /one-time link expires in 7 days/i);
  assert.match(passwordApi, /auth\.admin\.createUser/);
});

test('portal login resolves HMSI ID server-side and preserves generic credential failures', () => {
  assert.match(loginApi, /resolvePortalEmail\(identifier\)/);
  assert.match(loginApi, /Invalid portal credentials\./);
  assert.doesNotMatch(loginApi, /Worker not found|ID card could not be verified/);
  assert.match(portalAuth, /\^HMSI-\[WVM\]-\\d\{4\}-\[A-F0-9\]\{8\}\$/);
});

test('portal login uses the deployed publishable-key name and distinguishes temporary service failure from credential denial', () => {
  assert.match(portalAuth, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(clientAuth, /response\.json\(\)\.catch/);
  assert.match(clientAuth, /Portal sign-in is temporarily unavailable\./);
  assert.match(loginUi, /'error' in result/);
  assert.match(loginUi, /setError\(result\.error\)/);
});

test('the onboarding completion screen directs users to their registered email instead of exposing an inline password field', () => {
  assert.match(onboardingUi, /100% Onboarding Complete/);
  assert.match(onboardingUi, /Check your email/);
  assert.match(onboardingUi, /one-time password activation link/);
  assert.doesNotMatch(onboardingUi, /Create password & access portal/);
});

test('the login UI accepts email or HMSI ID and routes authenticated identities into the unified task portal', () => {
  assert.match(loginUi, /Email address or HMSI ID/);
  assert.match(loginUi, /HMSI-W-2026-XXXXXXXX/);
  assert.match(loginUi, /router\.replace\('\/portal'\)/);
});

test('the portal dispatches active roles into protected role-specific workspaces and preserves a matching room entry', () => {
  assert.match(portalEntry, /worker: '\/portal\/worker'/);
  assert.match(portalEntry, /volunteer: '\/portal\/volunteer'/);
  assert.match(portalEntry, /member: '\/portal\/member'/);
  assert.match(workerPortal, /identity\.role !== 'worker'/);
  assert.match(volunteerPortal, /identity\.role !== 'volunteer'/);
  assert.match(memberPortal, /identity\.role !== 'member'/);
  assert.match(roleRoom, /href="\/portal"/);
});

test('the portal task API fails closed without a portal identity and scopes worker tasks to the authenticated worker ID', () => {
  assert.match(portalTasksApi, /getPortalIdentity\(request\)/);
  assert.match(portalTasksApi, /status: 401/);
  assert.match(portalTasksApi, /eq\('assigned_worker_id', identity\.profileId\)/);
});

test('the unified portal scopes worker, volunteer, and member updates to their own allowed tasks', () => {
  assert.match(portalTasksApi, /identity\.role === 'volunteer'/);
  assert.match(portalTasksApi, /hmsi_member_tasks/);
  assert.match(portalTasksApi, /eq\('assigned_member_id', identity\.profileId\)/);
  assert.match(portalTasksApi, /eq\('assigned_worker_id', identity\.profileId\)/);
  assert.match(portalTasksApi, /volunteer_assignments/);
  assert.match(portalTasksApi, /eq\('assigned_volunteer_id', identity\.profileId\)/);
  assert.match(portalTasksApi, /canVolunteerTransition/);
  assert.match(portalTasksApi, /hmsi_member_task_events/);
});

test('role dashboards provide focused menus, guided job actions, proof-link entry, opportunities, and active session refresh', () => {
  assert.match(portalTasksUi, /aria-label="Workspace menu"/);
  assert.match(portalTasksUi, /href=\{config\.roomLink\}/);
  assert.match(portalTasksUi, /href="\/portal\/submissions"/);
  assert.match(portalTasksUi, /Accept and start job/);
  assert.match(portalTasksUi, /View full job/);
  assert.match(portalTasksUi, /Submit proof/);
  assert.match(portalTasksUi, /Only HMSI administration can approve work as complete/);
  assert.match(portalTasksUi, /id="opportunities"/);
  assert.match(portalTasksUi, /\/api\/portal\/auth\/refresh/);
});

test('the proof-link workspace returns to the role dispatcher and keeps submission guidance protected', () => {
  assert.match(submissionsUi, /href="\/portal"/);
  assert.match(submissionsUi, /personal Google Drive link/i);
  assert.match(submissionsUi, /Keep the original file/);
});

test('the worker directory endpoint is administrator-only and returns real assignment and access-event history only', () => {
  assert.match(directoryApi, /getAdminEmailFromCookie/);
  assert.match(directoryApi, /status: 401/);
  assert.match(directoryApi, /from\('work_assignments'\)/);
  assert.match(directoryApi, /from\('portal_access_events'\)/);
  assert.match(directoryApi, /fieldProofs: \[\]/);
  assert.match(directoryApi, /attendance: \[\]/);
});

test('the administrator password-reset action requires an active completed account and delegates to the time-limited recovery flow', () => {
  assert.match(resetApi, /getAdminEmailFromCookie/);
  assert.match(resetApi, /onboarding_status !== 'completed'/);
  assert.match(resetApi, /auth_user_id/);
  assert.match(resetApi, /requestPortalPasswordReset/);
  assert.match(resetApi, /password_reset_requested/);
});

test('the directory drawer exposes status and task history, preselects assignment, and keeps reset dispatch protected', () => {
  assert.match(directoryUi, /HMSI ID/);
  assert.match(directoryUi, /Task activity/);
  assert.match(directoryUi, /Submitted field proof/);
  assert.match(directoryUi, /Attendance/);
  assert.match(directoryUi, /assign_worker=/);
  assert.match(directoryUi, /Send password reset email/);
});

test('forgot-password remains email-only and responds without account-enumerating delivery detail', () => {
  assert.match(recoveryApi, /email/);
  assert.match(recoveryApi, /requestPortalPasswordReset/);
  assert.match(recoveryApi, /If an eligible HMSI account exists for that email/);
});

test('admin assignment register exposes assignees and protected review/edit/recovery controls', () => {
  assert.match(adminAssignmentsApi, /export async function GET/);
  assert.match(adminAssignmentsApi, /assigned_worker_name/);
  assert.match(adminAssignmentsApi, /export async function PATCH/);
  assert.match(adminAssignmentsApi, /export async function DELETE/);
  assert.match(adminAssignmentsApi, /is_deleted/);
  assert.match(adminAssignmentsApi, /deleted_by/);
  assert.match(adminAssignmentsUi, /Job assignments/);
  assert.match(adminAssignmentsUi, /Assigned to/);
  assert.match(adminAssignmentsUi, /Edit/);
  assert.match(adminAssignmentsUi, /Confirm recovery/);
  assert.match(adminControlUi, /href="\/admin\/assignments"/);
});
