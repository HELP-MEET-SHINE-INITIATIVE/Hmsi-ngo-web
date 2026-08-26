-- HMSI volunteer assignment workflow.
-- Additive only: no existing worker, volunteer, or proof records are removed.
-- Server-side routes use the service-role client after independent portal/admin checks.

create table if not exists public.volunteer_assignments (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null check (char_length(btrim(title)) between 3 and 200),
  description text not null check (char_length(btrim(description)) between 10 and 12000),
  category text not null default 'community_outreach' check (category in ('community_outreach', 'field_verification', 'ground_assistance', 'digital_advocacy', 'training_support', 'other')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'submitted', 'completed', 'revisions_requested', 'rejected', 'cancelled')),
  assigned_volunteer_id uuid not null references public.volunteer_applications(id) on delete restrict,
  assigned_by text not null,
  due_at timestamptz,
  proof_required boolean not null default false,
  completion_note text,
  admin_note text,
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  completed_at timestamptz,
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'not_configured', 'failed')),
  notification_message_id text,
  notification_sent_at timestamptz,
  notification_error text,
  idempotency_key text unique,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by text,
  recovery_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.volunteer_assignment_proofs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.volunteer_assignments(id) on delete restrict,
  submitted_by_volunteer_id uuid not null references public.volunteer_applications(id) on delete restrict,
  proof_url text not null check (proof_url ~ '^https://(drive\.google\.com|docs\.google\.com)/'),
  note text,
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'needs_revision', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.volunteer_assignment_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.volunteer_assignments(id) on delete restrict,
  actor_role text not null check (actor_role in ('admin', 'volunteer', 'system')),
  actor_key text not null,
  action text not null check (action in ('created', 'notified', 'notification_failed', 'accepted', 'started', 'proof_submitted', 'submitted', 'completed', 'revisions_requested', 'rejected', 'cancelled', 'deleted', 'restored', 'proof_accepted', 'proof_revision_requested', 'proof_rejected')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists volunteer_assignments_active_assignee_idx
  on public.volunteer_assignments (assigned_volunteer_id, status, due_at, created_at desc)
  where is_deleted = false;
create index if not exists volunteer_assignments_admin_register_idx
  on public.volunteer_assignments (is_deleted, status, priority, due_at, created_at desc);
create index if not exists volunteer_assignment_proofs_assignment_idx
  on public.volunteer_assignment_proofs (assignment_id, created_at desc);
create index if not exists volunteer_assignment_events_assignment_idx
  on public.volunteer_assignment_events (assignment_id, created_at desc);

alter table public.volunteer_assignments enable row level security;
alter table public.volunteer_assignment_proofs enable row level security;
alter table public.volunteer_assignment_events enable row level security;

-- Volunteers can read only their own active task metadata. Direct browser writes
-- are intentionally disallowed; protected server routes validate transitions,
-- URL policy, audit writes, idempotency, and account eligibility first.
drop policy if exists "Volunteer can view own active assignments" on public.volunteer_assignments;
create policy "Volunteer can view own active assignments"
  on public.volunteer_assignments for select to authenticated
  using (
    is_deleted = false
    and exists (
      select 1 from public.volunteer_applications as volunteer
      where volunteer.id = volunteer_assignments.assigned_volunteer_id
        and volunteer.auth_user_id = auth.uid()
        and volunteer.status = 'approved'
        and volunteer.account_status = 'active'
        and volunteer.applicant_role = 'volunteer'
    )
  );

drop policy if exists "Volunteer can view own assignment proofs" on public.volunteer_assignment_proofs;
create policy "Volunteer can view own assignment proofs"
  on public.volunteer_assignment_proofs for select to authenticated
  using (
    exists (
      select 1 from public.volunteer_applications as volunteer
      where volunteer.id = volunteer_assignment_proofs.submitted_by_volunteer_id
        and volunteer.auth_user_id = auth.uid()
        and volunteer.status = 'approved'
        and volunteer.account_status = 'active'
        and volunteer.applicant_role = 'volunteer'
    )
  );

-- No direct policy is granted for assignment/event/proof inserts, updates, or
-- deletes. The server's service-role client bypasses RLS only after the route
-- verifies the signed portal/admin identity and records an audit event.
