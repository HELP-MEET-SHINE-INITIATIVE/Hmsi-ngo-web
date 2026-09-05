-- HMSI volunteer task assignment and proof submission reference migration.
-- Review column names against the deployed schema before applying.
-- Apply through the approved Supabase migration path; do not run ad hoc in production.

create extension if not exists pgcrypto;

create table if not exists public.volunteer_assignments (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteer_applications(id) on delete restrict,
  source_article_id uuid references public.news_articles(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  description text not null check (char_length(description) between 1 and 12000),
  required_outcome text not null check (char_length(required_outcome) between 1 and 4000),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'assigned' check (status in ('assigned','accepted','in_progress','submitted','completed','needs_revision','rejected','cancelled')),
  due_at timestamptz,
  proof_required boolean not null default false,
  completion_note text check (completion_note is null or char_length(completion_note) <= 4000),
  assigned_by text not null check (char_length(assigned_by) between 3 and 320),
  accepted_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by text,
  recovery_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (not is_deleted or deleted_at is not null),
  check (not is_deleted or deleted_by is not null),
  check (not is_deleted or recovery_until is not null),
  check (completed_at is null or status = 'completed'),
  check (submitted_at is null or status in ('submitted','completed','needs_revision','rejected')),
  check (accepted_at is null or status in ('accepted','in_progress','submitted','completed','needs_revision','rejected','cancelled'))
);

create index if not exists volunteer_assignments_active_feed_idx
  on public.volunteer_assignments (volunteer_id, status, due_at)
  where is_deleted = false;
create index if not exists volunteer_assignments_source_idx
  on public.volunteer_assignments (source_article_id)
  where is_deleted = false;
create index if not exists volunteer_assignments_recovery_idx
  on public.volunteer_assignments (recovery_until)
  where is_deleted = true;

create table if not exists public.volunteer_task_proofs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.volunteer_assignments(id) on delete cascade,
  submitted_by uuid not null references public.volunteer_applications(id) on delete restrict,
  drive_url text not null check (drive_url ~* '^https://(drive|docs)\\.google\\.com/'),
  note text check (note is null or char_length(note) <= 2000),
  status text not null default 'pending_review' check (status in ('pending_review','accepted','needs_revision','link_cleared')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists volunteer_task_proofs_owner_idx
  on public.volunteer_task_proofs (submitted_by, created_at desc);
create index if not exists volunteer_task_proofs_assignment_idx
  on public.volunteer_task_proofs (assignment_id, created_at desc);

create table if not exists public.volunteer_task_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.volunteer_assignments(id) on delete restrict,
  actor_auth_user_id uuid,
  actor_email text,
  actor_role text not null check (actor_role in ('volunteer','admin','system')),
  action text not null check (action in ('created','accepted','started','proof_submitted','completed','needs_revision','rejected','cancelled','reassigned','soft_deleted','restored','notification_queued','notification_result')),
  from_status text,
  to_status text,
  detail text check (detail is null or char_length(detail) <= 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists volunteer_task_events_assignment_idx
  on public.volunteer_task_events (assignment_id, created_at desc);

create table if not exists public.volunteer_assignment_idempotency (
  actor_key text not null check (char_length(actor_key) between 3 and 320),
  request_key text not null check (request_key ~ '^[A-Za-z0-9._:-]{16,128}$'),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  assignment_id uuid references public.volunteer_assignments(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  primary key (actor_key, request_key)
);

alter table public.volunteer_assignments enable row level security;
alter table public.volunteer_task_proofs enable row level security;
alter table public.volunteer_task_events enable row level security;
alter table public.volunteer_assignment_idempotency enable row level security;

-- These policies intentionally use authenticated identity mapping functions.
-- Deploy the helper functions with SECURITY DEFINER only after reviewing their
-- search_path and ownership. The server still performs application-layer checks.
create or replace function public.current_volunteer_application_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select va.id
  from public.volunteer_applications va
  where va.auth_user_id = auth.uid()
    and lower(va.email) = lower(coalesce(auth.jwt() ->> 'email',''))
    and va.status = 'approved'
    and va.account_status = 'active'
    and va.applicant_role = 'volunteer'
    and coalesce(va.is_deleted, false) = false
  limit 1
$$;

create or replace function public.is_hmsi_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'hmsi_role') = 'admin', false)
$$;

revoke all on function public.current_volunteer_application_id() from public;
revoke all on function public.is_hmsi_admin() from public;
grant execute on function public.current_volunteer_application_id() to authenticated;
grant execute on function public.is_hmsi_admin() to authenticated;

-- Volunteers can read only their own non-deleted assignments. They cannot insert,
-- delete, reassign, alter ownership, or edit administrator-owned fields through RLS.
drop policy if exists volunteer_assignments_owner_select on public.volunteer_assignments;
create policy volunteer_assignments_owner_select
on public.volunteer_assignments for select to authenticated
using (
  is_deleted = false
  and volunteer_id = public.current_volunteer_application_id()
);

drop policy if exists volunteer_assignments_admin_select on public.volunteer_assignments;
create policy volunteer_assignments_admin_select
on public.volunteer_assignments for select to authenticated
using (public.is_hmsi_admin());

-- Server routes use the service client only after independent identity checks.
-- No direct volunteer INSERT/UPDATE/DELETE policies are granted here.

-- Volunteers can read only their own proofs; administrators can read proofs for review.
drop policy if exists volunteer_task_proofs_owner_select on public.volunteer_task_proofs;
create policy volunteer_task_proofs_owner_select
on public.volunteer_task_proofs for select to authenticated
using (submitted_by = public.current_volunteer_application_id());

drop policy if exists volunteer_task_proofs_admin_select on public.volunteer_task_proofs;
create policy volunteer_task_proofs_admin_select
on public.volunteer_task_proofs for select to authenticated
using (public.is_hmsi_admin());

-- Proof INSERT is intentionally absent. The protected server route validates URL,
-- assignment ownership, status, and note length before using the service client.

-- Events are append-only from the application’s trusted server path. No public
-- authenticated SELECT is granted because events may contain operational context.
revoke all on public.volunteer_task_events from anon, authenticated;
revoke all on public.volunteer_assignment_idempotency from anon, authenticated;

-- Keep the updated timestamp server-owned.
create or replace function public.touch_volunteer_assignment_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists volunteer_assignments_touch_updated_at on public.volunteer_assignments;
create trigger volunteer_assignments_touch_updated_at
before update on public.volunteer_assignments
for each row execute function public.touch_volunteer_assignment_updated_at();

comment on table public.volunteer_assignments is 'Private volunteer assignments. Active feed excludes soft-deleted rows.';
comment on table public.volunteer_task_proofs is 'Private proof metadata. Drive links are never public.';
comment on table public.volunteer_task_events is 'Append-only assignment audit events with bounded, scrubbed detail.';
comment on table public.volunteer_assignment_idempotency is 'Server-side deduplication for administrator assignment creation.';
