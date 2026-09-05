# Admin Assignment Restore and Archive View

## Purpose

The current assignment register marks a job with `is_deleted = true`, records `deleted_at` and `deleted_by`, and excludes it from active work queues. The next safe increment is a protected archive view and one-click restore action that is allowed only while the assignment remains inside a server-enforced 30-day recovery window.

This document is an implementation plan. It does not apply a migration, alter production rows, restore an assignment, or deploy code.

## 1. Recovery deadline model

The existing table has `deleted_at` but not a dedicated recovery deadline. The preferred additive migration is:

```sql
alter table public.work_assignments
  add column if not exists recovery_until timestamptz;

create index if not exists work_assignments_admin_recovery_idx
  on public.work_assignments (is_deleted, recovery_until, deleted_at desc);
```

The soft-delete update should write the deadline from the database clock rather than trusting the browser:

```sql
update public.work_assignments
set is_deleted = true,
    deleted_at = now(),
    recovery_until = now() + interval '30 days',
    deleted_by = :admin_email,
    updated_at = now()
where id = :assignment_id
  and is_deleted = false;
```

For already-soft-deleted rows, a backfill can set `recovery_until = deleted_at + interval '30 days'`, but only after reviewing whether the existing retention process already owns expiry. A migration must not extend an expired recovery period accidentally.

## 2. Restore endpoint contract

Use the existing protected route with an explicit action, or add a dedicated route such as `POST /api/admin/assignments/[id]/restore`. A dedicated route is clearer and easier to audit:

```ts
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);

  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);

  const { id } = await params;
  if (!id) return error('Assignment is required.');

  const now = new Date();
  const assignment = await admin
    .from('work_assignments')
    .select('id,assigned_worker_id,is_deleted,deleted_at,recovery_until')
    .eq('id', id)
    .maybeSingle();

  if (assignment.error) return error('Assignment could not be loaded.', 503);
  if (!assignment.data || !assignment.data.is_deleted) {
    return error('This assignment is not in recovery.', 409);
  }

  const recoveryUntil = assignment.data.recovery_until
    ? new Date(assignment.data.recovery_until)
    : assignment.data.deleted_at
      ? new Date(new Date(assignment.data.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;

  if (!recoveryUntil || recoveryUntil.getTime() <= now.getTime()) {
    return error('The 30-day recovery window has expired.', 410);
  }

  const worker = await admin
    .from('workers')
    .select('id,status,onboarding_status')
    .eq('id', assignment.data.assigned_worker_id)
    .maybeSingle();

  if (worker.error) return error('Worker eligibility could not be checked.', 503);
  if (!worker.data || worker.data.status !== 'active' || worker.data.onboarding_status !== 'completed') {
    return error('The assigned worker is not eligible for restoration.', 409);
  }

  const restored = await admin
    .from('work_assignments')
    .update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      recovery_until: null,
      updated_at: now.toISOString(),
    })
    .eq('id', id)
    .eq('is_deleted', true)
    .gt('recovery_until', now.toISOString())
    .select('id,is_deleted,deleted_at,deleted_by,recovery_until,updated_at')
    .maybeSingle();

  if (restored.error) return error('Assignment could not be restored.', 500);
  if (!restored.data) return error('The recovery window closed before restoration completed.', 409);

  const audit = await admin.from('portal_access_events').insert({
    worker_id: assignment.data.assigned_worker_id,
    event_type: 'assignment_restored',
    metadata: { assignment_id: id, actor },
  });
  if (audit.error) console.warn('[Admin] Assignment restore audit was not recorded.');

  return NextResponse.json({
    assignment: restored.data,
    message: 'Assignment restored to the active register.',
  });
}
```

The final implementation should use a single database-side conditional update or an RPC function so two administrators cannot both restore the same row after the deadline. The server must be authoritative for time, worker eligibility, and role authorization. The browser must never supply `deleted_by`, `recovery_until`, or the actor identity.

## 3. Archived-assignment query

Extend the administrator register GET contract with `view=active|archive`. The default remains active:

```ts
const view = new URL(request.url).searchParams.get('view') === 'archive'
  ? 'archive'
  : 'active';

let query = admin
  .from('work_assignments')
  .select(assignmentSelectWithRecoveryFields)
  .order('deleted_at', { ascending: false, nullsFirst: false });

query = view === 'archive'
  ? query.eq('is_deleted', true)
  : query.eq('is_deleted', false);
```

The archive response should include `recovery_until`, `deleted_at`, `deleted_by`, and a computed server-side `recovery_state` such as `recoverable`, `expired`, or `not_eligible`. It should still join only the safe worker display fields already used by the register. Pagination should be added before production rollout if the archive may grow materially.

Expired rows should remain visible as history until the approved retention cleanup permanently removes them. The archive view must not silently restore or purge them.

## 4. UI structure

The page should have two explicit tabs or links:

| View | Contents | Available action |
|---|---|---|
| Active assignments | Current jobs, assignee, status, due date, and edit/review controls. | Edit or move to recovery. |
| Recovery archive | Soft-deleted jobs, deletion actor/time, recovery deadline, and original assignee. | Restore only when `recovery_state = recoverable`; otherwise show “Recovery expired” or “Worker no longer eligible.” |

The restore flow should be:

1. The administrator opens the archive and selects **Restore**.
2. A modal shows the assignment title, original assignee, deletion time, and exact recovery deadline.
3. The administrator confirms **Restore assignment**.
4. The button becomes disabled while the request is pending.
5. On success, the row leaves the archive and appears in the active register with a status message.
6. On `410`, the UI displays that the 30-day window has expired and refreshes the archive.
7. On `409`, the UI explains that the worker is no longer eligible or another administrator changed the assignment.

The archive must have an explicit empty state and must never imply that a deleted assignment was permanently destroyed merely because it is absent from the active view.

## 5. Authorization and audit requirements

The endpoint must require the existing administrator session and server-side Supabase admin client. It must not trust a worker ID, actor email, or recovery date from the request body. Restore should be allowed only for an assignment that is soft-deleted, whose recovery deadline is in the future, and whose worker is active and fully onboarded.

Every restore should create a dedicated append-only audit event containing the assignment ID and administrative actor. Failure to write the audit event should be logged and surfaced to monitoring; it should not turn a successful restore into an ambiguous client response without an operational alert.

## 6. Retention-expiry behavior

The daily retention cleanup should process expired assignment rows separately from recoverable rows. At or after `recovery_until`, restoration must be rejected. Permanent purge must remain an explicit, ordered cleanup operation that handles dependent records first and respects the existing retention policy. No API request from the archive UI should perform permanent deletion.

A scheduled job must not extend `recovery_until`, restore assignments, or send notifications. It should only mark or purge records according to the approved retention policy and should emit bounded metrics without assignment descriptions or personal data.

## 7. Test matrix

| Test | Expected result |
|---|---|
| Unauthenticated restore | `401`; no database update. |
| Non-admin restore | `401`/`403`; no database update. |
| Active assignment restore | `409`; row remains active and unchanged. |
| Recoverable assignment with eligible worker | `200`; row becomes active, deadline metadata is cleared, and audit event is attempted. |
| Expired assignment | `410`; row remains soft-deleted. |
| Missing/inactive/incomplete worker | `409`; row remains soft-deleted. |
| Concurrent restore | Only one conditional update succeeds; the other receives `409`. |
| Archive query | Returns soft-deleted rows only and never exposes active rows in archive view. |
| Active query | Excludes soft-deleted rows. |
| UI cancel | No request and no state change. |
| UI successful restore | Row moves from archive to active list and a status message appears. |
| UI expired restore | No optimistic resurrection; expired state is shown after refresh. |

## 8. Rollout order

The safe order is to add and verify the new metadata columns, update soft-delete writes, add the archive read path, add restore with tests, add the archive UI, run a disposable test identity, and only then enable the administrator control. Production verification should use metadata and an explicitly authorised test assignment; it must not restore or delete a real worker’s assignment without approval.

The current deployed system has the soft-delete flag and recovery-period retention posture, but this one-click restore/archive extension is not applied by this document.
