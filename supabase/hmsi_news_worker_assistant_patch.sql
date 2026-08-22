-- HMSI governed humanitarian-news research and restricted worker assistant.
-- Apply after newsroom_patch.sql and hmsi_assistant_patch.sql.

alter table public.news_articles
  add column if not exists source_name varchar(240),
  add column if not exists source_url text,
  add column if not exists source_urls text[] not null default '{}',
  add column if not exists source_published_at timestamptz,
  add column if not exists verification_status varchar(32) not null default 'not_reviewed',
  add column if not exists verification_notes text,
  add column if not exists verified_source_count integer not null default 0,
  add column if not exists research_task_id uuid,
  add column if not exists reviewed_at timestamptz;

alter table public.news_articles drop constraint if exists news_articles_verification_status_check;
alter table public.news_articles add constraint news_articles_verification_status_check
  check (verification_status in ('not_reviewed', 'candidate', 'source_checked', 'admin_verified'));

create index if not exists news_articles_verification_status_idx
  on public.news_articles (verification_status, status, created_at desc);

create table if not exists public.hmsi_news_research_tasks (
  id uuid primary key default gen_random_uuid(),
  manus_task_id varchar(160) not null unique,
  requested_by_email varchar(320) not null,
  scope varchar(500) not null,
  status varchar(32) not null default 'running' check (status in ('running', 'stopped', 'waiting', 'error')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists hmsi_news_research_tasks_created_idx
  on public.hmsi_news_research_tasks (created_at desc);

alter table public.hmsi_assistant_tasks
  add column if not exists actor_role varchar(32) not null default 'admin',
  add column if not exists worker_id uuid;

create index if not exists hmsi_assistant_tasks_worker_created_idx
  on public.hmsi_assistant_tasks (worker_id, created_at desc);

alter table public.hmsi_news_research_tasks enable row level security;
drop policy if exists "Service role can manage humanitarian research tasks" on public.hmsi_news_research_tasks;
create policy "Service role can manage humanitarian research tasks"
  on public.hmsi_news_research_tasks for all to service_role using (true) with check (true);
