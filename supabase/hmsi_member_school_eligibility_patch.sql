-- Allow approved HMSI members to use the same administrator-controlled school and certificate process.
-- Completion, payment verification, and certificate issuance remain separate admin-reviewed steps.

alter table public.hmsi_school_enrollments drop constraint if exists hmsi_school_enrollments_holder_role_check;
alter table public.hmsi_school_enrollments add constraint hmsi_school_enrollments_holder_role_check
  check (holder_role in ('worker', 'volunteer', 'member'));

alter table public.hmsi_certificate_requests drop constraint if exists hmsi_certificate_requests_holder_role_check;
alter table public.hmsi_certificate_requests add constraint hmsi_certificate_requests_holder_role_check
  check (holder_role in ('worker', 'volunteer', 'member'));

create index if not exists hmsi_school_enrollments_member_idx
  on public.hmsi_school_enrollments (holder_role, holder_id, status);
