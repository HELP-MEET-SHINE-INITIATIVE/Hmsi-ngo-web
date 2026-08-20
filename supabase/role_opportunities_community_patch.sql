-- HMSI role, opportunity, and community patch
-- Run this in the Supabase SQL Editor when the original schema is already installed.

alter table public.volunteer_applications
  add column if not exists applicant_role text not null default 'volunteer';

alter table public.volunteer_applications
  drop constraint if exists volunteer_applications_applicant_role_check;

alter table public.volunteer_applications
  add constraint volunteer_applications_applicant_role_check
  check (applicant_role in ('volunteer', 'worker'));

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null,
  description text not null,
  audience text not null default 'volunteer' check (audience in ('volunteer', 'worker', 'both')),
  location varchar(200) not null default 'Nigeria and Africa',
  image_url text,
  image_path text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'open' check (status in ('draft', 'open', 'closed')),
  created_by varchar(320),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.opportunities add column if not exists image_url text;
alter table public.opportunities add column if not exists image_path text;

create table if not exists public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  applicant_name varchar(160) not null,
  applicant_email varchar(320) not null,
  applicant_phone varchar(64) not null,
  applicant_role text not null check (applicant_role in ('volunteer', 'worker')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (opportunity_id, applicant_email)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  audience text not null default 'volunteer' check (audience in ('volunteer', 'worker', 'all')),
  author_name varchar(160) not null,
  author_role text not null check (author_role in ('volunteer', 'worker', 'admin')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_name varchar(160) not null,
  author_role text not null check (author_role in ('volunteer', 'worker', 'admin')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  actor_key varchar(320) not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, actor_key)
);

create index if not exists opportunities_status_starts_at_idx on public.opportunities (status, starts_at);
create index if not exists opportunity_applications_status_created_at_idx on public.opportunity_applications (status, created_at desc);
create index if not exists community_posts_audience_created_at_idx on public.community_posts (audience, created_at desc);
create index if not exists community_comments_post_created_at_idx on public.community_comments (post_id, created_at);
create index if not exists community_likes_post_idx on public.community_likes (post_id);

alter table public.opportunities enable row level security;
alter table public.opportunity_applications enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;

 drop policy if exists "Public can view open opportunities" on public.opportunities;
create policy "Public can view open opportunities" on public.opportunities for select using (status = 'open');

drop policy if exists "Public can submit opportunity applications" on public.opportunity_applications;
create policy "Public can submit opportunity applications" on public.opportunity_applications for insert with check (status = 'pending');

drop policy if exists "Public can view collaboration posts" on public.community_posts;
create policy "Public can view collaboration posts" on public.community_posts for select using (true);

drop policy if exists "Public can create collaboration posts" on public.community_posts;
create policy "Public can create collaboration posts" on public.community_posts for insert with check (audience in ('volunteer', 'worker', 'all'));

drop policy if exists "Public can view collaboration comments" on public.community_comments;
create policy "Public can view collaboration comments" on public.community_comments for select using (true);

drop policy if exists "Public can create collaboration comments" on public.community_comments;
create policy "Public can create collaboration comments" on public.community_comments for insert with check (true);

drop policy if exists "Public can view collaboration likes" on public.community_likes;
create policy "Public can view collaboration likes" on public.community_likes for select using (true);

drop policy if exists "Public can create collaboration likes" on public.community_likes;
create policy "Public can create collaboration likes" on public.community_likes for insert with check (true);

drop policy if exists "Public can remove collaboration likes" on public.community_likes;
create policy "Public can remove collaboration likes" on public.community_likes for delete using (true);
