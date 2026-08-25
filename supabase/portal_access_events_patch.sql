-- Additive, append-only portal activity metadata for protected administrator history views.
-- All writes are performed by server-side service-role routes; no public policy is granted.
create table if not exists public.portal_access_events (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  event_type text not null check (event_type in ('onboarding_completed', 'hmsi_id_issued', 'password_created', 'password_reset_requested', 'assignment_created', 'assignment_status_changed')),
  actor_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists portal_access_events_worker_created_idx
  on public.portal_access_events(worker_id, created_at desc);

alter table public.portal_access_events enable row level security;
