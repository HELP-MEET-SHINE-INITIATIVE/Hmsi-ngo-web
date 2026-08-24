-- HMSI editorial review and retention patch.
-- Apply through the Supabase migration workflow before deploying the matching API routes.

alter table public.news_articles
  add column if not exists reviewed_by varchar(320),
  add column if not exists scheduled_archive_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text;

alter table public.news_articles
  drop constraint if exists news_articles_status_check;

alter table public.news_articles
  add constraint news_articles_status_check
  check (status in ('draft', 'pending_admin_approval', 'approved', 'rejected', 'published', 'archived'));

alter table public.news_approval_events
  drop constraint if exists news_approval_events_action_check;

alter table public.news_approval_events
  add constraint news_approval_events_action_check
  check (action in ('submitted', 'approved', 'rejected', 'published', 'saved_draft', 'edited', 'archived'));

create index if not exists news_articles_editorial_queue_idx
  on public.news_articles (status, created_at desc);

create index if not exists news_articles_scheduled_archive_idx
  on public.news_articles (scheduled_archive_at)
  where status in ('draft', 'pending_admin_approval', 'approved', 'rejected');

create or replace function public.set_news_article_archive_deadline()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      new.scheduled_archive_at := null;
    elsif new.status <> 'archived' and new.scheduled_archive_at is null then
      new.scheduled_archive_at := coalesce(new.created_at, timezone('utc', now())) + interval '10 days';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'published' then
      new.scheduled_archive_at := null;
    elsif new.status = 'archived' and old.status is distinct from 'archived' then
      new.archived_at := coalesce(new.archived_at, timezone('utc', now()));
      new.scheduled_archive_at := null;
    elsif old.status = 'published' and new.status <> 'published' and new.status <> 'archived' and new.scheduled_archive_at is null then
      new.scheduled_archive_at := timezone('utc', now()) + interval '10 days';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists news_articles_set_archive_deadline on public.news_articles;
create trigger news_articles_set_archive_deadline
before insert or update of status, scheduled_archive_at on public.news_articles
for each row execute function public.set_news_article_archive_deadline();

