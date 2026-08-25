-- HMSI 30-day retention, application archive, and role-room support.
-- The service role is the only application writer; RLS remains enabled for direct clients.

alter table public.workers add column if not exists removal_requested_at timestamptz;
alter table public.workers add column if not exists removal_purge_after timestamptz;
alter table public.volunteer_applications add column if not exists archived_at timestamptz;
alter table public.volunteer_applications add column if not exists removal_requested_at timestamptz;
alter table public.volunteer_applications add column if not exists removal_purge_after timestamptz;
alter table public.hmsi_member_applications add column if not exists archived_at timestamptz;
alter table public.hmsi_member_applications add column if not exists removal_requested_at timestamptz;
alter table public.hmsi_member_applications add column if not exists removal_purge_after timestamptz;
alter table public.hmsi_members add column if not exists removal_requested_at timestamptz;
alter table public.hmsi_members add column if not exists removal_purge_after timestamptz;
alter table public.opportunity_applications add column if not exists archived_at timestamptz;
alter table public.opportunity_applications add column if not exists removal_requested_at timestamptz;
alter table public.opportunity_applications add column if not exists removal_purge_after timestamptz;

create table if not exists public.archived_applications (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('volunteer_applications', 'hmsi_member_applications', 'opportunity_applications')),
  source_id uuid not null,
  status_at_archive text not null check (status_at_archive in ('approved', 'rejected')),
  snapshot jsonb not null,
  archived_at timestamptz not null default now(),
  purge_after timestamptz,
  purged_at timestamptz,
  unique (source_table, source_id)
);

create table if not exists public.user_removal_records (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('worker', 'volunteer', 'member')),
  subject_id uuid not null,
  auth_user_id uuid,
  subject_email text,
  requested_by text not null,
  requested_at timestamptz not null default now(),
  recovery_until timestamptz not null,
  reason text,
  state text not null default 'recoverable' check (state in ('recoverable', 'purged', 'failed')),
  purged_at timestamptz,
  failure_reason text,
  unique (subject_type, subject_id)
);

create table if not exists public.role_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_role text not null check (room_role in ('worker', 'volunteer', 'member')),
  author_auth_user_id uuid not null,
  author_name text not null,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists archived_applications_status_archived_idx on public.archived_applications(status_at_archive, archived_at desc);
create index if not exists archived_applications_purge_idx on public.archived_applications(purge_after) where purged_at is null;
create index if not exists user_removal_records_purge_idx on public.user_removal_records(recovery_until) where state = 'recoverable';
create index if not exists role_room_messages_room_created_idx on public.role_room_messages(room_role, created_at desc);

alter table public.archived_applications enable row level security;
alter table public.user_removal_records enable row level security;
alter table public.role_room_messages enable row level security;
