-- HMSI atomic role-activation RPC (review/staging package)
--
-- PURPOSE
--   Provide a single PostgreSQL transaction for activating one reviewed,
--   individually authenticated organization role. The function is fail-closed:
--   it locks all decision rows, rechecks current Auth identity and approvals,
--   inserts only the approved role-template capabilities, records audit data,
--   and raises an exception on any failed assertion.
--
-- SAFETY
--   This file ends with ROLLBACK. It creates no live role assignment when run
--   unchanged. Apply only in an isolated staging project after the base scoped
--   role migration and identity-review queue have been reviewed.
--
-- IMPORTANT
--   The caller must be a protected server route using the authenticated user's
--   UUID. Do not expose a service-role key or invoke this function from an
--   anonymous client. RLS is not a substitute for the route-level capability
--   check because service-role clients bypass RLS.

begin;

-- ============================================================================
-- 0. Fail closed if the prerequisite objects/columns are incomplete.
-- ============================================================================
do $$
begin
  if to_regclass('public.organization_roles') is null
     or to_regclass('public.role_capability_templates') is null
     or to_regclass('public.role_capability_grants') is null
     or to_regclass('public.approval_policies') is null
     or to_regclass('public.approval_requests') is null
     or to_regclass('public.approval_events') is null
     or to_regclass('public.role_identity_backfill_reviews') is null
     or to_regclass('public.authorization_audit_events') is null then
    raise exception 'HMSI activation prerequisites are incomplete';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'organization_roles' and column_name = 'auth_user_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'organization_roles' and column_name = 'assigned_by_auth_user_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'requested_by_auth_user_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'decided_by_auth_user_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'action_key')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'target_type')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'target_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'evidence_reference')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'expires_at')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_events' and column_name = 'actor_auth_user_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'role_identity_backfill_reviews' and column_name = 'discovered_candidate_auth_user_id') then
    raise exception 'HMSI activation prerequisite columns are incomplete';
  end if;
end;
$$;

-- ============================================================================
-- 1. Prevent duplicate approved decisions by one Auth identity on a request.
--    Legacy rows with null actor_auth_user_id are not modified by this index.
-- ============================================================================
create unique index if not exists approval_events_approved_actor_request_uniq
  on public.approval_events (approval_request_id, actor_auth_user_id)
  where action = 'approved' and actor_auth_user_id is not null;

-- ============================================================================
-- 2. Locked, server-callable RPC.
-- ============================================================================
create or replace function hmsi_auth.activate_role_identity(
  p_review_id uuid,
  p_approval_request_id uuid,
  p_candidate_auth_user_id uuid,
  p_executing_auth_user_id uuid
)
returns table (
  organization_role_id uuid,
  activated_auth_user_id uuid,
  role_name text,
  capability_count integer,
  activated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth, hmsi_auth
as $$
declare
  v_review public.role_identity_backfill_reviews%rowtype;
  v_role public.organization_roles%rowtype;
  v_request public.approval_requests%rowtype;
  v_candidate auth.users%rowtype;
  v_role_name text;
  v_approval_count integer;
  v_capability_count integer;
  v_now timestamptz := timezone('utc', now());
  v_source_email text;
begin
  -- The route normally checks this before calling. Repeating the check in the
  -- function prevents a privileged RPC call with an arbitrary actor UUID.
  if auth.uid() is null or auth.uid() <> p_executing_auth_user_id then
    raise exception 'Activation actor is not the authenticated user';
  end if;

  if not hmsi_auth.has_capability('governance.roles.manage', null, null) then
    raise exception 'Activation actor lacks role-management capability';
  end if;

  -- The lock timeout prevents an activation from waiting indefinitely behind an
  -- unrelated transaction. The statement timeout is an upper bound for this
  -- bounded, single-role operation.
  perform set_config('lock_timeout', '3000ms', true);
  perform set_config('statement_timeout', '10000ms', true);

  -- Lock the review first, then the role, then the approval request. Every
  -- caller uses this same order to avoid lock-order deadlocks.
  select * into strict v_review
  from public.role_identity_backfill_reviews
  where id = p_review_id
  for update;

  if v_review.review_status <> 'approved_for_activation' then
    raise exception 'Role review is not approved for activation';
  end if;

  if v_review.approval_request_id is distinct from p_approval_request_id then
    raise exception 'Role review approval target mismatch';
  end if;

  if v_review.candidate_auth_user_id is distinct from p_candidate_auth_user_id then
    raise exception 'Role review candidate mismatch';
  end if;

  select * into strict v_role
  from public.organization_roles
  where id = v_review.organization_role_id
  for update;

  if v_role.status <> 'active' or v_role.auth_user_id is not null then
    raise exception 'Role is no longer active and unbound';
  end if;

  v_source_email := lower(btrim(v_role.principal_email));
  if v_source_email is null or v_source_email = '' then
    raise exception 'Role has no usable identity email';
  end if;

  -- Lock the current Auth row. The function reads only the fields needed for
  -- final identity eligibility and never copies the email into an audit row.
  select * into strict v_candidate
  from auth.users
  where id = p_candidate_auth_user_id
  for update;

  if lower(btrim(v_candidate.email)) is distinct from v_source_email then
    raise exception 'Current Auth identity does not match role identity';
  end if;

  if v_candidate.email_confirmed_at is null then
    raise exception 'Candidate Auth email is not confirmed';
  end if;

  if v_candidate.banned_until is not null and v_candidate.banned_until > v_now then
    raise exception 'Candidate Auth account is not eligible';
  end if;

  if (select count(*) from auth.users as current_user where lower(btrim(current_user.email)) = v_source_email) <> 1 then
    raise exception 'Role identity does not have exactly one current Auth match';
  end if;

  select * into strict v_request
  from public.approval_requests
  where id = p_approval_request_id
  for update;

  if v_request.action_key <> 'governance.role_grant'
     or v_request.target_type <> 'organization_role'
     or v_request.target_id is distinct from v_role.id
     or v_request.status <> 'approved'
     or v_request.expires_at is null
     or v_request.expires_at <= v_now
     or v_request.evidence_reference is null
     or btrim(v_request.evidence_reference) = ''
     or v_request.requested_by_auth_user_id is null then
    raise exception 'Role-grant approval request is invalid or expired';
  end if;

  if v_request.requested_by_auth_user_id = p_candidate_auth_user_id
     or v_request.requested_by_auth_user_id = p_executing_auth_user_id then
    raise exception 'Requester cannot be candidate or activation actor';
  end if;

  -- Count distinct, non-self, current capability-bearing approvers. The
  -- approval-policy row is the source of the minimum count; the function does
  -- not trust a summary decided_by field.
  select count(distinct event.actor_auth_user_id)::integer
  into v_approval_count
  from public.approval_events as event
  join public.organization_roles as approver_role
    on approver_role.auth_user_id = event.actor_auth_user_id
   and approver_role.status = 'active'
  join public.role_capability_grants as approver_grant
    on approver_grant.organization_role_id = approver_role.id
   and approver_grant.capability = 'governance.approvals.decide'
   and approver_grant.revoked_at is null
  where event.approval_request_id = v_request.id
    and event.action = 'approved'
    and event.actor_auth_user_id is not null
    and event.actor_auth_user_id <> p_candidate_auth_user_id
    and event.actor_auth_user_id <> v_request.requested_by_auth_user_id
    and event.actor_auth_user_id <> p_executing_auth_user_id;

  if v_approval_count < (select minimum_distinct_approvers from public.approval_policies where action_key = 'governance.role_grant' and active) then
    raise exception 'Insufficient independent role-grant approvals';
  end if;

  -- Lock out an already-existing grant set. A first activation must have no
  -- capability rows for the role; reconciliation of legacy grants is separate.
  if exists (select 1 from public.role_capability_grants where organization_role_id = v_role.id) then
    raise exception 'Role already has capability history; reconcile before activation';
  end if;

  select role into v_role_name
  from public.organization_roles
  where id = v_role.id;

  update public.organization_roles
  set auth_user_id = p_candidate_auth_user_id,
      assigned_by_auth_user_id = p_executing_auth_user_id
  where id = v_role.id
    and auth_user_id is null
    and status = 'active';

  if not found then
    raise exception 'Role binding changed during activation';
  end if;

  insert into public.role_capability_grants (
    organization_role_id, capability, granted_by_auth_user_id, reason
  )
  select v_role.id, template.capability, p_executing_auth_user_id,
         'Approved role activation; approval request ' || v_request.id::text
  from public.role_capability_templates as template
  where template.role = v_role_name;

  get diagnostics v_capability_count = row_count;
  if v_capability_count < 1 then
    raise exception 'Role template has no capabilities';
  end if;

  update public.role_identity_backfill_reviews
  set review_status = 'activated',
      approval_request_id = v_request.id,
      activated_at = v_now,
      activated_by_auth_user_id = p_executing_auth_user_id,
      updated_at = v_now
  where id = v_review.id
    and review_status = 'approved_for_activation';

  if not found then
    raise exception 'Role review changed during activation';
  end if;

  update public.approval_requests
  set status = 'approved',
      decided_by_auth_user_id = p_executing_auth_user_id,
      decided_at = v_now,
      updated_at = v_now
  where id = v_request.id
    and status = 'approved';

  if not found then
    raise exception 'Approval request changed during activation';
  end if;

  insert into public.authorization_audit_events (
    actor_auth_user_id, actor_role, action_key, target_type, target_id,
    approval_request_id, route_key, result, reason_code
  ) values (
    p_executing_auth_user_id, v_role_name, 'governance.role_grant',
    'organization_role', v_role.id, v_request.id,
    'admin.governance.role-activation', 'allowed', 'approved_backfill_activation'
  );

  return query
  select v_role.id, p_candidate_auth_user_id, v_role_name,
         v_capability_count, v_now;
exception
  when others then
    -- Do not expose email, role notes, Auth metadata, or SQL detail in the
    -- client error. The transaction is rolled back by PostgreSQL.
    raise exception using
      message = case
        when sqlstate = 'P0001' then sqlerrm
        else 'Role activation failed closed'
      end,
      errcode = sqlstate;
end;
$$;

revoke all on function hmsi_auth.activate_role_identity(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function hmsi_auth.activate_role_identity(uuid, uuid, uuid, uuid) to authenticated;

-- Read-only validation of the function and grants in staging.
select n.nspname as schema_name, p.proname as function_name,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'hmsi_auth'
  and p.proname = 'activate_role_identity'
limit 10;

rollback;
