-- Approved members may request HMSI school enrollment; administrators approve or reject each request.
create table if not exists public.hmsi_school_enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.hmsi_members(id) on delete cascade,
  member_name varchar(160) not null,
  member_email varchar(320) not null,
  status varchar(24) not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  reviewed_by varchar(320),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists hmsi_school_enrollment_requests_status_created_idx
  on public.hmsi_school_enrollment_requests (status, created_at desc);
create unique index if not exists hmsi_school_enrollment_requests_one_pending_member_idx
  on public.hmsi_school_enrollment_requests (member_id) where status = 'pending';

alter table public.hmsi_school_enrollment_requests enable row level security;
drop policy if exists "Service role can manage school enrollment requests" on public.hmsi_school_enrollment_requests;
create policy "Service role can manage school enrollment requests"
  on public.hmsi_school_enrollment_requests for all to service_role using (true) with check (true);
