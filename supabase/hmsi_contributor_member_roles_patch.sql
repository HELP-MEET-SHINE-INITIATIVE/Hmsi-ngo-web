-- Extend governed contributor role constraints for approved HMSI members.
-- All non-admin content remains pending administrator approval.

alter table public.news_articles drop constraint if exists news_articles_author_role_check;
alter table public.news_articles add constraint news_articles_author_role_check
  check (author_role in ('admin', 'worker', 'volunteer', 'member'));

alter table public.news_approval_events drop constraint if exists news_approval_events_actor_role_check;
alter table public.news_approval_events add constraint news_approval_events_actor_role_check
  check (actor_role in ('admin', 'worker', 'volunteer', 'member'));

alter table public.featured_story_drafts drop constraint if exists featured_story_drafts_author_role_check;
alter table public.featured_story_drafts add constraint featured_story_drafts_author_role_check
  check (author_role in ('admin', 'worker', 'volunteer', 'member'));

alter table public.featured_story_approval_events drop constraint if exists featured_story_approval_events_actor_role_check;
alter table public.featured_story_approval_events add constraint featured_story_approval_events_actor_role_check
  check (actor_role in ('admin', 'worker', 'volunteer', 'member'));
