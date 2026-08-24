-- HMSI volunteer publisher-role and moderated news submission migration.
-- Publisher roles are capabilities within the approved volunteer pathway; they never grant direct publication.

alter table public.volunteer_applications
  add column if not exists publisher_role varchar(48);

alter table public.volunteer_applications drop constraint if exists volunteer_applications_publisher_role_check;
alter table public.volunteer_applications add constraint volunteer_applications_publisher_role_check
  check (publisher_role is null or publisher_role in ('community_publisher', 'humanitarian_activist', 'independent_field_reporter'));

create index if not exists volunteer_applications_publisher_role_idx
  on public.volunteer_applications (publisher_role, status, account_status)
  where publisher_role is not null;

alter table public.news_articles
  add column if not exists publisher_role varchar(48);

alter table public.news_articles drop constraint if exists news_articles_publisher_role_check;
alter table public.news_articles add constraint news_articles_publisher_role_check
  check (publisher_role is null or publisher_role in ('community_publisher', 'humanitarian_activist', 'independent_field_reporter'));

comment on column public.volunteer_applications.publisher_role is 'Optional moderated-content capability for approved active volunteers. Does not grant publication rights.';
comment on column public.news_articles.publisher_role is 'Publisher capability snapshot at submission. Every non-admin submission remains pending editorial approval.';
