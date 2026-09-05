# Staging Checklist: Supabase Service-Role Bypass vs Application Admin Checks

## Purpose

This checklist verifies two separate controls during a staging deployment:

1. **Database boundary:** anonymous and ordinary authenticated clients cannot access the assignment table or archive view directly through RLS and privileges.
2. **Application boundary:** only an authenticated HMSI administrator can reach the admin API, while the server-side service-role client is used only after the route has completed its administrator and lifecycle checks.

A green service-role query is not evidence that the application authorization is correct. Supabase documents that service-role access bypasses RLS, so both layers must be tested independently.[1]

## A. Staging isolation and fixtures

- [ ] Use a separate Supabase staging project or development branch. Do not use production records.
- [ ] Use a disposable administrator account, disposable non-admin account, disposable worker identity, and one assignment with a unique test marker.
- [ ] Do not use a real worker’s email, password, assignment, payment, or portal session.
- [ ] Record only the test fixture IDs, deployment ID, migration ID, timestamps, route names, and status codes.
- [ ] Confirm the staging project can be reset or the fixture can be deleted through an approved teardown process.

## B. Environment and secret placement

- [ ] Confirm the staging server has the Supabase URL and a current server-only service key from the same project.
- [ ] Confirm the browser has only the publishable/anon key, never `SUPABASE_SERVICE_ROLE_KEY` or another secret key.
- [ ] Confirm service-key values are not present in built JavaScript, source maps, client network responses, browser storage, or logs.
- [ ] Confirm staging and production keys are not mixed.
- [ ] Confirm the service key is available only to server-side code such as the admin API client.

## C. Database metadata checks

Run read-only metadata checks before using the fixtures:

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

- [ ] RLS is enabled on `public.work_assignments`.
- [ ] The intended deny policy exists for browser roles, or direct browser privileges are revoked as approved.
- [ ] `anon` and `authenticated` do not have unintended table or archive-view privileges.
- [ ] `service_role` has only the server-side privileges required by the API.
- [ ] The archive view is not treated as an RLS-protected table; its browser privileges are explicitly revoked.

## D. Direct database-role tests

These tests must bypass the HMSI application and use the staging Supabase REST/Data API with the appropriate role/session.

| Test | Request | Expected result |
|---|---|---|
| Anonymous read | No bearer token, `GET` assignment table | Permission/RLS denial or approved empty result; no fixture data. |
| Anonymous archive read | No bearer token, `GET` archive view | Permission denial; no archive metadata. |
| Authenticated non-admin read | Disposable non-admin bearer token | Permission/RLS denial or approved empty result. |
| Anonymous insert | Attempt to insert a synthetic assignment | Denied; no row created. |
| Non-admin update | Attempt to change the disposable fixture | Denied; no field changes. |
| Non-admin delete | Attempt to delete the disposable fixture | Denied; no physical or soft deletion. |
| Non-admin archive restore | Attempt to update `is_deleted` or `recovery_until` | Denied; no resurrection. |

- [ ] Verify no response contains a service key, database connection string, internal error stack, worker PII, or unrelated row.
- [ ] Verify that a permission failure is not “fixed” by granting browser table access.

## E. Service-role positive tests

Run these only inside the server-side test process. Do not expose the service key to a test client.

- [ ] The server client can read the synthetic fixture when the test explicitly uses the service role.
- [ ] The server client can perform the approved soft-delete update for the synthetic fixture.
- [ ] The server client can read the soft-deleted fixture for the archive path.
- [ ] The server client cannot be called directly from browser code or the public network.
- [ ] The service-role test is not considered an authorization test; it only confirms server connectivity and expected database privileges.

## F. Application-layer administrator tests

Use the normal HMSI login/session flow and call the production-shaped admin routes. The route must authorize first and instantiate/use the service-role client only after that check.

| Test | Expected result |
|---|---|
| No session: active register | `401`; no assignment data. |
| No session: archive register | `401`; no archive data. |
| Non-admin session: active register | `401` or `403`; no assignment data. |
| Non-admin session: edit | `401` or `403`; fixture unchanged. |
| Non-admin session: soft delete | `401` or `403`; fixture unchanged. |
| Non-admin session: restore | `401` or `403`; fixture unchanged. |
| Disposable admin: active register | `200`; only approved safe assignment/assignee fields. |
| Disposable admin: archive register | `200`; only soft-deleted fixture rows. |
| Disposable admin: edit | `200`; allowed fields change and audit event is attempted. |
| Disposable admin: soft delete | `200`; `is_deleted`, `deleted_at`, `deleted_by`, and `recovery_until` are server-derived. |
| Disposable admin: restore inside window | `200`; conditional restore succeeds if worker is eligible. |
| Disposable admin: restore after deadline | `410`; row remains soft-deleted. |

## G. Spoofing and trust-boundary tests

- [ ] Send a forged `deleted_by` value; verify the server records the authenticated administrator, not the supplied value.
- [ ] Send a forged future `recovery_until`; verify it is ignored and the server enforces the stored deadline.
- [ ] Send another worker’s ID; verify the route does not change assignment ownership unless the admin reassignment rules explicitly permit it.
- [ ] Alter or remove session cookies; verify the request is denied.
- [ ] Replay a successful restore request; verify the second request returns a conflict or no-op and does not duplicate audit events.
- [ ] Use an assignment ID that does not belong to the disposable fixture; verify the route does not leak whether another assignment exists beyond the approved response.
- [ ] Confirm CORS, CSRF/same-origin, and cookie flags match the application’s existing secure-session design.

## H. Evidence and log checks

- [ ] Confirm the request logs contain route, result, duration, and request ID but no bearer token, cookie, service key, password, or raw setup token.
- [ ] Confirm denied database requests and denied admin routes are distinguishable in monitoring.
- [ ] Confirm service-role usage is limited to the expected server route/process.
- [ ] Confirm audit events identify the server-derived administrator and assignment ID without duplicating sensitive content.
- [ ] Save only sanitized evidence: test name, expected/actual status, deployment ID, migration ID, and timestamp.

## I. Teardown and release gate

- [ ] Restore or remove the synthetic assignment in staging through the approved teardown process.
- [ ] Delete the disposable identity from the staging Auth project.
- [ ] Confirm no fixture records remain in active or archive views.
- [ ] Confirm production was not queried with staging credentials and no production record was changed.
- [ ] Obtain explicit approval before applying the migration or changing production privileges.
- [ ] If any direct browser test succeeds unexpectedly, stop the rollout and correct privileges/RLS before deployment.

## Interpretation

A correct result requires both conditions: direct `anon`/`authenticated` access is denied by database privileges/RLS, and the application rejects unauthenticated or non-admin sessions before its server-side service-role client is used. A service-role success combined with an application-admin failure indicates an application authorization defect. An application-admin success combined with direct browser access indicates an RLS/privilege defect.

## References

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase: Row Level Security"
[2]: https://supabase.com/docs/guides/database/postgres/grant-table-access "Supabase: Grant Table Access"
[3]: https://www.postgresql.org/docs/current/ddl-priv.html "PostgreSQL: Database Roles and Privileges"
