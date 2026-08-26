-- Cross-role location capture and duplicate-application protection.
-- Additive only: no contact is removed, no access state is changed, and no notification is sent.

begin;

alter table public.volunteer_applications add column if not exists location varchar(160);
alter table public.workers add column if not exists location varchar(160);
alter table public.hmsi_member_applications add column if not exists location varchar(160);
alter table public.hmsi_members add column if not exists location varchar(160);

create table if not exists public.application_email_registry (
  id uuid primary key default gen_random_uuid(),
  email varchar(320) not null unique check (email = lower(email)),
  applicant_role text not null check (applicant_role in ('volunteer', 'worker', 'member')),
  source_table text not null check (source_table in ('volunteer_applications', 'hmsi_member_applications', 'workers', 'hmsi_members')),
  source_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.application_email_registry enable row level security;

create index if not exists application_email_registry_role_created_idx
  on public.application_email_registry (applicant_role, created_at desc);

insert into public.application_email_registry (email, applicant_role, source_table, source_id, created_at)
select distinct on (email) email, applicant_role, source_table, source_id, created_at
from (
  select lower(email) as email, applicant_role, 'volunteer_applications'::text as source_table, id as source_id, created_at
  from public.volunteer_applications
  where email is not null and btrim(email) <> ''
  union all
  select lower(email) as email, 'member'::text as applicant_role, 'hmsi_member_applications'::text as source_table, id as source_id, created_at
  from public.hmsi_member_applications
  where email is not null and btrim(email) <> ''
  union all
  select lower(email) as email, 'worker'::text as applicant_role, 'workers'::text as source_table, id as source_id, created_at
  from public.workers
  where email is not null and btrim(email) <> ''
  union all
  select lower(email) as email, 'member'::text as applicant_role, 'hmsi_members'::text as source_table, id as source_id, created_at
  from public.hmsi_members
  where email is not null and btrim(email) <> ''
) as existing_records
order by email, created_at asc
on conflict (email) do nothing;

commit;
