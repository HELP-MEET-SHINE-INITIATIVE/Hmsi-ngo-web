-- HMSI newsletter subscribers and role-based approval migration
-- Run this in Supabase SQL Editor after the original schema.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email varchar(320) not null unique,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  subscribed_at timestamptz not null default timezone('utc', now()),
  unsubscribed_at timestamptz
);

create table if not exists public.newsletter_drafts (
  id uuid primary key default gen_random_uuid(),
  title varchar(240) not null,
  subject varchar(240) not null,
  body text not null,
  author_name varchar(160) not null,
  author_email varchar(320) not null,
  author_role text not null check (author_role in ('admin', 'worker', 'volunteer')),
  status text not null default 'draft' check (status in ('draft', 'pending_worker_approval', 'pending_admin_approval', 'approved', 'rejected', 'sent')),
  worker_approved_by varchar(320),
  worker_approved_at timestamptz,
  admin_approved_by varchar(320),
  admin_approved_at timestamptz,
  rejection_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.newsletter_approval_events (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletter_drafts(id) on delete cascade,
  actor_name varchar(160) not null,
  actor_email varchar(320) not null,
  actor_role text not null check (actor_role in ('admin', 'worker', 'volunteer')),
  action text not null check (action in ('submitted', 'worker_approved', 'admin_approved', 'rejected', 'sent')),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.newsletter_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletter_drafts(id) on delete cascade,
  subscriber_email varchar(320) not null,
  provider text not null default 'resend',
  provider_message_id varchar(240),
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.newsletter_subscribers add column if not exists unsubscribe_token uuid;
update public.newsletter_subscribers set unsubscribe_token = gen_random_uuid() where unsubscribe_token is null;
alter table public.newsletter_subscribers alter column unsubscribe_token set default gen_random_uuid();
alter table public.newsletter_subscribers alter column unsubscribe_token set not null;
create unique index if not exists newsletter_subscribers_unsubscribe_token_idx on public.newsletter_subscribers (unsubscribe_token);

create index if not exists newsletter_drafts_status_created_idx
  on public.newsletter_drafts (status, created_at desc);
create index if not exists newsletter_approval_events_newsletter_created_idx
  on public.newsletter_approval_events (newsletter_id, created_at);
create index if not exists newsletter_delivery_logs_newsletter_created_idx
  on public.newsletter_delivery_logs (newsletter_id, created_at);

alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_drafts enable row level security;
alter table public.newsletter_approval_events enable row level security;
alter table public.newsletter_delivery_logs enable row level security;

drop policy if exists "Service role can manage newsletter subscribers" on public.newsletter_subscribers;
create policy "Service role can manage newsletter subscribers"
  on public.newsletter_subscribers for all to service_role
  using (true) with check (true);

drop policy if exists "Service role can manage newsletter drafts" on public.newsletter_drafts;
create policy "Service role can manage newsletter drafts"
  on public.newsletter_drafts for all to service_role
  using (true) with check (true);

drop policy if exists "Service role can manage newsletter approval events" on public.newsletter_approval_events;
create policy "Service role can manage newsletter approval events"
  on public.newsletter_approval_events for all to service_role
  using (true) with check (true);

drop policy if exists "Service role can manage newsletter delivery logs" on public.newsletter_delivery_logs;
create policy "Service role can manage newsletter delivery logs"
  on public.newsletter_delivery_logs for all to service_role
  using (true) with check (true);
