-- HMSI people operations and President's Office patch.
-- Additive only. Apply before deploying the dependent API routes.

begin;

create table if not exists public.approved_contact_directory (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('volunteer', 'worker', 'member')),
  source_id uuid not null,
  name text not null,
  email text not null,
  notification_status text not null default 'ready' check (notification_status in ('ready', 'blocked', 'invalid', 'suppressed')),
  approved_at timestamptz not null default timezone('utc', now()),
  disabled_at timestamptz,
  last_notification_at timestamptz,
  last_notification_status text check (last_notification_status is null or last_notification_status in ('sent', 'delivered', 'failed', 'bounced', 'suppressed')),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (role, source_id)
);

create index if not exists approved_contact_directory_role_status_idx on public.approved_contact_directory (role, notification_status, approved_at desc);
create index if not exists approved_contact_directory_email_idx on public.approved_contact_directory (lower(email));

alter table public.approved_contact_directory enable row level security;

create table if not exists public.work_assignment_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.work_assignments(id) on delete cascade,
  actor_role text not null check (actor_role in ('worker', 'admin')),
  actor_key text not null,
  action text not null check (action in ('created', 'accepted', 'submitted', 'approved', 'revisions_requested', 'cancelled', 'deleted')),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists work_assignment_events_assignment_created_idx on public.work_assignment_events (assignment_id, created_at desc);

alter table public.work_assignment_events enable row level security;

alter table public.work_assignments
  add column if not exists completion_note text,
  add column if not exists review_note text,
  add column if not exists submitted_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

-- The live schema was verified to name the prior status rule
-- work_assignments_status_check. Do not search/drop arbitrary check constraints.
alter table public.work_assignments
  drop constraint if exists work_assignments_status_check;

alter table public.work_assignments
  add constraint work_assignments_status_check check (status in ('assigned', 'in_progress', 'submitted', 'completed', 'cancelled'));

insert into public.approved_contact_directory (role, source_id, name, email, notification_status, approved_at, updated_at)
select
  case when applicant_role = 'worker' then 'worker' else 'volunteer' end,
  id,
  name,
  lower(btrim(email)),
  case when btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then 'ready' else 'invalid' end,
  coalesce(reviewed_at, created_at, timezone('utc', now())),
  timezone('utc', now())
from public.volunteer_applications
where status = 'approved'
  and account_status = 'active'
  and removal_requested_at is null
  and btrim(coalesce(email, '')) <> ''
on conflict (role, source_id) do update
set name = excluded.name,
    email = excluded.email,
    notification_status = excluded.notification_status,
    disabled_at = null,
    updated_at = excluded.updated_at;

insert into public.approved_contact_directory (role, source_id, name, email, notification_status, approved_at, updated_at)
select
  'worker',
  id,
  name,
  lower(btrim(email)),
  case when btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then 'ready' else 'invalid' end,
  coalesce(onboarded_at, created_at, timezone('utc', now())),
  timezone('utc', now())
from public.workers
where status = 'active'
  and removal_requested_at is null
  and btrim(coalesce(email, '')) <> ''
on conflict (role, source_id) do update
set name = excluded.name,
    email = excluded.email,
    notification_status = excluded.notification_status,
    disabled_at = null,
    updated_at = excluded.updated_at;

insert into public.approved_contact_directory (role, source_id, name, email, notification_status, approved_at, updated_at)
select
  'member',
  id,
  name,
  lower(btrim(email)),
  case when btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then 'ready' else 'invalid' end,
  created_at,
  timezone('utc', now())
from public.hmsi_members
where status = 'active'
  and removal_requested_at is null
  and btrim(coalesce(email, '')) <> ''
on conflict (role, source_id) do update
set name = excluded.name,
    email = excluded.email,
    notification_status = excluded.notification_status,
    disabled_at = null,
    updated_at = excluded.updated_at;

commit;
