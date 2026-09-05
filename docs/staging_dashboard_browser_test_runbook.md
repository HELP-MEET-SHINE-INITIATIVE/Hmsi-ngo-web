# HMSI Staging Dashboard Browser-Test Runbook

## Purpose and non-production boundary

Run this procedure only against an isolated Supabase staging project or development branch and a staging deployment whose environment variables point to that same project. Do not use `www.hmsi.org.ng`, production Supabase, real HMSI users, real assignments, real payments, or real Google Drive files.

The run requires explicit approval from the deployment owner for disposable-account creation, synthetic assignment creation, email delivery to test inboxes, and teardown. Use dedicated test mailboxes controlled by the test team. Do not place passwords, access tokens, setup tokens, cookies, or service keys in the test plan or evidence.

## Test identities

| Identity | Purpose | Required state |
|---|---|---|
| `staging-admin` | Tests administrator assignment register and protected operations. | Administrator role, active session, staging project only. |
| `staging-worker` | Tests staff-worker dashboard and assigned-job lifecycle. | Active worker, completed onboarding, linked portal identity, synthetic assignment. |
| `staging-volunteer` | Tests volunteer portal, room, opportunities, and proof surfaces. | Approved active volunteer, completed onboarding, linked portal identity. |
| `staging-member` | Tests member dashboard, member tasks, room, and completion note. | Approved active member, completed onboarding, linked portal identity. |
| `staging-non-admin` | Negative authorization control. | Authenticated ordinary user with no administrator role. |

Use random aliases and a run identifier rather than personal names. Store the credentials in the staging password manager, not in the repository, browser notes, screenshots, or chat.

## Synthetic fixtures

Create one synthetic worker assignment with a title such as `E2E-RUN-<run-id> Worker Task`. Use a harmless description, a future due date, and no real donor, beneficiary, payment, medical, or personal information. If the volunteer assignment schema is available in the staging branch, create one synthetic volunteer assignment separately; otherwise record that volunteer job execution is not part of this run.

Create no production campaign, donation, email campaign, or external file. If proof-link validation requires a URL, use an approved non-sensitive test document owned by the test team, or verify rejection with a safe example rather than uploading a real file.

## Preflight checks

| Check | Pass condition |
|---|---|
| Deployment | Staging URL is reachable and identifies the intended staging release. |
| Database | Staging URL, public key, and server-only key belong to the same staging project. |
| Browser | Use a clean profile or private window per identity; do not reuse production cookies. |
| Auth | All test identities are staging-only and can be deleted after the run. |
| Logging | Runtime logs redact cookies, tokens, passwords, email content, and proof URLs. |
| Safety | No Paystack/Stripe/Resend production action is enabled for the test run. |

## Worker workflow

1. Open the staging `/login` page in a clean worker browser profile.
2. Sign in with the staging worker email and password. Repeat the login check with the staging HMSI ID only if the account has been explicitly configured for that test.
3. Confirm the worker lands at `/portal/worker`, not an administrator, member, or volunteer workspace.
4. Confirm the menu contains only worker-relevant entries: My Jobs, Opportunities, Worker Operations Room, Submit Proof, Help, and Sign Out.
5. Open the synthetic assignment and verify title, description, required outcome, priority, due date, and assignee context.
6. Use **Accept and start job**. Confirm the status changes once to the permitted in-progress state.
7. Submit the approved synthetic proof link. Confirm the link is associated only with that assignment and that the UI gives clear success or validation feedback.
8. Complete the assignment with the permitted completion action. Confirm the completion state and timestamp are displayed.
9. Open the Worker Operations Room. Confirm access succeeds.
10. Attempt to open the volunteer and member rooms. Confirm the request is denied or redirected without exposing room messages.
11. Refresh the page and wait for the normal session refresh interval. Confirm the session remains active while valid and that no token appears in browser-visible response data.

## Volunteer workflow

1. Open `/login` in a separate clean browser profile and sign in as the staging volunteer.
2. Confirm routing to `/portal/volunteer` and verify that the menu contains only volunteer-relevant links.
3. Open the Volunteer Community Room and confirm access.
4. Open Opportunities and confirm the list is filtered to the volunteer’s eligible role/pathways.
5. Open the protected proof-link submission surface and submit only the approved synthetic URL, or test an invalid non-HTTPS URL and confirm safe rejection.
6. If the volunteer assignment model exists in staging, open the synthetic volunteer job, accept it, move it to in progress, submit proof, and complete it. If it does not exist, confirm the page explains that no assigned volunteer jobs are currently available rather than displaying fabricated work.
7. Attempt worker and member room URLs. Confirm denial or redirect.

## Member workflow

1. Open `/login` in a separate clean browser profile and sign in as the staging member.
2. Confirm routing to `/portal/member` and verify member-only menu entries.
3. Confirm only member-owned tasks appear.
4. Start the synthetic member task if one exists, submit the required completion note, and confirm the status/event is recorded once.
5. Open the HMSI Member Lounge and confirm access.
6. Attempt to view the worker assignment by ID or URL. Confirm no record is returned.
7. Attempt worker and volunteer room URLs. Confirm denial or redirect.

## Administrator workflow

1. Open `/login` in a separate clean browser profile and sign in as the staging administrator.
2. Open the dedicated `/admin/assignments` route through the Admin menu.
3. Confirm the assignment register shows the synthetic assignee’s safe display name and role, not merely an internal ID.
4. Open the assignment review surface and verify that title, description, status, priority, due date, and audit context are visible.
5. Edit one harmless field and confirm the server response and displayed value change.
6. Soft-delete the synthetic assignment with the required confirmation. Confirm it leaves the active register and appears in the archive with deletion actor, deletion time, recovery deadline, and recovery state.
7. If the restore endpoint has been deployed, restore the assignment inside the recovery window. Confirm it returns to the active register and that a restore audit event is recorded.
8. Confirm administrator-only controls are absent from worker, volunteer, and member sessions.

## Negative authorization checks

| Attempt | Expected result |
|---|---|
| No session → `/api/admin/assignments` | `401`, no records. |
| Staging non-admin → admin assignment list | `401` or `403`, no records. |
| Worker → member task ID | Denied or not found, no data leakage. |
| Member → worker task update | Denied, worker task unchanged. |
| Volunteer → worker room | Denied or redirected. |
| Worker → volunteer room API | Denied or redirected. |
| Browser → direct `work_assignments` table | Permission/RLS denial or approved empty result. |
| Browser → archive view | Permission denial. |
| Restore with forged actor/deadline fields | Server ignores client values and enforces identity/deadline. |
| Restore after an isolated expired deadline | `410`, remains soft-deleted. |

## Evidence and teardown

Record only sanitized outcomes: test name, role, route, expected status, actual status, deployment ID, migration ID, and timestamp. Never capture credentials, cookies, bearer tokens, raw setup links, service keys, or real personal data.

After the run, sign out every browser profile, delete the synthetic assignment through the approved staging teardown, delete the disposable identities from staging Auth, remove any synthetic proof document, and confirm no fixture appears in active or archive views. If any failure affects authorization, stop the run and do not promote the deployment.

## Completion gate

The run is complete only when every role reaches its correct dashboard, each role can access its matching room, ownership and mutation boundaries are enforced, the worker/member task lifecycle behaves correctly, volunteer behavior is honestly represented according to schema availability, administrator controls remain isolated, and teardown succeeds. A passing local test suite does not replace this staging browser run.

## References

[1]: https://supabase.com/docs/guides/auth "Supabase Auth documentation"
[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[3]: https://www.postgresql.org/docs/current/ddl-priv.html "PostgreSQL Database Roles and Privileges"
