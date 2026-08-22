-- Explicitly classify current HMSI openings by work mode.
-- Remote means the normal coordination and deliverables can be completed online;
-- it does not promise employment, payment, placement, or a particular work schedule.

alter table public.opportunities
  add column if not exists work_mode varchar(16) not null default 'on_site';

alter table public.opportunities drop constraint if exists opportunities_work_mode_check;
alter table public.opportunities add constraint opportunities_work_mode_check
  check (work_mode in ('remote', 'hybrid', 'on_site'));

update public.opportunities
set work_mode = 'remote'
where status = 'open';

create index if not exists opportunities_work_mode_status_idx
  on public.opportunities (work_mode, status, starts_at);
