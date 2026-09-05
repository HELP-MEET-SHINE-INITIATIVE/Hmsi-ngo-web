# Admin Assignment Register: Soft Delete and Recovery Code Walkthrough

**Scope:** The deployed `work_assignments` administrator register. This walkthrough contains the current implementation and a clearly marked restore extension that is **not currently applied**.

## 1. Additive migration

The migration adds retention metadata without destroying existing assignment rows:

```sql
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
```

`is_deleted` is the active/recovery flag. `deleted_at` and `deleted_by` provide an administrative trail, while `admin_note` stores an internal note. The indexes keep active-register and assignee lookups bounded.

## 2. Hide recovered rows from the active register

The administrator GET handler requires the admin session and filters the active register at the database query:

```ts
export async function GET(request: Request) {
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);

  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);

  try {
    const assignments = await admin
      .from('work_assignments')
      .select(assignmentSelect)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (assignments.error) throw assignments.error;

    // Worker display identity is joined separately and only safe display
    // fields are returned to the admin register.
    const workerIds = [
      ...new Set(
        (assignments.data || [])
          .map((item) => item.assigned_worker_id)
          .filter(Boolean),
      ),
    ];

    const workers = workerIds.length
      ? await admin
          .from('workers')
          .select('id,name,email,phone,status,onboarding_status')
          .in('id', workerIds)
      : { data: [], error: null };

    if (workers.error) throw workers.error;

    const workerById = new Map(
      (workers.data || []).map((worker) => [worker.id, worker]),
    );

    return NextResponse.json({
      assignments: (assignments.data || []).map((item) => ({
        ...item,
        assigned_worker_name:
          workerById.get(item.assigned_worker_id)?.name || null,
        assigned_worker_email:
          workerById.get(item.assigned_worker_id)?.email || null,
      })),
      workers: workers.data || [],
    });
  } catch {
    return error('Assignments could not be loaded.', 503);
  }
}
```

The corresponding worker-feed and administrator-count queries also exclude `is_deleted = true`, so hiding a row is consistent across the active register and work queue.

## 3. Admin edit protection

The deployed PATCH handler edits only an active assignment. The condition `.eq('is_deleted', false)` prevents an already recovered row from being silently edited back into the active workflow:

```ts
const updated = await admin
  .from('work_assignments')
  .update({
    title,
    description,
    kind,
    status,
    assigned_worker_id: workerId,
    due_at: dueAt,
    admin_note: String(body.adminNote || '').trim() || null,
    updated_at: new Date().toISOString(),
  })
  .eq('id', id)
  .eq('is_deleted', false)
  .select(assignmentSelect)
  .single();

if (updated.error) throw updated.error;

const auditEvent = await admin.from('portal_access_events').insert({
  worker_id: workerId,
  event_type: 'assignment_status_changed',
  metadata: {
    assignment_id: id,
    actor,
    action: 'admin_updated',
  },
});

if (auditEvent.error) {
  console.warn('[Admin] Assignment audit event was not recorded.');
}
```

The worker must still be active and fully onboarded before an administrator can save a reassignment.

## 4. Soft-delete endpoint

The deployed DELETE handler does not call a destructive SQL delete. It records the actor and time, then marks the row recovered/hidden:

```ts
export async function DELETE(request: Request) {
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);

  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return error('Assignment is required.');

    const now = new Date().toISOString();
    const deleted = await admin
      .from('work_assignments')
      .update({
        is_deleted: true,
        deleted_at: now,
        deleted_by: actor,
        updated_at: now,
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .select('id,is_deleted,deleted_at')
      .single();

    if (deleted.error) throw deleted.error;

    return NextResponse.json({
      assignment: deleted.data,
      message: 'Assignment moved to recovery.',
    });
  } catch {
    return error('We could not remove this assignment.', 500);
  }
}
```

The second `.eq('is_deleted', false)` makes the operation effectively idempotent for active rows: an already-hidden assignment cannot be deleted again through the same path.

## 5. Confirmation in the register UI

The UI keeps the selected item in local state and requires an explicit confirmation click:

```tsx
const [confirming, setConfirming] = useState<Assignment | null>(null);
const [savingId, setSavingId] = useState<string | null>(null);

async function softDelete() {
  if (!confirming) return;

  const item = confirming;
  setSavingId(item.id);
  setError('');
  setNotice('');

  try {
    const response = await fetch('/api/admin/assignments', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Unable to remove this assignment.');
    }

    setConfirming(null);
    setNotice('Assignment moved to recovery and hidden from active work queues.');
    await load();
  } catch (cause) {
    setError(
      cause instanceof Error
        ? cause.message
        : 'Unable to remove this assignment.',
    );
  } finally {
    setSavingId(null);
  }
}
```

The confirmation copy explicitly tells the administrator that the action is not an immediate hard delete:

```tsx
<p>
  “{confirming.title}” will be hidden from active work queues and retained for
  the approved recovery period. This does not immediately hard-delete the
  assignment.
</p>
<button onClick={() => void softDelete()}>
  Confirm recovery
</button>
```

## 6. Important current limitation: restore is not yet a deployed endpoint

The current release implements **soft deletion and recovery-period retention**, but the shown production route does not currently expose a `POST /restore`, `PATCH action=restore`, or archived-assignment view. Therefore, “recovery” currently means that the row is retained for the approved recovery period and excluded from active queues; it should not be described as a one-click administrator restore unless that endpoint and UI are added.

A safe restore extension would be a separately approved change, for example:

```ts
// Proposed only; not deployed by this walkthrough.
export async function POST(request: Request) {
  const actor = adminEmail(request);
  if (!actor) return error('Admin authentication required.', 401);

  const admin = getSupabaseAdmin();
  if (!admin) return error('Supabase is not configured on the server.', 503);

  const body = await request.json();
  if (body.action !== 'restore') return error('Unsupported assignment action.');

  const id = String(body.id || '').trim();
  if (!id) return error('Assignment is required.');

  const restored = await admin
    .from('work_assignments')
    .update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('is_deleted', true)
    .select('id,is_deleted,deleted_at,deleted_by,updated_at')
    .single();

  if (restored.error) return error('We could not restore this assignment.', 500);

  // In the final implementation, add an append-only admin audit event here.
  return NextResponse.json({
    assignment: restored.data,
    message: 'Assignment restored to the active register.',
  });
}
```

Before applying such an extension, the implementation should add a recovery-window check, prevent restoration of an assignment whose worker is inactive or no longer onboarded, record a dedicated audit event, add an archived/recovery view, and cover the endpoint with authorization and lifecycle tests.

## 7. Security and retention summary

The design is fail-closed for unauthenticated admin requests, uses server-derived administrator identity, does not expose internal assignment identifiers to the worker-facing UI as authorization credentials, avoids hard deletion, and keeps active feeds consistent with the soft-delete flag. It does not itself delete a Supabase Auth user, remove a worker, or send a notification.
