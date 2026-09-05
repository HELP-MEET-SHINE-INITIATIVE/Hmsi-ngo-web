# Automated Soft-Delete Feed and Room-Context Test Suite

## Objective

Prove that a soft-deleted assignment is removed from every active worker/member task feed and related count, cannot be acted on through a role-room context, remains available only to an authorised administrator archive/recovery path, and cannot be restored after its recovery deadline.

The recommended first implementation is a deterministic mocked integration harness around the route handlers. A separate staging browser suite should later exercise the same contract with disposable identities. Production data must never be used as a fixture.

## Fixture model

Create a synthetic run identifier and these records in an in-memory repository or isolated test database:

| Fixture | Key fields | Purpose |
|---|---|---|
| Active worker | `workerId`, active status, completed onboarding | Owns the active and deleted worker assignments. |
| Active member | `memberId`, active status, completed onboarding | Owns the member task fixture. |
| Active assignment | `assignmentId`, assigned worker, `is_deleted=false` | Must appear in worker feed and active counts. |
| Deleted assignment | `deletedAssignmentId`, same worker, `is_deleted=true`, `deleted_at`, `recovery_until` in the future | Must disappear from active feeds and appear only in admin archive. |
| Member task | `memberTaskId`, assigned member, active status | Must appear only in member feed. |
| Room messages | role-scoped messages for worker/member/volunteer | Must not gain deleted-assignment content or cross-role visibility. |
| Non-admin identity | authenticated but not administrator | Negative authorization subject. |
| Admin identity | authenticated administrator | Archive/recovery subject. |

Use harmless synthetic titles such as `E2E-RUN-<id>` and no real names, email addresses, payment data, medical details, or external files.

## Test harness structure

Use a repository interface so the same assertions can run against an in-memory fake and, later, a staging Supabase adapter:

```ts
export type Assignment = {
  id: string;
  assignedWorkerId: string;
  title: string;
  status: string;
  isDeleted: boolean;
  deletedAt: string | null;
  recoveryUntil: string | null;
};

export interface AssignmentRepository {
  listWorkerActive(workerId: string): Promise<Assignment[]>;
  listAdminArchive(): Promise<Assignment[]>;
  getById(id: string): Promise<Assignment | null>;
  updateStatus(id: string, patch: Partial<Assignment>): Promise<Assignment>;
}
```

The fake repository should apply the same predicates as production. The worker active query must require both `assignedWorkerId = identity.profileId` and `isDeleted = false`. The archive query must require `isDeleted = true`. Room handlers must derive role and identity from the session rather than from request-body fields.

## Core assertions

| Scenario | Expected assertion |
|---|---|
| Worker active feed before soft delete | Active assignment appears. |
| Worker active feed after soft delete | Deleted assignment is absent; unrelated active assignment remains. |
| Worker task count after soft delete | Count decreases only by the deleted assignment. |
| Member active feed | Member sees only member-owned tasks; worker assignment is absent. |
| Admin active register | Deleted assignment is absent from active list. |
| Admin archive register | Deleted assignment appears with actor, deletion time, recovery deadline, and `recoverable` state if the deadline is future. |
| Worker task detail for deleted ID | Returns not-found/denied; it must not expose the deleted job or permit mutation. |
| Worker status update for deleted ID | Rejected; assignment remains soft-deleted. |
| Worker room context | Room loads only role-scoped messages and does not attach or reveal a deleted assignment. |
| Member room context | Member room cannot resolve worker assignment IDs or worker messages. |
| Admin restore inside window | Conditional restore succeeds only for an eligible active worker; active feed then includes the assignment. |
| Admin restore after window | Returns `410`; assignment remains soft-deleted. |

## Recommended test cases

```js
test('soft-deleted worker assignments disappear from active feed and count', async () => {
  const repo = makeRepository({ activeAssignment, deletedAssignment });
  const before = await listWorkerTasks(workerIdentity, repo);
  assert.deepEqual(ids(before), [activeAssignment.id, deletedAssignment.id]);

  await softDeleteAssignment(deletedAssignment.id, adminIdentity, repo);

  const after = await listWorkerTasks(workerIdentity, repo);
  assert.deepEqual(ids(after), [activeAssignment.id]);
  assert.equal(after.some(task => task.id === deletedAssignment.id), false);
});

test('deleted assignment cannot be mutated through worker task route', async () => {
  const response = await updateWorkerTask(deletedAssignment.id, workerIdentity, {
    status: 'in_progress',
  }, repo);
  assert.equal(response.status, 404);
  assert.equal((await repo.getById(deletedAssignment.id)).isDeleted, true);
});

test('only admin archive can see deleted assignment', async () => {
  const nonAdmin = await getAdminArchive(nonAdminIdentity, repo);
  assert.equal(nonAdmin.status, 403);

  const admin = await getAdminArchive(adminIdentity, repo);
  assert.equal(admin.status, 200);
  assert.equal(admin.body.items[0].id, deletedAssignment.id);
});

test('room context never exposes deleted assignment or another role', async () => {
  const workerRoom = await getRoom('worker', workerIdentity, repo);
  assert.equal(workerRoom.status, 200);
  assert.equal(JSON.stringify(workerRoom.body).includes(deletedAssignment.id), false);

  const memberRoom = await getRoom('member', memberIdentity, repo);
  assert.equal(memberRoom.status, 200);
  assert.equal(JSON.stringify(memberRoom.body).includes(activeAssignment.id), false);
});
```

The exact function names should follow the existing route-handler exports. If the current tests are source-contract tests, add equivalent assertions for the production predicates and then add mocked handler tests to prove runtime behavior rather than relying only on string matching.

## Negative authorization and leak checks

Run the active-feed, archive, detail, update, and room requests with no session, a non-admin session, the wrong role, and an identity that does not own the assignment. Every unauthorized response must contain no title, description, assignee, room message, audit note, proof link, or recovery deadline. A service-role repository success is not an authorization success; the application identity check must happen before the repository call.

Also test that soft-deleted assignments do not appear in search results, dashboard counts, opportunity context, notification recipients, room summaries, or task deep links. Verify that cache headers do not permit a response obtained by one role to be reused by another.

## Recovery and race tests

Use a fixed clock in tests. Set one fixture’s `recovery_until` one second in the future and one fixture’s deadline in the past. A restore just before the deadline may succeed; a restore at or after the deadline must return `410`. The server must ignore client-provided actor and deadline fields.

Run two restore requests concurrently. Exactly one may change `is_deleted` from true to false. The second must return a conflict/no-op response and must not create a duplicate restore event. A second completion or status update after soft delete must remain rejected.

## CI gates

The suite should run in this order:

1. Type-check and lint the changed route/component files.
2. Run deterministic repository tests with fake time and in-memory fixtures.
3. Run all regression tests.
4. Build the production bundle.
5. Run staging-only browser tests with disposable identities.
6. Block deployment if any direct browser table access, cross-role task access, deleted-feed leakage, restore-after-expiry, or service-key exposure check fails.

## Teardown and evidence

Use a unique run ID and remove all in-memory/isolated fixtures after each test. Do not delete real records to clean up a failed run. Evidence should contain only test name, role, route, expected/actual status, fixture-safe ID, deployment ID, and timestamp. Never record passwords, cookies, bearer tokens, service keys, raw setup links, or personal data.

## References

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[2]: https://www.postgresql.org/docs/current/ddl-priv.html "PostgreSQL Database Roles and Privileges"
