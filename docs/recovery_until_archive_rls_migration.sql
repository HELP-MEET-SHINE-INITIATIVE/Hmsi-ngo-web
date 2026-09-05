-- HMSI worker-assignment recovery/archive design
-- REVIEW ONLY: do not execute against production until separately approved.
-- This script is additive and does not perform permanent deletion.

begin;

-- 1. Add a server-managed recovery deadline.
alter table public.work_assignments
  add column if not exists recovery_until timestamptz;

-- 2. Backfill only rows that already have a deletion timestamp.
-- Rows without deleted_at remain unchanged for manual review.
update public.work_assignments
set recovery_until = deleted_at + interval '30 days'
where is_deleted = true
  and deleted_at is not null
  and recovery_until is null;

-- 3. Keep active-register, archive, and assignee lookups bounded.
create index if not exists work_assignments_admin_recovery_idx
  on public.work_assignments (is_deleted, recovery_until, deleted_at desc);

create index if not exists work_assignments_admin_worker_idx
  on public.work_assignments (assigned_worker_id, is_deleted, status);

-- 4. Enforce a basic timestamp invariant without forcing a policy decision
-- about old rows whose recovery deadline is missing.
alter table public.work_assignments
  drop constraint if exists work_assignments_recovery_after_deleted_check;

alter table public.work_assignments
  add constraint work_assignments_recovery_after_deleted_check
  check (
    recovery_until is null
    or deleted_at is null
    or recovery_until >= deleted_at
  );

-- 5. A security-invoker view exposes only archived assignment metadata.
-- The admin API should still join safe worker display fields server-side.
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
  'Soft-deleted assignments only; restore is controlled by the authenticated HMSI admin API and the 30-day recovery deadline.';

-- 6. Explicitly deny direct browser reads/writes. This is default-deny
-- reinforcement for Supabase anon/authenticated roles. The server-only
-- service-role client bypasses RLS, so the admin route MUST continue to
-- perform its own administrator authorization and lifecycle checks.
alter table public.work_assignments enable row level security;
-- PostgreSQL does not support RLS on views. Keep RLS on the base table,
-- revoke browser privileges on this view, and access it only from the
-- already-authorized server-side admin client.

revoke all on public.work_assignments_admin_archive from anon, authenticated;

rollback;

/*
APPLYABLE RLS SECTION — use instead of the illustrative view-RLS line above

alter table public.work_assignments enable row level security;

 drop policy if exists work_assignments_no_direct_browser_access
   on public.work_assignments;

create policy work_assignments_no_direct_browser_access
  on public.work_assignments
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.work_assignments_admin_archive from anon, authenticated;
revoke all on table public.work_assignments from anon, authenticated;

-- The service role is not granted through these policies and bypasses RLS by
-- Supabase design. Keep it exclusively in server-side code and preserve the
-- existing adminEmail/request authorization checks.

commit;
*/

-- IMPORTANT REVIEW NOTE:
-- The main transaction above intentionally ends with ROLLBACK so this file is
-- safe to inspect and cannot change a database if accidentally run. Before
-- production use, remove that rollback, remove the illustrative invalid
-- view-RLS line, apply the policy section, and run metadata verification.
