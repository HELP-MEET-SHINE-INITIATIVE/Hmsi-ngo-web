import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperSource = await readFile(new URL('../lib/hmsiAssistant.ts', import.meta.url), 'utf8');
const chatSource = await readFile(new URL('../app/api/admin/assistant/chat/route.ts', import.meta.url), 'utf8');
const operatorSource = await readFile(new URL('../app/api/admin/assistant/operator/route.ts', import.meta.url), 'utf8');
const panelSource = await readFile(new URL('../components/HmsiAssistantPanel.tsx', import.meta.url), 'utf8');
const workerRouteSource = await readFile(new URL('../app/api/worker/assistant/route.ts', import.meta.url), 'utf8');
const workerTaskSource = await readFile(new URL('../app/api/worker/assistant/[taskId]/route.ts', import.meta.url), 'utf8');
const workerPanelSource = await readFile(new URL('../components/WorkerAssistantPanel.tsx', import.meta.url), 'utf8');
const newsroomRouteSource = await readFile(new URL('../app/api/admin/news/research/route.ts', import.meta.url), 'utf8');
const newsroomTaskSource = await readFile(new URL('../app/api/admin/news/research/[taskId]/route.ts', import.meta.url), 'utf8');
const newsroomPanelSource = await readFile(new URL('../components/NewsroomStudio.tsx', import.meta.url), 'utf8');
const portalAuthSource = await readFile(new URL('../lib/portalAuth.ts', import.meta.url), 'utf8');
const loginRouteSource = await readFile(new URL('../app/api/portal/auth/login/route.ts', import.meta.url), 'utf8');
const activateRouteSource = await readFile(new URL('../app/api/portal/auth/activate/route.ts', import.meta.url), 'utf8');
const recoverRouteSource = await readFile(new URL('../app/api/portal/auth/recover/route.ts', import.meta.url), 'utf8');
const profileRouteSource = await readFile(new URL('../app/api/portal/profile/route.ts', import.meta.url), 'utf8');
const assignmentsRouteSource = await readFile(new URL('../app/api/admin/assignments/route.ts', import.meta.url), 'utf8');

test('Gemini transport reads only the server-side standard credential', () => {
  assert.match(helperSource, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(helperSource, /process\.env\.MANUS_API_KEY/);
  assert.match(helperSource, /generativelanguage\.googleapis\.com\/v1beta\/models/);
  assert.match(helperSource, /encodeURIComponent\(apiKey\)/);
  assert.match(helperSource, /normalized: JsonSchema/);
  assert.doesNotMatch(helperSource, /\.\.\.schema,\s*type:/);
  assert.match(helperSource, /schema\.additionalProperties === false/);
  assert.match(helperSource, /is not declared by the schema/);
  assert.match(helperSource, /only one non-null type per node/);
});

test('admin chat returns a synchronous Gemini response and records a completed local task', () => {
  assert.match(chatSource, /response: task\.response_text/);
  assert.match(chatSource, /provider: 'gemini'/);
  assert.match(chatSource, /status: 'stopped'/);
  assert.doesNotMatch(chatSource, /message\.includes\('MANUS_API_KEY'\)/);
});

test('operator route stores a confirmation-ready structured preview', () => {
  assert.match(operatorSource, /status: 'pending_confirmation'/);
  assert.match(operatorSource, /provider: 'gemini'/);
  assert.match(operatorSource, /confirmationRequired/);
  assert.doesNotMatch(operatorSource, /message\.includes\('MANUS_API_KEY'\)/);
});

test('admin UI identifies the private workspace as Gemini-backed', () => {
  assert.match(panelSource, /Gemini workspace/);
  assert.match(panelSource, /Gemini is working/);
  assert.match(panelSource, /Ask Gemini privately/);
});

test('worker Assistant uses synchronous Gemini responses', () => {
  assert.match(workerRouteSource, /response: task\.response_text/);
  assert.match(workerRouteSource, /status: 'stopped'/);
  assert.match(workerRouteSource, /provider: 'gemini'/);
  assert.doesNotMatch(workerRouteSource, /MANUS_API_KEY|getManusAssistantMessages/);
  assert.doesNotMatch(workerTaskSource, /getManusAssistantMessages|extractManusTaskState/);
  assert.match(workerTaskSource, /provider: 'gemini'/);
  assert.doesNotMatch(workerPanelSource, /api\/worker\/assistant\/\$\{taskId\}/);
  assert.match(workerPanelSource, /Your Gemini assistance response is ready/);
});

test('built-in portal Auth is server-backed and role-scoped', () => {
  assert.match(portalAuthSource, /auth\.getUser/);
  assert.match(portalAuthSource, /PortalRole = 'worker' \| 'volunteer' \| 'member'/);
  assert.match(portalAuthSource, /onboarding_status.*completed/);
  assert.match(loginRouteSource, /attachPortalSession/);
  assert.match(activateRouteSource, /admin\.auth\.admin\.createUser/);
  assert.match(activateRouteSource, /activationCodeMatches/);
  assert.match(portalAuthSource, /resetPasswordForEmail/);
  assert.match(profileRouteSource, /auth_user_id/);
  assert.match(profileRouteSource, /MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(profileRouteSource, /ALLOWED_TYPES/);
});

test('assignment delivery issues worker identity access without granting admin access', () => {
  assert.match(assignmentsRouteSource, /getAdminEmailFromCookie/);
  assert.match(assignmentsRouteSource, /onboarding_status/);
  assert.match(assignmentsRouteSource, /sendPortalEmail/);
  assert.match(assignmentsRouteSource, /activationCode/);
  assert.doesNotMatch(assignmentsRouteSource, /HMSI_ADMIN_PASSWORD/);
});

test('newsroom research uses stored Gemini structured output and keeps drafts pending approval', () => {
  assert.match(newsroomRouteSource, /result: task\.structured_output/);
  assert.match(newsroomRouteSource, /status: 'stopped'/);
  assert.match(newsroomRouteSource, /provider: 'gemini'/);
  assert.doesNotMatch(newsroomRouteSource, /MANUS_API_KEY|getManusAssistantMessages/);
  assert.doesNotMatch(newsroomTaskSource, /getManusAssistantMessages|extractManusTaskState/);
  assert.match(newsroomTaskSource, /pending_admin_approval/);
  assert.match(newsroomPanelSource, /Gemini is researching current humanitarian developments/);
});
