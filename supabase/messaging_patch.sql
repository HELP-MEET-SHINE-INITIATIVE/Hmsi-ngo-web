-- HMSI contact messaging and notification migration
-- Run this in Supabase SQL Editor after the original schema.

create table if not exists public.contact_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  author_name varchar(160) not null,
  author_email varchar(320),
  author_role text not null check (author_role in ('admin', 'worker')),
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_message_notifications (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  recipient_email varchar(320) not null,
  recipient_role text not null check (recipient_role in ('admin', 'worker')),
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  unique (message_id, recipient_email)
);

create index if not exists contact_message_replies_message_created_idx
  on public.contact_message_replies (message_id, created_at);
create index if not exists contact_message_notifications_recipient_read_idx
  on public.contact_message_notifications (recipient_email, is_read, created_at desc);

alter table public.contact_message_replies enable row level security;
alter table public.contact_message_notifications enable row level security;

drop policy if exists "Service role can manage contact replies" on public.contact_message_replies;
create policy "Service role can manage contact replies"
  on public.contact_message_replies for all to service_role
  using (true) with check (true);

drop policy if exists "Service role can manage contact notifications" on public.contact_message_notifications;
create policy "Service role can manage contact notifications"
  on public.contact_message_notifications for all to service_role
  using (true) with check (true);
