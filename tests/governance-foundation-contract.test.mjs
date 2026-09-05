import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('governance migration hardens flagged database functions and removes public execution of the privileged RLS helper', async () => {
  const migration = await read('supabase/hmsi_governance_foundation_patch.sql');
  for (const name of ['touch_featured_story_updated_at', 'touch_news_article_updated_at', 'set_news_article_archive_deadline', 'set_external_drive_submission_updated_at', 'touch_outreach_gallery_image_updated_at']) {
    assert.match(migration, new RegExp(`alter function public\\.${name}\\(\\) set search_path = pg_catalog, public;`));
  }
  assert.match(migration, /revoke execute on function public\.rls_auto_enable\(\) from public, anon, authenticated;/);
});

test('governance migration provides server-only branch, programme, approval, delegation, and automation-run models', async () => {
  const migration = await read('supabase/hmsi_governance_foundation_patch.sql');
  for (const table of ['operational_units', 'programmes', 'organization_roles', 'authority_delegations', 'approval_requests', 'approval_events', 'automation_runs']) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
  }
  assert.match(migration, /mode text not null default 'dry_run'/);
  assert.match(migration, /authority_scope text not null check/);
});

test('onboarding and setup paths support members without weakening worker or volunteer gates', async () => {
  const onboarding = await read('app/api/onboarding/route.ts');
  const helper = await read('lib/onboarding.ts');
  const setup = await read('app/api/setup-password/route.ts');
  assert.match(helper, /role: 'worker' \| 'volunteer' \| 'member'/);
  assert.match(helper, /member_id: memberId \|\| null/);
  assert.match(onboarding, /invitation\.role === 'member' && invitation\.member_id/);
  assert.match(onboarding, /onboarding_status: 'completed'/);
  assert.match(setup, /role === 'worker' \|\| invitation\?\.role === 'volunteer' \|\| invitation\?\.role === 'member'/);
  assert.match(setup, /role === 'worker' \? 'workers' : role === 'volunteer' \? 'volunteer_applications' : 'hmsi_members'/);
  assert.match(setup, /role === 'worker'\s*\? 'id,name,email,auth_user_id,status,onboarding_status'/);
  assert.match(setup, /role === 'volunteer'\s*\? 'id,name,email,auth_user_id,status,account_status'/);
});

test('governance API requires administrator authentication and same-origin mutations while dry runs cannot send messages', async () => {
  const route = await read('app/api/admin/governance/route.ts');
  const controls = await read('app/admin/governance/GovernanceControls.tsx');
  assert.match(route, /inspectAdminSession/);
  assert.match(route, /bestEffortSecurityEvent/);
  assert.match(route, /Cross-site governance requests are not allowed/);
  assert.match(route, /mode: 'dry_run'/);
  assert.match(route, /No notification, task, approval, or data change was executed/);
  assert.doesNotMatch(route, /sendHmsiNotification/);
  assert.match(controls, /type="datetime-local"/);
  assert.match(controls, /Reason and responsibility boundary/);
  assert.match(controls, /does not execute a workflow and cannot enable a schedule or notification/);
});

test('member task feeds hide deleted work and require same-origin submitted-work review with a rationale', async () => {
  const memberRoute = await read('app/api/member/tasks/route.ts');
  const adminRoute = await read('app/api/admin/member-tasks/route.ts');
  assert.match(memberRoute, /Cross-site task updates are not allowed/);
  assert.match(memberRoute, /\.eq\('is_deleted', false\)/);
  assert.match(memberRoute, /submitted_at: status === 'submitted'/);
  assert.match(adminRoute, /Cross-site member-task changes are not allowed/);
  assert.match(adminRoute, /body\.status === 'completed' \|\| body\.status === 'cancelled'/);
  assert.match(adminRoute, /A submitted member task, review decision, and review note are required/);
  assert.match(adminRoute, /\.eq\('status', 'submitted'\)/);
  assert.match(adminRoute, /reviewed_by: adminEmail/);
});
