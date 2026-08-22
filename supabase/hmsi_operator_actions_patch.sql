-- HMSI governed admin operator actions.
create table if not exists public.hmsi_operator_actions (
  id uuid primary key default gen_random_uuid(),
  manus_task_id varchar(160) not null unique,
  requested_by varchar(320) not null,
  action_type varchar(40) not null check (action_type in ('none', 'reply_email', 'newsletter', 'publication', 'volunteer_room_post', 'worker_room_post')),
  status varchar(32) not null default 'running' check (status in ('running', 'pending_confirmation', 'confirmed', 'executed', 'rejected', 'error')),
  prompt text not null,
  preview jsonb,
  result jsonb,
  error_message text,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 minutes'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz,
  executed_at timestamptz
);
create index if not exists hmsi_operator_actions_requester_idx on public.hmsi_operator_actions(requested_by, created_at desc);
create index if not exists hmsi_operator_actions_status_idx on public.hmsi_operator_actions(status, created_at desc);
alter table public.hmsi_operator_actions enable row level security;
drop policy if exists "Service role can manage operator actions" on public.hmsi_operator_actions;
create policy "Service role can manage operator actions" on public.hmsi_operator_actions for all to service_role using (true) with check (true);
