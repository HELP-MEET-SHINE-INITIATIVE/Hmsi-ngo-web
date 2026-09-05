# Disposable Administrator RLS and Privilege Test Plan

## Scope and safety boundary

This plan tests the proposed `work_assignments` RLS and privilege changes without using a real worker, volunteer, member, administrator, assignment, payment, or password. It is a procedure for a disposable Supabase Auth identity and an isolated test assignment only. It must not be executed against production until the migration has been approved and a test window has been scheduled.

The preferred environment is a Supabase development branch or a separate test project. If production must be used, the disposable account must be created specifically for this test, the assignment fixture must be tagged with a unique test marker, and the test owner must approve both creation and teardown. Never use an existing HMSI account as the disposable identity.

## Roles to test separately

| Test subject | How it is exercised | Expected authority |
|---|---|---|
| `anon` | Direct REST/PostgREST request with no bearer token. | No read, insert, update, delete, or archive-view access. |
| `authenticated` non-admin | Disposable Supabase Auth user session. | No direct table access and no admin API access. |
| Disposable HMSI admin | Normal HMSI admin login/session through the admin API. | Can list active/archive assignments and perform permitted admin actions through server routes. |
| Server service role | Server-side admin client only; never shipped to the browser. | May access the table because it bypasses RLS, but only after the application performs administrator, lifecycle, and worker-eligibility checks. |

RLS is a database boundary, not a replacement for application authorization. The service role bypasses RLS, so a successful service-role query alone does not prove that the administrator endpoint is secure.

## Phase 1: Metadata assertions before any fixture

Run read-only catalog queries first and save only metadata:

```sql
select c.relname as table_name,
       c.relrowsecurity as row_security,
       c.relforcerowsecurity as forced_row_security
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'work_assignments'
limit 10;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'work_assignments'
limit 50;

select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('work_assignments', 'work_assignments_admin_archive')
  and grantee in ('anon', 'authenticated', 'service_role')
limit 100;
```

Confirm that `recovery_until` exists, the archive view exists if the migration has been applied, RLS is enabled on the base table, and browser grants match the approved policy. Do not treat a missing policy row as success if browser table privileges remain broad.

## Phase 2: Disposable fixture and server-admin tests

Create one disposable worker identity through the approved test setup—not through the public onboarding flow—and one assignment whose title begins with a unique marker such as `RLS-TEST-<run-id>`. Do not place personal information in the title or description. Record only the fixture UUIDs in the test log.

Through the normal server-side admin API, verify the following sequence:

| Test | Expected response and state |
|---|---|
| Admin lists active assignments | `200`; the fixture appears with safe assignee display data. |
| Admin edits the fixture | `200`; only allowed fields change and the audit event is attempted. |
| Admin soft-deletes the fixture | `200`; `is_deleted` becomes true, `deleted_at` and `deleted_by` are set, and `recovery_until` is approximately 30 days after deletion. |
| Admin reads active view | `200`; the fixture is absent. |
| Admin reads archive view | `200`; the fixture appears with `recoverable` state while inside the window. |
| Admin restores the fixture, if the restore endpoint has been deployed | `200`; the row returns to active state and the recovery fields are cleared according to the approved contract. |

The restore request must not accept `deleted_by`, `recovery_until`, or actor identity from the browser. The server must calculate the current time and perform a conditional update requiring `is_deleted = true` and `recovery_until > now()`.

## Phase 3: Negative authorization tests

Use the disposable non-admin session and unauthenticated requests to test both the admin API and direct PostgREST access. Do not include passwords or bearer tokens in test output.

| Request | Expected result |
|---|---|
| `GET /api/admin/assignments` without a session | `401`; no assignment metadata. |
| `GET /api/admin/assignments?view=archive` without a session | `401`; no archive metadata. |
| `POST /api/admin/assignments/<id>/restore` as non-admin | `401` or `403`; no row update. |
| Direct `GET` table query as `anon` | Permission/RLS denial or empty result according to the approved policy. |
| Direct `INSERT`, `UPDATE`, or `DELETE` as `anon` | Permission/RLS denial. |
| Direct table query as non-admin `authenticated` | Permission/RLS denial or empty result. |
| Direct archive-view query as `anon` or non-admin `authenticated` | Permission denial. |
| Restore with a forged `deleted_by` or future `recovery_until` | The supplied values are ignored; the request is rejected or uses server-derived values. |
| Restore after deadline | `410`; row remains soft-deleted. |
| Restore for inactive or incomplete worker | `409`; row remains soft-deleted. |

If the public role receives a permission error, do not “fix” the test by granting access. The intended design is server-only assignment access.

## Phase 4: Boundary and concurrency tests

Run a concurrent restore test using two independent disposable administrator sessions against the same soft-deleted fixture. Exactly one request should restore the row; the other should receive a conflict response because the conditional predicate no longer matches. This confirms that the application does not rely on a time-of-check/time-of-use gap.

Test an assignment with `recovery_until` set to a past timestamp only in an isolated test environment. The archive should show `expired`, restore should return `410`, and no active-feed query should include the row. Do not alter a real production row to simulate expiry.

## Phase 5: Cleanup and evidence

After all tests, use the approved server-side cleanup process to remove the fixture assignment and disposable identity in the test environment. In production, do not run permanent deletion merely to clean up unless the test owner explicitly approves it; instead, use the existing retention process and record the planned expiry. Confirm that no test title, UUID, email, token, password, or session cookie appears in logs.

The evidence package should contain test timestamp, deployment ID, migration identifier, HTTP status codes, route names, metadata-only policy results, and pass/fail assertions. It must not contain access tokens, service-role keys, SMTP credentials, passwords, raw setup tokens, or personal records.

## Approval gate

Production execution requires approval of the migration, the exact RLS policy set, the test account owner, the fixture cleanup method, and the rollback plan. No production test should send email, change a real user’s password, create a live assignment, alter a real worker’s status, or invoke permanent retention purge.

## References

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase: Row Level Security"
[2]: https://supabase.com/docs/guides/database/postgres/grant-table-access "Supabase: Grant Table Access"
[3]: https://www.postgresql.org/docs/current/ddl-priv.html "PostgreSQL: Database Roles and Privileges"
