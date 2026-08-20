-- HMSI fundraising campaign metadata
-- Run this once in the Supabase SQL Editor.

alter table public.fundraisers
  add column if not exists campaign_type text not null default 'programme';

alter table public.fundraisers
  add column if not exists programme_name text;

create index if not exists fundraisers_campaign_type_idx
  on public.fundraisers (campaign_type, created_at desc);

comment on column public.fundraisers.campaign_type is 'organisation for organisation-wide campaigns, programme for a named HMSI programme';
comment on column public.fundraisers.programme_name is 'Optional programme name for programme campaigns';
