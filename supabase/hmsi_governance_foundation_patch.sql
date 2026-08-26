begin;

-- Harden every function flagged for a mutable resolution path. The functions are
-- existing zero-argument trigger helpers verified before this migration.
alter function public.touch_featured_story_updated_at() set search_path = pg_catalog, public;
alter function public.touch_news_article_updated_at() set search_path = pg_catalog, public;
alter function public.set_news_article_archive_deadline() set search_path = pg_catalog, public;
alter function public.set_external_drive_submission_updated_at() set search_path = pg_catalog, public;
alter function public.touch_outreach_gallery_image_updated_at() set search_path = pg_catalog, public;

-- This SECURITY DEFINER helper is a schema-maintenance capability, not a browser
-- capability. Remove broad public execution; migrations retain owner execution.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create table if not exists public.operational_units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{2,40}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  unit_type text not null check (unit_type in ('national', 'branch', 'regional_office', 'programme')),
  parent_unit_id uuid references public.operational_units(id) on delete set null,
  state text,
  country text not null default 'Nigeria',
  coordinator_email text,
  safeguarding_email text,
  finance_email text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'archived')),
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{2,40}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text,
  lead_email text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'closed', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  principal_email text not null check (principal_email = lower(principal_email)),
  role text not null check (role in ('president', 'operations_admin', 'branch_coordinator', 'programme_lead', 'finance_reviewer', 'compliance_reviewer')),
  operational_unit_id uuid references public.operational_units(id) on delete restrict,
  programme_id uuid references public.programmes(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  assigned_by text not null,
  assigned_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  notes text
);

create table if not exists public.authority_delegations (
  id uuid primary key default gen_random_uuid(),
  delegated_by text not null check (delegated_by = lower(delegated_by)),
  delegate_email text not null check (delegate_email = lower(delegate_email)),
  authority_scope text not null check (authority_scope in ('people_approval', 'task_review', 'branch_operations', 'programme_operations', 'finance_review', 'compliance_review')),
  operational_unit_id uuid references public.operational_units(id) on delete restrict,
  programme_id uuid references public.programmes(id) on delete restrict,
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  revoked_at timestamptz,
  revoked_by text,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('governance', 'branch_activation', 'programme_activation', 'delegation', 'finance_exception', 'safeguarding_exception', 'retention_exception')),
  title text not null check (char_length(trim(title)) between 3 and 200),
  summary text not null check (char_length(trim(summary)) between 3 and 5000),
  operational_unit_id uuid references public.operational_units(id) on delete set null,
  programme_id uuid references public.programmes(id) on delete set null,
  requested_by text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.approval_events (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  actor_email text not null,
  action text not null check (action in ('created', 'approved', 'rejected', 'cancelled', 'commented')),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null check (workflow_key in ('onboarding_readiness', 'approval_queue', 'notification_reconciliation', 'branch_data_quality')),
  mode text not null default 'dry_run' check (mode in ('dry_run', 'scheduled', 'manual')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'skipped')),
  triggered_by text not null,
  idempotency_key text not null unique,
  summary jsonb not null default '{}'::jsonb,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.operational_units enable row level security;
alter table public.programmes enable row level security;
alter table public.organization_roles enable row level security;
alter table public.authority_delegations enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_events enable row level security;
alter table public.automation_runs enable row level security;

alter table public.workers add column if not exists operational_unit_id uuid references public.operational_units(id) on delete set null;
alter table public.workers add column if not exists programme_id uuid references public.programmes(id) on delete set null;
alter table public.volunteer_applications add column if not exists operational_unit_id uuid references public.operational_units(id) on delete set null;
alter table public.volunteer_applications add column if not exists programme_id uuid references public.programmes(id) on delete set null;
alter table public.hmsi_members add column if not exists operational_unit_id uuid references public.operational_units(id) on delete set null;
alter table public.hmsi_members add column if not exists programme_id uuid references public.programmes(id) on delete set null;
alter table public.work_assignments add column if not exists operational_unit_id uuid references public.operational_units(id) on delete set null;
alter table public.work_assignments add column if not exists programme_id uuid references public.programmes(id) on delete set null;
alter table public.volunteer_assignments add column if not exists operational_unit_id uuid references public.operational_units(id) on delete set null;
alter table public.volunteer_assignments add column if not exists programme_id uuid references public.programmes(id) on delete set null;
alter table public.hmsi_member_tasks add column if not exists operational_unit_id uuid references public.operational_units(id) on delete set null;
alter table public.hmsi_member_tasks add column if not exists programme_id uuid references public.programmes(id) on delete set null;
alter table public.opportunities add column if not exists operational_unit_id uuid references public.operational_units(id) on delete set null;
alter table public.opportunities add column if not exists programme_id uuid references public.programmes(id) on delete set null;

alter table public.hmsi_members add column if not exists onboarding_status text not null default 'not_started';
alter table public.hmsi_members add column if not exists onboarding_invited_at timestamptz;
alter table public.hmsi_members add column if not exists onboarded_at timestamptz;
alter table public.hmsi_members drop constraint if exists hmsi_members_onboarding_status_check;
alter table public.hmsi_members add constraint hmsi_members_onboarding_status_check check (onboarding_status in ('not_started', 'invited', 'in_progress', 'completed'));

alter table public.onboarding_invitations alter column volunteer_application_id drop not null;
alter table public.onboarding_invitations add column if not exists member_id uuid references public.hmsi_members(id) on delete set null;
alter table public.onboarding_invitations drop constraint if exists onboarding_invitations_role_check;
alter table public.onboarding_invitations add constraint onboarding_invitations_role_check check (role in ('worker', 'volunteer', 'member'));
alter table public.onboarding_invitations drop constraint if exists onboarding_invitations_subject_check;
alter table public.onboarding_invitations add constraint onboarding_invitations_subject_check check (worker_id is not null or volunteer_application_id is not null or member_id is not null);

alter table public.onboarding_tasks drop constraint if exists onboarding_tasks_role_check;
alter table public.onboarding_tasks add constraint onboarding_tasks_role_check check (role in ('all', 'worker', 'volunteer', 'member'));
insert into public.onboarding_tasks (role, title, description, sort_order, is_active)
select 'member', 'Review HMSI member responsibilities', 'Review the HMSI member code of conduct, safeguarding expectations, and the protected portal workspace before activating your account.', 900, true
where not exists (select 1 from public.onboarding_tasks where role = 'member' and title = 'Review HMSI member responsibilities');

alter table public.hmsi_member_tasks add column if not exists submitted_at timestamptz;
alter table public.hmsi_member_tasks add column if not exists reviewed_at timestamptz;
alter table public.hmsi_member_tasks add column if not exists reviewed_by text;
alter table public.hmsi_member_tasks add column if not exists review_note text;
alter table public.hmsi_member_tasks add column if not exists is_deleted boolean not null default false;
alter table public.hmsi_member_tasks add column if not exists deleted_at timestamptz;
alter table public.hmsi_member_tasks add column if not exists deleted_by text;
alter table public.hmsi_member_tasks add column if not exists recovery_until timestamptz;

create index if not exists operational_units_status_idx on public.operational_units(status, unit_type);
create index if not exists programmes_status_idx on public.programmes(status);
create index if not exists organization_roles_principal_idx on public.organization_roles(principal_email, status);
create index if not exists authority_delegations_active_idx on public.authority_delegations(delegate_email, status, starts_at, ends_at);
create index if not exists approval_requests_status_idx on public.approval_requests(status, created_at desc);
create index if not exists automation_runs_workflow_idx on public.automation_runs(workflow_key, created_at desc);
create index if not exists members_onboarding_status_idx on public.hmsi_members(onboarding_status, status);

commit;
