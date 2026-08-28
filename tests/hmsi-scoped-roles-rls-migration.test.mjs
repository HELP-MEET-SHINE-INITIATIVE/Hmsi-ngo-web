import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const migrationPath = fileURLToPath(new URL('../supabase/hmsi_scoped_roles_rls_dry_run_migration.sql', import.meta.url));
const planPath = fileURLToPath(new URL('../docs/hmsi_scoped_roles_rls_migration_plan_2026-08-27.md', import.meta.url));
const backfillPath = fileURLToPath(new URL('../supabase/hmsi_role_identity_backfill_review_dry_run.sql', import.meta.url));
const backfillRunbookPath = fileURLToPath(new URL('../docs/hmsi_role_identity_backfill_activation_runbook_2026-08-27.md', import.meta.url));
const activationRpcPath = fileURLToPath(new URL('../supabase/hmsi_activate_role_rpc_dry_run.sql', import.meta.url));

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

async function readBackfill() {
  return readFile(backfillPath, 'utf8');
}

async function readActivationRpc() {
  return readFile(activationRpcPath, 'utf8');
}

test('scoped-role migration remains a dry-run, prerequisite-checked package', async () => {
  const sql = await readMigration();
  assert.match(sql, /begin;[\s\S]*rollback;\s*$/i);
  assert.doesNotMatch(sql, /\ncommit;\s*$/im);
  assert.match(sql, /Missing required HMSI table/i);
  assert.match(sql, /Missing required HMSI column/i);
  assert.match(sql, /Unexpected community-room RLS policy found/i);
  assert.match(sql, /No records are inserted into[\s\S]*organization_roles here/i);
  assert.match(sql, /manually approved role-seed template/i);
});

test('scoped-role migration ties capabilities to named Supabase Auth identities', async () => {
  const sql = await readMigration();
  assert.match(sql, /add column if not exists auth_user_id uuid references auth\.users\(id\)/i);
  assert.match(sql, /create table if not exists public\.role_capability_grants/i);
  assert.match(sql, /create table if not exists public\.approval_policies/i);
  assert.match(sql, /create table if not exists public\.authorization_audit_events/i);
  assert.match(sql, /create or replace function hmsi_auth\.has_capability/i);
  assert.match(sql, /revoke all on table public\.organization_roles from anon, authenticated/i);
  assert.doesNotMatch(sql, /update public\.organization_roles as role_record[\s\S]*from auth\.users as auth_user/i);
  assert.match(sql, /hmsi_role_identity_backfill_review_dry_run\.sql/i);
});

test('executive room access is comprehensive but direct room writes remain unavailable', async () => {
  const sql = await readMigration();
  assert.match(sql, /\('president', 'rooms\.read_all'\)/);
  assert.match(sql, /\('operations_admin', 'rooms\.read_all'\)/);
  assert.match(sql, /\('president', 'rooms\.moderate'\)/);
  assert.match(sql, /\('operations_admin', 'rooms\.moderate'\)/);
  assert.match(sql, /HMSI role or executive can view role-room messages/i);
  assert.match(sql, /No direct INSERT\/UPDATE\/DELETE policy is intentionally supplied for room/i);
  assert.match(sql, /moderation_status = 'published'[\s\S]*HMSI public can view comments on published all-audience posts/i);
  assert.doesNotMatch(sql, /Public can create collaboration posts[\s\S]*create policy "Public can create collaboration posts"/i);
  assert.doesNotMatch(sql, /create policy "HMSI [^"]*community[^"]*"[\s\S]{0,240}using \(true\)/i);
});

test('implementation plan preserves independent approval for high-risk operations', async () => {
  const [sql, plan] = await Promise.all([readMigration(), readFile(planPath, 'utf8')]);
  assert.match(sql, /\('finance\.reconciliation\.apply', 2, false, true\)/);
  assert.match(sql, /\('people\.permanent_delete', 2, false, true\)/);
  assert.match(sql, /\('governance\.role_grant', 2, false, true\)/);
  assert.match(plan, /self-approval/i);
  assert.match(plan, /not authorized for database application or authentication changes/i);
});

test('email-match backfill only creates a private candidate review queue', async () => {
  const sql = await readBackfill();
  assert.match(sql, /begin;[\s\S]*rollback;\s*$/i);
  assert.match(sql, /create table if not exists public\.role_identity_backfill_reviews/i);
  assert.match(sql, /revoke all on table public\.role_identity_backfill_reviews from anon, authenticated/i);
  assert.match(sql, /Never auto-populate organization_roles\.auth_user_id/i);
  assert.match(sql, /email_confirmed_at/i);
  assert.match(sql, /candidate_not_eligible/i);
  assert.match(sql, /discovered_candidate_auth_user_id/i);
  assert.match(sql, /candidate_changed_at/i);
  assert.match(sql, /then 'stale'/i);
  assert.match(sql, /review_status in \('pending_identity_verification', 'stale'\)/i);
  assert.match(sql, /when public\.role_identity_backfill_reviews\.review_status = 'stale'[\s\S]{0,80}then 'stale'/i);
  assert.match(sql, /coalesce\(public\.role_identity_backfill_reviews\.candidate_changed_at, timezone\('utc', now\(\)\)\)/i);
  assert.match(sql, /the reviewed candidate is preserved and cannot silently be[\s\S]*replaced/i);
  assert.doesNotMatch(sql, /source_email_fingerprint|\bmd5\s*\(/i);
  assert.doesNotMatch(sql, /set auth_user_id\s*=/i);
  assert.doesNotMatch(sql, /insert into public\.role_capability_grants/i);
});

test('atomic activation RPC is locked, fail-closed, and dry-run only', async () => {
  const sql = await readActivationRpc();
  assert.match(sql, /begin;[\s\S]*rollback;\s*$/i);
  assert.match(sql, /create or replace function hmsi_auth\.activate_role_identity/i);
  assert.match(sql, /auth\.uid\(\)\s+<>\s+p_executing_auth_user_id/i);
  assert.match(sql, /hmsi_auth\.has_capability\('governance\.roles\.manage'/i);
  assert.match(sql, /from public\.role_identity_backfill_reviews[\s\S]*for update/i);
  assert.match(sql, /from public\.organization_roles[\s\S]*for update/i);
  assert.match(sql, /from public\.approval_requests[\s\S]*for update/i);
  assert.match(sql, /review_status <> 'approved_for_activation'/i);
  assert.match(sql, /lower\(btrim\(v_candidate\.email\)\) is distinct from v_source_email/i);
  assert.match(sql, /count\(distinct event\.actor_auth_user_id\)/i);
  assert.match(sql, /Insufficient independent role-grant approvals/i);
  assert.match(sql, /Role already has capability history/i);
  assert.match(sql, /get diagnostics v_capability_count = row_count/i);
  assert.match(sql, /insert into public\.authorization_audit_events/i);
  assert.match(sql, /revoke all on function hmsi_auth\.activate_role_identity/i);
  assert.doesNotMatch(sql, /grant execute on function hmsi_auth\.activate_role_identity[\s\S]*to anon/i);
});

test('email-match activation runbook requires independent evidence and approval', async () => {
  const runbook = await readFile(backfillRunbookPath, 'utf8');
  assert.match(runbook, /two \*\*distinct\*\* approver Auth UUIDs/i);
  assert.match(runbook, /candidate cannot be an approver/i);
  assert.match(runbook, /requester self-approval/i);
  assert.match(runbook, /not a direct browser or SQL-console flow/i);
  assert.match(runbook, /first President or first Operations Administrator/i);
});
