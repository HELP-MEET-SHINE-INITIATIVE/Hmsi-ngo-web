-- HMSI moderated publisher-dispatch workflow.
-- Apply through the Supabase migration workflow before deploying the matching routes.

alter table public.news_articles
  add column if not exists body_format varchar(40) not null default 'plain_text',
  add column if not exists media_drive_url text,
  add column if not exists revision_feedback text,
  add column if not exists revision_requested_at timestamptz;

alter table public.news_articles
  drop constraint if exists news_articles_status_check;

alter table public.news_articles
  add constraint news_articles_status_check
  check (status in ('draft', 'pending_admin_approval', 'pending_editorial_review', 'revision_requested', 'approved', 'rejected', 'published', 'archived'));

alter table public.news_approval_events
  drop constraint if exists news_approval_events_action_check;

alter table public.news_approval_events
  add constraint news_approval_events_action_check
  check (action in ('submitted', 'resubmitted', 'approved', 'revision_requested', 'rejected', 'published', 'saved_draft', 'edited', 'archived'));

create index if not exists news_articles_contributor_revision_idx
  on public.news_articles (author_email, publisher_role, status, created_at desc);

drop index if exists public.news_articles_scheduled_archive_idx;
create index news_articles_scheduled_archive_idx
  on public.news_articles (scheduled_archive_at)
  where status in ('draft', 'pending_admin_approval', 'pending_editorial_review', 'revision_requested', 'approved', 'rejected');

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
