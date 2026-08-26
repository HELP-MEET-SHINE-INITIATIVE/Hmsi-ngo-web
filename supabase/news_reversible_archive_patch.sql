-- HMSI reversible news archive support.
-- Apply through the normal Supabase migration process before using the archive reset route.
-- No rows are deleted by this migration.

alter table public.news_articles
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text,
  add column if not exists scheduled_archive_at timestamptz;

alter table public.news_articles
  drop constraint if exists news_articles_status_check;

alter table public.news_articles
  add constraint news_articles_status_check
  check (status in ('draft', 'pending_admin_approval', 'pending_editorial_review', 'revision_requested', 'approved', 'rejected', 'published', 'archived'));

create index if not exists news_articles_archived_idx
  on public.news_articles (status, archived_at desc)
  where status = 'archived';

create index if not exists news_articles_public_published_idx
  on public.news_articles (published_at desc)
  where status = 'published';

alter table public.news_articles enable row level security;

-- Keep public access behind the server-side service-role API, which enforces
-- status = published for public readers and admin identity checks for writes.
