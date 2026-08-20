-- HMSI moderation and access-control patch for existing Supabase projects.
-- Run this once in the Supabase SQL Editor after the main schema.

alter table public.volunteer_applications
  add column if not exists account_status text not null default 'active';

alter table public.volunteer_applications
  drop constraint if exists volunteer_applications_account_status_check;

alter table public.volunteer_applications
  add constraint volunteer_applications_account_status_check
  check (account_status in ('active', 'banned'));

create table if not exists public.community_comment_flags (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_email varchar(320) not null,
  reporter_role text not null check (reporter_role in ('worker', 'admin')),
  reason varchar(500) not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  reviewed_by varchar(320),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (comment_id, reporter_email)
);

create index if not exists community_comment_flags_status_created_idx
  on public.community_comment_flags (status, created_at desc);

create index if not exists community_comment_flags_comment_idx
  on public.community_comment_flags (comment_id);

alter table public.community_comment_flags enable row level security;

drop policy if exists "Service role can manage community comment flags" on public.community_comment_flags;
create policy "Service role can manage community comment flags"
  on public.community_comment_flags for all to service_role using (true) with check (true);

-- All moderation mutations remain server-only through the admin/role-validated APIs.

-- After running this file, refresh /hmsi-control so the moderation queue appears.

