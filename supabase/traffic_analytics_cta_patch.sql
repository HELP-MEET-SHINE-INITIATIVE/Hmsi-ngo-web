-- HMSI onboarding CTA analytics extension
-- Adds aggregate-safe CTA identifiers; no URLs, IP addresses, emails, or visitor identifiers are stored.

alter table public.page_views
  add column if not exists cta_key varchar(120);

alter table public.page_views
  drop constraint if exists page_views_event_type_check;

alter table public.page_views
  add constraint page_views_event_type_check
  check (event_type in ('page_view', 'link_click', 'cta_impression', 'cta_click'));

alter table public.page_views
  drop constraint if exists page_views_cta_key_format_check;

alter table public.page_views
  add constraint page_views_cta_key_format_check
  check (cta_key is null or cta_key ~ '^[a-z0-9._-]{1,120}$');

create index if not exists page_views_cta_key_event_idx
  on public.page_views (cta_key, event_type, created_at desc);

comment on column public.page_views.cta_key is 'Bounded, non-identifying CTA catalog key for aggregate onboarding performance reporting.';
