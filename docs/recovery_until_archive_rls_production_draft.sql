-- HMSI work_assignments recovery/archive migration
-- REVIEW DRAFT: do not apply until the deployment owner approves the SQL,
-- confirms that all work_assignments access goes through the server API, and
-- schedules the retention change.
--
-- Verified current base-table facts:
--   * public.work_assignments already has is_deleted, deleted_at,
--     deleted_by, and admin_note.
--   * RLS is enabled on the table.
--   * No work_assignments RLS policies were returned by the metadata review.
--   * anon/authenticated currently have table grants, so this draft revokes
--     direct browser privileges; the existing server-side service-role route
--     remains the only intended access path.

begin;

-- 1. Add only the missing recovery deadline column.
alter table public.work_assignments
  add column if not exists recovery_until timestamptz;

-- 2. Preserve the approved 30-day window for already-soft-deleted rows when
--    the original deletion timestamp exists. Rows without deleted_at remain
--    visible for manual review and are not assigned an invented deadline.
update public.work_assignments
set recovery_until = deleted_at + interval '30 days'
where is_deleted = true
  and deleted_at is not null
  and recovery_until is null;

-- 3. Keep recovery/archive and assignee searches bounded.
create index if not exists work_assignments_admin_recovery_idx
  on public.work_assignments (is_deleted, recovery_until, deleted_at desc);

create index if not exists work_assignments_admin_worker_idx
  on public.work_assignments (assigned_worker_id, is_deleted, status);

-- 4. Permit a missing recovery deadline for legacy rows, but never permit a
--    deadline earlier than the recorded deletion time.
alter table public.work_assignments
  drop constraint if exists work_assignments_recovery_after_deleted_check;

alter table public.work_assignments
  add constraint work_assignments_recovery_after_deleted_check
  check (
    recovery_until is null
    or deleted_at is null
    or recovery_until >= deleted_at
  );

-- 5. Expose only soft-deleted assignments to the server-side admin archive.
-- RLS is applied to the base table; PostgreSQL does not enable RLS on views.
drop view if exists public.work_assignments_admin_archive;

create view public.work_assignments_admin_archive
with (security_invoker = true)
as
select
  wa.id,
  wa.title,
  wa.description,
  wa.kind,
  wa.status,
  wa.assigned_worker_id,
  wa.fundraiser_id,
  wa.due_at,
  wa.created_at,
  wa.updated_at,
  wa.deleted_at,
  wa.deleted_by,
  wa.recovery_until,
  wa.admin_note,
  case
    when wa.recovery_until is null then 'needs_review'
    when wa.recovery_until > now() then 'recoverable'
    else 'expired'
  end as recovery_state
from public.work_assignments as wa
where wa.is_deleted = true;

comment on view public.work_assignments_admin_archive is
  'Soft-deleted work assignments. Read through the authenticated HMSI admin API only; restore is permitted only before recovery_until.';

-- 6. Enforce server-only access for the base table and archive view. The
-- service-role client bypasses RLS by design, so route-level admin checks are
-- mandatory and are not replaced by these statements.
alter table public.work_assignments enable row level security;
revoke all on table public.work_assignments from anon, authenticated;
revoke all on public.work_assignments_admin_archive from anon, authenticated;

drop policy if exists work_assignments_deny_browser_roles
  on public.work_assignments;

create policy work_assignments_deny_browser_roles
  on public.work_assignments
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- 7. The server API uses the service role. This grant is explicit for
--    catalog clarity; the service role still bypasses RLS.
grant select, insert, update, delete on table public.work_assignments to service_role;
grant select on public.work_assignments_admin_archive to service_role;

commit;

-- Verification queries to run separately after approval/application.
-- They return metadata only and do not read assignment rows:
--
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'work_assignments'
--   and column_name in ('is_deleted','deleted_at','deleted_by','recovery_until')
-- order by ordinal_position;
--
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and indexname in ('work_assignments_admin_recovery_idx',
--                     'work_assignments_admin_worker_idx')
-- limit 10;
--
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'work_assignments'
-- limit 20;

/*
ROLLBACK DRAFT — run only under an approved rollback window.

begin;
drop view if exists public.work_assignments_admin_archive;
drop policy if exists work_assignments_deny_browser_roles
  on public.work_assignments;
revoke all on table public.work_assignments from service_role;
drop index if exists public.work_assignments_admin_recovery_idx;
drop index if exists public.work_assignments_admin_worker_idx;
alter table public.work_assignments
  drop constraint if exists work_assignments_recovery_after_deleted_check;
-- Dropping recovery_until discards recovery-deadline metadata. Confirm this
-- loss is acceptable before uncommenting the next statement.
-- alter table public.work_assignments drop column if exists recovery_until;
commit;
*/
