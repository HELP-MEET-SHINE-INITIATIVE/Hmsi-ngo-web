-- HMSI fundraiser management patch
-- Run this once in the Supabase SQL Editor for an existing project.

alter table public.fundraisers drop constraint if exists fundraisers_status_check;
alter table public.fundraisers add constraint fundraisers_status_check
  check (status in ('active', 'pending', 'archived', 'rejected', 'completed'));

create index if not exists fundraisers_status_created_at_idx
  on public.fundraisers (status, created_at desc);
