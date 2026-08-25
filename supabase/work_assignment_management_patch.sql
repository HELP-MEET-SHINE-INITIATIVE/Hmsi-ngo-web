-- Additive, retention-safe administrator controls for worker assignments.
-- This migration does not hard-delete assignment history.
alter table public.work_assignments
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text,
  add column if not exists admin_note text;

create index if not exists work_assignments_admin_active_idx
  on public.work_assignments (is_deleted, status, due_at, created_at desc);

create index if not exists work_assignments_admin_worker_idx
  on public.work_assignments (assigned_worker_id, is_deleted, status);
