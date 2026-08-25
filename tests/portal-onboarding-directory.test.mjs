import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const onboardingApi = read('app/api/onboarding/route.ts');
const passwordApi = read('app/api/onboarding/password/route.ts');
const loginApi = read('app/api/portal/auth/login/route.ts');
const portalAuth = read('lib/portalAuth.ts');
const directoryApi = read('app/api/admin/directory/[id]/route.ts');
const resetApi = read('app/api/admin/directory/[id]/reset/route.ts');
const portalTasksApi = read('app/api/portal/tasks/route.ts');
const onboardingUi = read('app/onboarding/OnboardingContent.tsx');
const loginUi = read('app/login/LoginContent.tsx');
const directoryUi = read('components/WorkerDirectory.tsx');
const recoveryApi = read('app/api/portal/auth/recover/route.ts');

test('onboarding completion issues an existing-or-new HMSI ID before password setup and never attaches the legacy worker session', () => {
  assert.match(onboardingApi, /ensureWorkerHmsiId/);
  assert.match(onboardingApi, /event_type: 'hmsi_id_issued'/);
  assert.match(onboardingApi, /hmsiId/);
  assert.doesNotMatch(onboardingApi, /attachWorkerSession/);
});

test('password setup requires completed onboarding, user-controlled matching password input, and an authenticated portal session', () => {
  assert.match(passwordApi, /password !== confirmPassword/);
  assert.match(passwordApi, /neq\('status', 'completed'\)/);
  assert.match(passwordApi, /auth\.admin\.createUser/);
  assert.match(passwordApi, /attachPortalSession/);
  assert.match(passwordApi, /redirectTo: '\/portal\/my-tasks'/);
  assert.doesNotMatch(passwordApi, /activationCode:\s*activationCode/);
});

test('portal login resolves HMSI ID server-side and preserves generic credential failures', () => {
  assert.match(loginApi, /resolvePortalEmail\(identifier\)/);
  assert.match(loginApi, /Invalid portal credentials\./);
  assert.doesNotMatch(loginApi, /Worker not found|ID card could not be verified/);
  assert.match(portalAuth, /\^HMSI-\[WVM\]-\\d\{4\}-\[A-F0-9\]\{8\}\$/);
});

test('the onboarding completion screen renders a password confirmation handoff and routes only after setup succeeds', () => {
  assert.match(onboardingUi, /100% onboarding complete/);
  assert.match(onboardingUi, /Confirm password/);
  assert.match(onboardingUi, /Create password & access portal/);
  assert.match(onboardingUi, /router\.replace\(payload\.redirectTo \|\| '\/portal\/my-tasks'\)/);
});

test('the login UI accepts email or HMSI ID and routes authenticated identities into the unified task portal', () => {
  assert.match(loginUi, /Email address or HMSI ID/);
  assert.match(loginUi, /HMSI-W-2026-XXXXXXXX/);
  assert.match(loginUi, /router\.push\('\/portal\/my-tasks'\)/);
});

test('the portal task API fails closed without a portal identity and scopes worker tasks to the authenticated worker ID', () => {
  assert.match(portalTasksApi, /getPortalIdentity\(request\)/);
  assert.match(portalTasksApi, /status: 401/);
  assert.match(portalTasksApi, /eq\('assigned_worker_id', identity\.profileId\)/);
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
