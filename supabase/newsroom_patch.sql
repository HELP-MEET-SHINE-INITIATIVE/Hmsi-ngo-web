-- HMSI newsroom patch
-- Run this in the Supabase SQL Editor for an existing HMSI project.

create extension if not exists pgcrypto;

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  headline varchar(220) not null,
  summary text not null,
  body text not null,
  category varchar(100) not null default 'HMSI news',
  image_url text,
  author_name varchar(160) not null,
  author_email varchar(320) not null,
  author_role text not null check (author_role in ('admin', 'worker', 'volunteer')),
  status text not null default 'pending_admin_approval' check (status in ('draft', 'pending_admin_approval', 'approved', 'rejected', 'published')),
  rejection_reason text,
  approved_by varchar(320),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.news_approval_events (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.news_articles(id) on delete cascade,
  action text not null check (action in ('submitted', 'approved', 'rejected', 'published')),
  actor_email varchar(320) not null,
  actor_role text not null check (actor_role in ('admin', 'worker', 'volunteer')),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists news_articles_status_published_idx on public.news_articles (status, published_at desc);
create index if not exists news_articles_created_idx on public.news_articles (created_at desc);
create index if not exists news_articles_author_created_idx on public.news_articles (author_email, created_at desc);
create index if not exists news_approval_events_news_created_idx on public.news_approval_events (news_id, created_at desc);

alter table public.news_articles enable row level security;
alter table public.news_approval_events enable row level security;

drop policy if exists "Service role can manage news articles" on public.news_articles;
create policy "Service role can manage news articles"
  on public.news_articles for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage news approval events" on public.news_approval_events;
create policy "Service role can manage news approval events"
  on public.news_approval_events for all to service_role using (true) with check (true);

create or replace function public.touch_news_article_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists news_articles_updated_at on public.news_articles;
create trigger news_articles_updated_at
before update on public.news_articles
for each row execute function public.touch_news_article_updated_at();
