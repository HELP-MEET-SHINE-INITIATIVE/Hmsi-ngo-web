-- HMSI featured-story workflow patch
-- Run this in Supabase SQL Editor for an existing HMSI project.

create extension if not exists pgcrypto;

create table if not exists public.featured_story_drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null,
  body text not null,
  category text not null default 'HMSI field story',
  image_url text,
  author_name text not null,
  author_email text not null,
  author_role text not null check (author_role in ('admin', 'worker', 'volunteer')),
  status text not null default 'pending_admin_approval' check (status in ('draft', 'pending_admin_approval', 'approved', 'rejected', 'published')),
  rejection_reason text,
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.featured_story_approval_events (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.featured_story_drafts(id) on delete cascade,
  action text not null check (action in ('submitted', 'approved', 'rejected', 'published', 'deleted')),
  actor_email text not null,
  actor_role text not null check (actor_role in ('admin', 'worker', 'volunteer')),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists featured_story_drafts_status_published_idx
  on public.featured_story_drafts (status, published_at desc);
create index if not exists featured_story_drafts_author_created_idx
  on public.featured_story_drafts (author_email, created_at desc);
create index if not exists featured_story_approval_events_story_created_idx
  on public.featured_story_approval_events (story_id, created_at desc);

alter table public.featured_story_drafts enable row level security;
alter table public.featured_story_approval_events enable row level security;

drop policy if exists "Service role can manage featured story drafts" on public.featured_story_drafts;
create policy "Service role can manage featured story drafts"
  on public.featured_story_drafts for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage featured story approval events" on public.featured_story_approval_events;
create policy "Service role can manage featured story approval events"
  on public.featured_story_approval_events for all to service_role using (true) with check (true);

create or replace function public.touch_featured_story_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists featured_story_drafts_updated_at on public.featured_story_drafts;
create trigger featured_story_drafts_updated_at
before update on public.featured_story_drafts
for each row execute function public.touch_featured_story_updated_at();
