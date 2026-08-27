-- HMSI scoped roles, executive access, and room RLS migration.
--
-- PURPOSE
--   Transition the existing governance register from an email-only authority
--   record into individually authenticated, capability-scoped access. The
--   migration grants approved President and Operations Administrator identities
--   comprehensive READ/MODERATION access to worker, volunteer, member, and
--   community-room records through server-authorized dashboards.
--
-- IMPORTANT SAFETY BOUNDARY
--   This script does NOT assign a real person to President or Operations
--   Administrator. A named Supabase Auth user ID must be approved and inserted
--   in the final, separate seed step after staging verification. Do not use a
--   shared administrator credential or an arbitrary email address.
--
-- EXECUTION MODE
--   This is deliberately a dry run: it ends in ROLLBACK. Review all output and
--   validation queries in a disposable staging project. Only after the staged
--   tests and named-role approval succeed may an authorized database owner
--   change the FINAL ROLLBACK to COMMIT for a single controlled production run.
--
-- DEPENDENCIES
--   Apply only after:
--     * hmsi_governance_foundation_patch.sql
--     * retention_role_rooms_patch.sql
--     * people_operations_president_office_patch.sql
--     * hmsi_member_room_tasks_patch.sql
--     * hmsi_room_antispam_patch.sql
--
-- This file contains no production DML against people, task, donation, or
-- existing room rows. It is additive except for replacing the identified
-- permissive direct-client community policies with authenticated read policies.

begin;

-- ============================================================================
-- 0. Fail closed if the expected HMSI schema is not already present.
-- ============================================================================
do $$
declare
  required_table text;
  required_column record;
  required_tables text[] := array[
    'organization_roles',
    'authority_delegations',
    'approval_requests',
    'approval_events',
    'approved_contact_directory',
    'role_room_messages',
    'community_posts',
    'community_comments',
    'community_likes',
    'workers',
    'volunteer_applications',
    'hmsi_members'
  ];
begin
  foreach required_table in array required_tables loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'Missing required HMSI table public.%. Apply the prerequisite migration first.', required_table;
    end if;
  end loop;

  for required_column in
    select *
    from (values
      ('organization_roles', 'principal_email'),
      ('organization_roles', 'role'),
      ('organization_roles', 'status'),
      ('authority_delegations', 'delegate_email'),
      ('authority_delegations', 'authority_scope'),
      ('authority_delegations', 'starts_at'),
      ('authority_delegations', 'ends_at'),
      ('approved_contact_directory', 'role'),
      ('role_room_messages', 'room_role'),
      ('community_posts', 'audience'),
      ('community_posts', 'moderation_status'),
      ('community_comments', 'post_id'),
      ('community_comments', 'moderation_status'),
      ('community_likes', 'post_id'),
      ('workers', 'auth_user_id'),
      ('workers', 'onboarding_status'),
      ('volunteer_applications', 'auth_user_id'),
      ('volunteer_applications', 'account_status'),
      ('volunteer_applications', 'applicant_role'),
      ('hmsi_members', 'auth_user_id')
    ) as prerequisites(table_name, column_name)
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = required_column.table_name
        and column_name = required_column.column_name
    ) then
      raise exception 'Missing required HMSI column public.%.%. Apply the prerequisite migration first.', required_column.table_name, required_column.column_name;
    end if;
  end loop;

  -- The migration replaces the policies listed below. Stop rather than retain
  -- any unknown community policy that could broaden access after `SELECT` is
  -- granted back to anon/authenticated.
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('community_posts', 'community_comments', 'community_likes')
      and policyname not in (
        'Public can view collaboration posts',
        'Public can create collaboration posts',
        'Public can view collaboration comments',
        'Public can create collaboration comments',
        'Public can view collaboration likes',
        'Public can create collaboration likes',
        'Public can remove collaboration likes',
        'HMSI public can view published all-audience posts',
        'HMSI authenticated roles or executives can view community posts',
        'HMSI public can view comments on published all-audience posts',
        'HMSI authenticated roles or executives can view community comments',
        'HMSI public can view likes on published all-audience posts',
        'HMSI authenticated roles or executives can view community likes'
      )
  ) then
    raise exception 'Unexpected community-room RLS policy found. Review it before applying this migration.';
  end if;
end;
$$;

-- ============================================================================
-- 1. Bind governance roles to named Supabase Auth identities.
-- ============================================================================
alter table public.organization_roles
  add column if not exists auth_user_id uuid references auth.users(id) on delete restrict;

alter table public.organization_roles
  add column if not exists assigned_by_auth_user_id uuid references auth.users(id) on delete set null;

alter table public.organization_roles
  add column if not exists revoked_by_auth_user_id uuid references auth.users(id) on delete set null;

-- Keep historic rows intact, but bind only exact lower-cased email matches.
-- New privileged roles must provide auth_user_id explicitly through a protected
-- server route; email is retained as audit-friendly display metadata only.
update public.organization_roles as role_record
set auth_user_id = auth_user.id
from auth.users as auth_user
where role_record.auth_user_id is null
  and role_record.principal_email = lower(auth_user.email)
  and auth_user.email is not null;

drop constraint if exists organization_roles_role_check;
alter table public.organization_roles
  add constraint organization_roles_role_check
  check (role in (
    'president',
    'operations_admin',
    'finance_admin',
    'editorial_admin',
    'people_safeguarding_admin',
    'branch_coordinator',
    'programme_lead',
    'finance_reviewer',
    'compliance_reviewer',
    'read_only_auditor'
  ));

-- A user may hold more than one role, but cannot receive duplicate active role
-- assignments in the same operational/programme scope.
create unique index if not exists organization_roles_active_identity_scope_uniq
  on public.organization_roles (
    auth_user_id,
    role,
    coalesce(operational_unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(programme_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'active' and auth_user_id is not null;

create index if not exists organization_roles_auth_active_idx
  on public.organization_roles (auth_user_id, status, role)
  where auth_user_id is not null and status = 'active';

-- ============================================================================
-- 2. Define atomic capabilities rather than a universal administrator bypass.
-- ============================================================================
create table if not exists public.role_capability_grants (
  id uuid primary key default gen_random_uuid(),
  organization_role_id uuid not null references public.organization_roles(id) on delete cascade,
  capability text not null check (capability in (
    'executive.dashboard.read',
    'people.directory.read_all',
    'people.records.read_all',
    'rooms.read_all',
    'rooms.moderate',
    'assignments.read_all',
    'assignments.manage',
    'tasks.review',
    'governance.read',
    'governance.manage',
    'governance.roles.manage',
    'governance.approvals.request',
    'governance.approvals.decide',
    'finance.dashboard.read',
    'finance.reconciliation.prepare',
    'finance.reconciliation.approve',
    'editorial.manage',
    'safeguarding.review',
    'audit.read'
  )),
  granted_by_auth_user_id uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  unique (organization_role_id, capability)
);

create index if not exists role_capability_grants_active_lookup_idx
  on public.role_capability_grants (organization_role_id, capability)
  where revoked_at is null;

alter table public.role_capability_grants enable row level security;

-- The authority register can support properly time-bounded delegated rights.
-- The server layer must still require a valid delegation reason, scope, and
-- expiry before writing a delegation record.
drop constraint if exists authority_delegations_authority_scope_check;
alter table public.authority_delegations
  add constraint authority_delegations_authority_scope_check
  check (authority_scope in (
    'people_approval',
    'task_review',
    'branch_operations',
    'programme_operations',
    'finance_review',
    'compliance_review',
    'directory_read',
    'room_moderation',
    'role_administration'
  ));

alter table public.authority_delegations
  add column if not exists delegate_auth_user_id uuid references auth.users(id) on delete restrict;

alter table public.authority_delegations
  add column if not exists delegated_by_auth_user_id uuid references auth.users(id) on delete set null;

alter table public.authority_delegations
  add column if not exists revoked_by_auth_user_id uuid references auth.users(id) on delete set null;

update public.authority_delegations as delegation
set delegate_auth_user_id = auth_user.id
from auth.users as auth_user
where delegation.delegate_auth_user_id is null
  and delegation.delegate_email = lower(auth_user.email)
  and auth_user.email is not null;

create index if not exists authority_delegations_active_auth_idx
  on public.authority_delegations (delegate_auth_user_id, authority_scope, starts_at, ends_at)
  where status = 'active' and delegate_auth_user_id is not null;

-- ============================================================================
-- 3. Record high-risk approval requirements and privacy-minimized audit events.
-- ============================================================================
create table if not exists public.approval_policies (
  action_key text primary key check (action_key in (
    'finance.reconciliation.apply',
    'finance.refund_or_reversal',
    'people.permanent_delete',
    'people.bulk_export',
    'governance.role_grant',
    'governance.role_revoke',
    'governance.delegation_grant',
    'retention.exception',
    'safeguarding.exception',
    'production.configuration_change'
  )),
  minimum_distinct_approvers smallint not null check (minimum_distinct_approvers between 1 and 3),
  requester_may_approve boolean not null default false,
  evidence_required boolean not null default true,
  active boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.approval_policies (action_key, minimum_distinct_approvers, requester_may_approve, evidence_required)
values
  ('finance.reconciliation.apply', 2, false, true),
  ('finance.refund_or_reversal', 2, false, true),
  ('people.permanent_delete', 2, false, true),
  ('people.bulk_export', 2, false, true),
  ('governance.role_grant', 2, false, true),
  ('governance.role_revoke', 2, false, true),
  ('governance.delegation_grant', 2, false, true),
  ('retention.exception', 2, false, true),
  ('safeguarding.exception', 2, false, true),
  ('production.configuration_change', 2, false, true)
on conflict (action_key) do update
set minimum_distinct_approvers = excluded.minimum_distinct_approvers,
    requester_may_approve = excluded.requester_may_approve,
    evidence_required = excluded.evidence_required,
    updated_at = timezone('utc', now());

alter table public.approval_requests
  add column if not exists requested_by_auth_user_id uuid references auth.users(id) on delete set null;

alter table public.approval_requests
  add column if not exists decided_by_auth_user_id uuid references auth.users(id) on delete set null;

alter table public.approval_requests
  add column if not exists action_key text references public.approval_policies(action_key) on delete restrict;

alter table public.approval_requests
  add column if not exists evidence_reference text;

alter table public.approval_requests
  add column if not exists target_type text;

alter table public.approval_requests
  add column if not exists target_id uuid;

alter table public.approval_requests
  add column if not exists expires_at timestamptz;

alter table public.approval_events
  add column if not exists actor_auth_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.authorization_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action_key text not null check (char_length(trim(action_key)) between 3 and 120),
  target_type text check (target_type is null or char_length(trim(target_type)) between 2 and 80),
  target_id uuid,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  route_key text not null check (char_length(trim(route_key)) between 2 and 160),
  result text not null check (result in ('allowed', 'denied', 'failed')),
  reason_code text check (reason_code is null or char_length(trim(reason_code)) between 2 and 80),
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists authorization_audit_events_actor_time_idx
  on public.authorization_audit_events (actor_auth_user_id, occurred_at desc);

create index if not exists authorization_audit_events_action_time_idx
  on public.authorization_audit_events (action_key, occurred_at desc);

alter table public.approval_policies enable row level security;
alter table public.authorization_audit_events enable row level security;

-- ============================================================================
-- 4. Security-definer helpers for RLS. They expose no records and are not
--    intended as client business APIs. They use auth.uid() and exact active
--    role/delegation rows; user metadata is never trusted for authorization.
-- ============================================================================
create schema if not exists hmsi_auth;
revoke all on schema hmsi_auth from public, anon;
grant usage on schema hmsi_auth to authenticated;

create or replace function hmsi_auth.has_portal_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, hmsi_auth
as $$
  select case required_role
    when 'worker' then exists (
      select 1
      from public.workers as worker
      where worker.auth_user_id = (select auth.uid())
        and worker.status = 'active'
        and worker.onboarding_status = 'completed'
    )
    when 'volunteer' then exists (
      select 1
      from public.volunteer_applications as volunteer
      where volunteer.auth_user_id = (select auth.uid())
        and volunteer.status = 'approved'
        and volunteer.account_status = 'active'
        and volunteer.applicant_role = 'volunteer'
    )
    when 'member' then exists (
      select 1
      from public.hmsi_members as member
      where member.auth_user_id = (select auth.uid())
        and member.status = 'active'
    )
    else false
  end;
$$;

create or replace function hmsi_auth.has_capability(
  required_capability text,
  required_operational_unit_id uuid default null,
  required_programme_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, hmsi_auth
as $$
  select (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.organization_roles as role_record
        join public.role_capability_grants as grant_record
          on grant_record.organization_role_id = role_record.id
         and grant_record.revoked_at is null
        where role_record.auth_user_id = (select auth.uid())
          and role_record.status = 'active'
          and grant_record.capability = required_capability
          and (
            (required_operational_unit_id is null and role_record.operational_unit_id is null)
            or (
              required_operational_unit_id is not null
              and (role_record.operational_unit_id is null or role_record.operational_unit_id = required_operational_unit_id)
            )
          )
          and (
            (required_programme_id is null and role_record.programme_id is null)
            or (
              required_programme_id is not null
              and (role_record.programme_id is null or role_record.programme_id = required_programme_id)
            )
          )
      )
      or exists (
        select 1
        from public.authority_delegations as delegation
        where delegation.delegate_auth_user_id = (select auth.uid())
          and delegation.status = 'active'
          and delegation.starts_at <= timezone('utc', now())
          and delegation.ends_at > timezone('utc', now())
          and (
            (required_operational_unit_id is null and delegation.operational_unit_id is null)
            or (
              required_operational_unit_id is not null
              and (delegation.operational_unit_id is null or delegation.operational_unit_id = required_operational_unit_id)
            )
          )
          and (
            (required_programme_id is null and delegation.programme_id is null)
            or (
              required_programme_id is not null
              and (delegation.programme_id is null or delegation.programme_id = required_programme_id)
            )
          )
          and (
            (delegation.authority_scope in ('people_approval', 'directory_read') and required_capability in ('people.directory.read_all', 'people.records.read_all'))
            or (delegation.authority_scope = 'task_review' and required_capability in ('assignments.read_all', 'tasks.review'))
            or (delegation.authority_scope = 'room_moderation' and required_capability in ('rooms.read_all', 'rooms.moderate'))
            or (delegation.authority_scope = 'role_administration' and required_capability = 'governance.roles.manage')
            or (delegation.authority_scope = 'finance_review' and required_capability in ('finance.dashboard.read', 'finance.reconciliation.prepare'))
            or (delegation.authority_scope = 'compliance_review' and required_capability in ('safeguarding.review', 'audit.read'))
          )
      )
    );
$$;

revoke all on function hmsi_auth.has_portal_role(text) from public, anon;
revoke all on function hmsi_auth.has_capability(text, uuid, uuid) from public, anon;
grant execute on function hmsi_auth.has_portal_role(text) to authenticated;
grant execute on function hmsi_auth.has_capability(text, uuid, uuid) to authenticated;

-- ============================================================================
-- 5. Use grants and RLS together. These policies protect direct Supabase
--    clients. Server-side service-role clients still bypass RLS, so the route
--    guard implementation listed in the companion plan is mandatory.
-- ============================================================================
alter table public.approved_contact_directory enable row level security;
alter table public.role_room_messages enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;

-- Direct clients never receive raw people-directory, governance, delegation,
-- approval, or audit data. The protected server APIs return purpose-limited
-- DTOs after checking `hmsi_auth.has_capability(...)`.
revoke all on table public.approved_contact_directory from anon, authenticated;
revoke all on table public.organization_roles from anon, authenticated;
revoke all on table public.role_capability_grants from anon, authenticated;
revoke all on table public.authority_delegations from anon, authenticated;
revoke all on table public.approval_policies from anon, authenticated;
revoke all on table public.approval_requests from anon, authenticated;
revoke all on table public.approval_events from anon, authenticated;
revoke all on table public.authorization_audit_events from anon, authenticated;

-- Role-room messages: direct authenticated users can read only their own
-- active role room. President/Operations Administrator access is supplied by
-- the `rooms.read_all` capability; no direct client receives write access.
revoke all on table public.role_room_messages from anon, authenticated;
grant select on table public.role_room_messages to authenticated;

drop policy if exists "HMSI role or executive can view role-room messages" on public.role_room_messages;
create policy "HMSI role or executive can view role-room messages"
  on public.role_room_messages
  for select
  to authenticated
  using (
    (select hmsi_auth.has_capability('rooms.read_all', null, null))
    or (select hmsi_auth.has_portal_role(room_role))
  );

-- Community rooms previously included broad direct-client public policies.
-- Preserve public visibility only for explicitly published `all` audience
-- content. Role room content is visible to the matching approved role, while
-- President/Operations Administrator can view all moderation states.
revoke all on table public.community_posts from anon, authenticated;
revoke all on table public.community_comments from anon, authenticated;
revoke all on table public.community_likes from anon, authenticated;
grant select on table public.community_posts, public.community_comments, public.community_likes to anon, authenticated;

drop policy if exists "Public can view collaboration posts" on public.community_posts;
drop policy if exists "Public can create collaboration posts" on public.community_posts;
drop policy if exists "Public can view collaboration comments" on public.community_comments;
drop policy if exists "Public can create collaboration comments" on public.community_comments;
drop policy if exists "Public can view collaboration likes" on public.community_likes;
drop policy if exists "Public can create collaboration likes" on public.community_likes;
drop policy if exists "Public can remove collaboration likes" on public.community_likes;

drop policy if exists "HMSI public can view published all-audience posts" on public.community_posts;
create policy "HMSI public can view published all-audience posts"
  on public.community_posts
  for select
  to anon
  using (audience = 'all' and moderation_status = 'published');

drop policy if exists "HMSI authenticated roles or executives can view community posts" on public.community_posts;
create policy "HMSI authenticated roles or executives can view community posts"
  on public.community_posts
  for select
  to authenticated
  using (
    (select hmsi_auth.has_capability('rooms.read_all', null, null))
    or (
      moderation_status = 'published'
      and (audience = 'all' or (select hmsi_auth.has_portal_role(audience)))
    )
  );

drop policy if exists "HMSI public can view comments on published all-audience posts" on public.community_comments;
create policy "HMSI public can view comments on published all-audience posts"
  on public.community_comments
  for select
  to anon
  using (
    moderation_status = 'published'
    and exists (
      select 1
      from public.community_posts as post
      where post.id = community_comments.post_id
        and post.audience = 'all'
        and post.moderation_status = 'published'
    )
  );

drop policy if exists "HMSI authenticated roles or executives can view community comments" on public.community_comments;
create policy "HMSI authenticated roles or executives can view community comments"
  on public.community_comments
  for select
  to authenticated
  using (
    (select hmsi_auth.has_capability('rooms.read_all', null, null))
    or (
      moderation_status = 'published'
      and exists (
      select 1
      from public.community_posts as post
      where post.id = community_comments.post_id
        and post.moderation_status = 'published'
        and (post.audience = 'all' or (select hmsi_auth.has_portal_role(post.audience)))
      )
    )
  );

drop policy if exists "HMSI public can view likes on published all-audience posts" on public.community_likes;
create policy "HMSI public can view likes on published all-audience posts"
  on public.community_likes
  for select
  to anon
  using (
    exists (
      select 1
      from public.community_posts as post
      where post.id = community_likes.post_id
        and post.audience = 'all'
        and post.moderation_status = 'published'
    )
  );

drop policy if exists "HMSI authenticated roles or executives can view community likes" on public.community_likes;
create policy "HMSI authenticated roles or executives can view community likes"
  on public.community_likes
  for select
  to authenticated
  using (
    (select hmsi_auth.has_capability('rooms.read_all', null, null))
    or exists (
      select 1
      from public.community_posts as post
      where post.id = community_likes.post_id
        and post.moderation_status = 'published'
        and (post.audience = 'all' or (select hmsi_auth.has_portal_role(post.audience)))
    )
  );

-- No direct INSERT/UPDATE/DELETE policy is intentionally supplied for room
-- tables. Existing protected route handlers remain the only write path, where
-- they validate anti-spam rules, same-origin requests, message size, and actor.

-- ============================================================================
-- 6. Capability catalogue. Role assignment itself remains a separately
--    approved, individually identified operation. No records are inserted into
--    organization_roles here.
-- ============================================================================
create table if not exists public.role_capability_templates (
  role text not null,
  capability text not null,
  primary key (role, capability),
  check (role in (
    'president', 'operations_admin', 'finance_admin', 'editorial_admin',
    'people_safeguarding_admin', 'branch_coordinator', 'programme_lead',
    'finance_reviewer', 'compliance_reviewer', 'read_only_auditor'
  ))
);

insert into public.role_capability_templates (role, capability)
values
  -- President: full executive visibility across approved people and rooms,
  -- with high-risk mutations governed by approval_policies rather than bypass.
  ('president', 'executive.dashboard.read'),
  ('president', 'people.directory.read_all'),
  ('president', 'people.records.read_all'),
  ('president', 'rooms.read_all'),
  ('president', 'rooms.moderate'),
  ('president', 'assignments.read_all'),
  ('president', 'assignments.manage'),
  ('president', 'tasks.review'),
  ('president', 'governance.read'),
  ('president', 'governance.manage'),
  ('president', 'governance.roles.manage'),
  ('president', 'governance.approvals.request'),
  ('president', 'governance.approvals.decide'),
  ('president', 'finance.dashboard.read'),
  ('president', 'finance.reconciliation.prepare'),
  ('president', 'editorial.manage'),
  ('president', 'safeguarding.review'),
  ('president', 'audit.read'),
  -- Operations Administrator: comprehensive people, assignment, and room
  -- operations without finance-finalization or role-elevation bypass.
  ('operations_admin', 'people.directory.read_all'),
  ('operations_admin', 'people.records.read_all'),
  ('operations_admin', 'rooms.read_all'),
  ('operations_admin', 'rooms.moderate'),
  ('operations_admin', 'assignments.read_all'),
  ('operations_admin', 'assignments.manage'),
  ('operations_admin', 'tasks.review'),
  ('operations_admin', 'governance.read'),
  ('operations_admin', 'governance.approvals.request'),
  ('operations_admin', 'editorial.manage'),
  -- Finance Administrator: sees financial dashboards and prepares records;
  -- cannot apply reconciliation without the separate approval policy.
  ('finance_admin', 'finance.dashboard.read'),
  ('finance_admin', 'finance.reconciliation.prepare'),
  ('finance_admin', 'governance.read'),
  ('finance_admin', 'audit.read'),
  -- Editorial, people/safeguarding, and audit roles are intentionally narrow.
  ('editorial_admin', 'editorial.manage'),
  ('editorial_admin', 'rooms.read_all'),
  ('editorial_admin', 'rooms.moderate'),
  ('people_safeguarding_admin', 'people.directory.read_all'),
  ('people_safeguarding_admin', 'people.records.read_all'),
  ('people_safeguarding_admin', 'safeguarding.review'),
  ('people_safeguarding_admin', 'tasks.review'),
  ('read_only_auditor', 'governance.read'),
  ('read_only_auditor', 'audit.read')
on conflict do nothing;

alter table public.role_capability_templates enable row level security;
revoke all on table public.role_capability_templates from anon, authenticated;

-- ============================================================================
-- 7. Read-only validation queries. Review output during the dry run.
-- ============================================================================
select
  table_name,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and table_name in (
    'approved_contact_directory',
    'organization_roles',
    'role_capability_grants',
    'authority_delegations',
    'approval_policies',
    'approval_requests',
    'approval_events',
    'authorization_audit_events',
    'role_room_messages',
    'community_posts',
    'community_comments',
    'community_likes'
  )
order by table_name;

select
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('role_room_messages', 'community_posts', 'community_comments', 'community_likes')
order by tablename, policyname;

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'approved_contact_directory',
    'organization_roles',
    'role_capability_grants',
    'authority_delegations',
    'approval_policies',
    'approval_requests',
    'approval_events',
    'authorization_audit_events',
    'role_room_messages',
    'community_posts',
    'community_comments',
    'community_likes'
  )
order by table_name, grantee, privilege_type;

-- ============================================================================
-- 8. Post-staging, manually approved role-seed template (INTENTIONALLY
--    COMMENTED OUT). Execute only through a protected server action or a
--    controlled SQL session after confirming exact Auth user IDs and approval
--    request IDs. Do not seed by email alone.
-- ============================================================================
-- with approved_identity as (
--   select id, lower(email) as email
--   from auth.users
--   where id = '<APPROVED-PRESIDENT-AUTH-USER-ID>'::uuid
-- ), inserted_role as (
--   insert into public.organization_roles (
--     principal_email, auth_user_id, role, status, assigned_by,
--     assigned_by_auth_user_id, notes
--   )
--   select email, id, 'president', 'active', '<APPROVER-DISPLAY-EMAIL>',
--          '<APPROVER-AUTH-USER-ID>'::uuid,
--          'Approved executive role; see approval request <APPROVAL-REQUEST-ID>'
--   from approved_identity
--   returning id
-- )
-- insert into public.role_capability_grants (
--   organization_role_id, capability, granted_by_auth_user_id, reason
-- )
-- select inserted_role.id, template.capability,
--        '<APPROVER-AUTH-USER-ID>'::uuid,
--        'Approved role template; see approval request <APPROVAL-REQUEST-ID>'
-- from inserted_role
-- join public.role_capability_templates as template on template.role = 'president';

-- DRY RUN ONLY. Change to COMMIT only after all companion-plan staging gates are
-- met and a database owner has approved the exact production execution window.
rollback;
