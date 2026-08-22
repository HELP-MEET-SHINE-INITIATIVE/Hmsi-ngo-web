-- HMSI onboarding automation, worker permissions, and sponsored advertising requests
-- Apply in Supabase SQL Editor after the base HMSI schema.

alter table public.workers add column if not exists onboarding_status text not null default 'not_started' check (onboarding_status in ('not_started','invited','in_progress','completed'));
alter table public.workers add column if not exists onboarded_at timestamptz;
alter table public.workers add column if not exists ads_manager_enabled boolean not null default false;
alter table public.workers add column if not exists assignments_manager_enabled boolean not null default false;
alter table public.volunteer_applications add column if not exists onboarding_invited_at timestamptz;

create table if not exists public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('worker','volunteer','all')),
  title varchar(200) not null,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (role, title)
);

insert into public.onboarding_tasks (role, title, description, sort_order) values
  ('all', 'Read HMSI safeguarding and privacy commitments', 'Review the public safeguarding and privacy commitments before accessing operational rooms.', 10),
  ('all', 'Confirm respectful community conduct', 'Acknowledge that HMSI rooms require respectful communication, no harassment, and no sharing of private beneficiary information.', 20),
  ('worker', 'Review assignment and escalation workflow', 'Review how administrator-approved assignments are received, updated, and escalated.', 30),
  ('worker', 'Review media-safety response protocol', 'Review the 5-minute safe response protocol and designated routing for sensitive media inquiries.', 40),
  ('volunteer', 'Review volunteer room guidance', 'Review the volunteer-room participation and content-safety guidance.', 30)
on conflict (role, title) do update set description = excluded.description, sort_order = excluded.sort_order, is_active = true;

create table if not exists public.onboarding_invitations (
  id uuid primary key default gen_random_uuid(),
  volunteer_application_id uuid not null references public.volunteer_applications(id) on delete cascade,
  worker_id uuid references public.workers(id) on delete set null,
  email varchar(320) not null,
  role text not null check (role in ('worker','volunteer')),
  token_hash varchar(64) not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  last_sent_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists onboarding_invitations_email_idx on public.onboarding_invitations (email, created_at desc);
create index if not exists onboarding_invitations_expires_idx on public.onboarding_invitations (expires_at);

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.onboarding_invitations(id) on delete cascade,
  task_id uuid not null references public.onboarding_tasks(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','completed')),
  completed_at timestamptz,
  unique (invitation_id, task_id)
);
create index if not exists onboarding_progress_invitation_idx on public.onboarding_progress (invitation_id, status);

create table if not exists public.sponsorship_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name varchar(160) not null,
  requester_email varchar(320) not null,
  organisation_name varchar(200),
  title varchar(200) not null,
  description text not null,
  target_url text not null,
  creative_url text,
  budget_ngn numeric(14,2) not null check (budget_ngn >= 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid','active','expired')),
  admin_note text,
  payment_reference varchar(120) unique,
  reviewed_by varchar(320),
  reviewed_at timestamptz,
  paid_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists sponsorship_requests_status_created_idx on public.sponsorship_requests (status, created_at desc);

alter table public.onboarding_tasks enable row level security;
alter table public.onboarding_invitations enable row level security;
alter table public.onboarding_progress enable row level security;
alter table public.sponsorship_requests enable row level security;

drop policy if exists "Service role manages onboarding tasks" on public.onboarding_tasks;
create policy "Service role manages onboarding tasks" on public.onboarding_tasks for all to service_role using (true) with check (true);
drop policy if exists "Service role manages onboarding invitations" on public.onboarding_invitations;
create policy "Service role manages onboarding invitations" on public.onboarding_invitations for all to service_role using (true) with check (true);
drop policy if exists "Service role manages onboarding progress" on public.onboarding_progress;
create policy "Service role manages onboarding progress" on public.onboarding_progress for all to service_role using (true) with check (true);
drop policy if exists "Service role manages sponsorship requests" on public.sponsorship_requests;
create policy "Service role manages sponsorship requests" on public.sponsorship_requests for all to service_role using (true) with check (true);
