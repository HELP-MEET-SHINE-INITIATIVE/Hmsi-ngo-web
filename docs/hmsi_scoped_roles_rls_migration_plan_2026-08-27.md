# HMSI Scoped Roles, Executive Room Access, and RLS Migration Plan

**Author:** Manus AI  
**Date:** 27 August 2026  
**Status:** Drafted for staging review; **not applied** to any database

## Purpose and decision boundary

This package replaces the current shared-administrator pattern with individually authenticated, scoped roles. It also provides the President and Operations Administrator with comprehensive dashboard access to approved volunteers, workers, members, and the volunteer/worker/member/community rooms. The access is intentionally implemented as named, audited authority rather than an anonymous, shared, or universal bypass.

> **Interpretation of the requested “unrestricted” room access:** The President and Operations Administrator can view all approved-person directories, work/assignment summaries, role-room messages, and community-room moderation states from protected dashboards. They may perform only the operations explicitly granted to their role. Permanent deletion, financial application, role elevation, bulk export, safeguarding exceptions, and production configuration changes remain independently approval-gated.

This boundary preserves executive operational visibility without removing accountability controls. Supabase’s `service_role` bypasses RLS, so a database policy alone cannot protect a server route that uses it; the implementation must combine server-side authorization, least-privilege grants, and RLS for direct database access [1].

## Current-state findings

The existing governance schema already provides `organization_roles`, `authority_delegations`, `approval_requests`, `approval_events`, and `automation_runs`. However, it records role assignments by email and does not bind every role to a Supabase Auth user ID or to atomic capabilities. The current President’s Office is authenticated through the same generic administrator cookie as the wider admin centre, rather than a distinct President identity.

The portal contains two room models. `role_room_messages` stores worker, volunteer, and member role-room messages, while `community_posts`, `community_comments`, and `community_likes` contain the broader community feed. Existing server APIs use the Supabase admin client after their application checks. The original community-table migration also leaves broad direct-client public policies in place. The proposed script replaces those known policies with limited public read access for published `all`-audience content and scoped authenticated access for role rooms.

A bounded, read-only production metadata check completed on 27 August 2026 confirmed that the expected governance, directory, and room tables exist. It also confirmed that `anon` and `authenticated` currently retain broad table grants on the reviewed records, while the only active policies among the reviewed tables are the seven legacy public community-feed policies. This validates the migration’s revoke-and-grant sequence and the decision to fail closed if an unreviewed community policy is detected. No production schema, row, role assignment, session, or policy was changed during this check.

| Existing asset | Migration use |
|---|---|
| `organization_roles` | Becomes the role assignment record bound to `auth.users.id`. |
| `authority_delegations` | Supports bounded, time-limited delegated capabilities after server enforcement is added. |
| `approval_requests` and `approval_events` | Carries evidence, requester/decider identity, and approval context for high-risk actions. |
| `approved_contact_directory` | Remains the preferred unified directory for executive people operations; raw people tables are not broadly exposed through direct client RLS. |
| `role_room_messages` | Supports approved role-room visibility, with executive `rooms.read_all` access. |
| `community_*` tables | Supports scoped room visibility and moderation; direct writes remain server-only. |

## Target authorization model

The target model distinguishes identity, role, capability, scope, and approval. A Supabase Auth user supplies the individual identity. An `organization_roles` record assigns a named role. `role_capability_grants` defines the allowed actions. The operational-unit and programme columns on the role or delegation define scope. Finally, `approval_policies` identifies actions where the capability itself is insufficient without independent review.

| Role | Volunteer, worker, member and room access | Other key authority | Not a unilateral right |
|---|---|---|---|
| **President** | Read all approved directories, people records, assignments, role-room messages, and community states; moderate rooms. | Executive dashboard, governance review, role administration requests, finance overview, editorial and audit access. | Role grant/revocation, permanent deletion, financial apply/refund, bulk export, policy exception, or production change. |
| **Operations Administrator** | Read all approved directories, people records, assignments, role-room messages, and community states; moderate rooms. | Assignment management, task review, programme/operations overview. | Financial finalization, unrestricted role administration, permanent deletion, or sensitive bulk export. |
| **People and Safeguarding Administrator** | Approved-person directory and role-relevant record access; task review where assigned. | Safeguarding review. | Finance, unrelated editorial administration, and unrestricted room/people export. |
| **Editorial Administrator** | Room moderation visibility only where editorial moderation requires it. | Editorial review, publishing workflow. | People directory, financial records, and role changes. |
| **Finance Administrator** | No blanket community/people access. | Finance dashboards and reconciliation preparation. | Applying correction/refund without independent approval. |
| **Read-only Auditor** | No people directory or room-content access by default. | Governance and privacy-minimized audit review. | All mutations and exports. |

## Database migration contents

The accompanying [`hmsi_scoped_roles_rls_dry_run_migration.sql`](../supabase/hmsi_scoped_roles_rls_dry_run_migration.sql) is transaction-wrapped and ends with `ROLLBACK`. It checks its prerequisites before performing any DDL, does not change people/assignment/donation rows, and does not seed an actual President or administrator.

| Migration area | Change | Reason |
|---|---|---|
| Individual role identity | Adds `auth_user_id`, `assigned_by_auth_user_id`, and `revoked_by_auth_user_id` to `organization_roles`. | Ties privileged authority to named authentication identities rather than a shared email/password session. |
| Capability grants | Creates `role_capability_grants` and `role_capability_templates`. | Separates what a role can do from its display name and enables future narrow delegations. |
| Delegation binding | Adds Auth IDs and additional bounded delegation scopes. | Makes time-limited delegation enforceable using a named account, expiry, and purpose. |
| Approval policy | Creates `approval_policies` and extends approval requests/events with identity, evidence, target, and expiry metadata. | Provides an enforceable control point for actions that require a second approver. |
| Audit evidence | Creates `authorization_audit_events`. | Logs action category, role, result, route, and non-sensitive target reference—without passwords, payment references, message bodies, or donor data. |
| RLS helpers | Adds `hmsi_auth.has_portal_role` and `hmsi_auth.has_capability`. | Allows direct database policies to test active Auth identity plus current role/delegation scope. |
| Direct-client grants | Revokes client access to directories, role registers, approvals, and audit records; allows selected room reads only. | Keeps personal data and governance records behind protected server APIs. |
| Room policies | Restricts role rooms to the matching active role; gives executive `rooms.read_all` capability visibility across rooms; leaves direct room writes unavailable. | Delivers executive oversight while preserving anti-spam and route-level validation. |
| Policy preflight | Aborts when a community policy outside the reviewed legacy/target set is found. | Prevents accidentally retaining a future policy that could broaden access after the limited read grant is restored. |

RLS must be accompanied by explicit grants. A policy by itself does not remove existing table privileges, which is why the script revokes client grants before granting back limited room-read access [1].

## Required server-side implementation after the database migration

The SQL migration sets the data and direct-client boundary. It must not be treated as a complete authorization implementation until the routes below call capability checks before using the service-role Supabase client.

| Route or module | Required change | Capability |
|---|---|---|
| `lib/adminSession.ts` | Replace the single shared static administrator identity with individual Supabase Auth session verification for privileged users. Retain a temporary compatibility adapter only during a short, approved cutover. | N/A; identity resolution only. |
| `lib/portalAuth.ts` | Add a separate privileged identity resolver that reads the named Auth user and active scoped roles; do not infer administrative rights from user-editable metadata. | N/A; identity resolution only. |
| `app/api/admin/presidents-office/route.ts` | Require `executive.dashboard.read` plus `people.directory.read_all`, `people.records.read_all`, `assignments.read_all`, and `rooms.read_all` as applicable. Return aggregate-first data and load contact details only for a purpose-specific view. | President or delegated appropriate role. |
| New `app/api/admin/rooms/route.ts` | Provide a bounded all-rooms overview and room detail API. Require `rooms.read_all`; require `rooms.moderate` for hold/publish/hide actions. Audit every decision. | `rooms.read_all`; `rooms.moderate`. |
| Admin people/assignment routes | Require the narrowest capability for list, detail, assignment, review, restore, and deletion actions. | `people.*`, `assignments.*`, `tasks.review`. |
| `app/api/admin/governance/route.ts` | Replace generic session equivalence with `governance.*` checks. Rework `decide_approval` to prohibit requester self-approval, verify `approval_policies`, evidence, expiry, and distinct approvers. | `governance.*` plus relevant approval policy. |
| Moderation routes | Check `rooms.moderate`; record a privacy-minimized audit event containing action/result but not room content. | `rooms.moderate`. |

The current `getSupabaseAdmin()` client should remain server-only. Every use of it for protected data must first resolve the individual session, validate same-origin for a mutation, test the assigned capability and relevant operational scope, execute the action, then write an audit result. Since service-role access bypasses RLS, this ordering is mandatory [1].

## Deployment sequence

### Stage 1 — Baseline and dry run

First, export a metadata-only inventory of the production/staging grants, existing policies, constraints, and route-to-table map. Do not export contact details, donor data, message bodies, or credentials. Apply the supplied migration unchanged to an isolated staging database; its terminal `ROLLBACK` provides syntax and prerequisite validation without persisting any DDL.

### Stage 2 — Staged apply and identity binding

After review, change **only** the final `ROLLBACK` to `COMMIT` in a copy of the reviewed script and run it once in staging. Create disposable Auth users for President, Operations Administrator, Finance Administrator, Editorial Administrator, people/safeguarding administrator, a volunteer, a worker, a member, and an unauthorized user. Assign roles through a protected seed/admin flow using the Auth user ID, not email alone.

### Stage 3 — Server and dashboard cutover

Deploy the new authorization helper and server guards before enabling privileged dashboard navigation. The dashboard may show room and people links only after a successful capability query, but client-side display logic is not an access control. Add the protected all-rooms page for the President and Operations Administrator, including filters for room type, moderation state, operational unit, and date—without exposing raw message text in general dashboard overviews.

### Stage 4 — Test, approve, and production cutover

Run the required database, route, and browser tests. Obtain the named-role approval record and a production window. Apply the reviewed transactional migration, deploy the server guards, seed only the confirmed President and Operations Administrator identities, re-run the production-safe read-only checks, and monitor privacy-minimized authorization events. Do not revoke the legacy generic administrator path until individual-account sign-in and recovery have been verified; remove it promptly after the agreed cutover window.

## Staging test matrix

| Scenario | Expected result |
|---|---|
| Anonymous direct database request | Cannot read role-room messages, people directory, governance roles, approvals, or held room content. It may read only published `all`-audience community content. |
| Active volunteer | Can read the published volunteer and `all` community audience and the volunteer role room; cannot read worker/member rooms or held content. |
| Active worker | Can read the published worker and `all` community audience and the worker role room; cannot read volunteer/member rooms or held content. |
| Active member | Can read the published member and `all` community audience and the member role room; cannot read volunteer/worker rooms or held content. |
| President | Can read all three people populations and all room/moderation states through protected server APIs; can moderate only through the audit-producing route. |
| Operations Administrator | Can perform the same people/room oversight needed for operations, without finance finalization or unilateral role administration. |
| Finance Administrator | Cannot browse people rooms or role-room messages merely because they have finance access. |
| Expired delegation | Cannot access the delegated capability after `ends_at`, even when a stale dashboard menu is cached. |
| Self-approval attempt | Fails before financial correction, role elevation, permanent deletion, export, retention exception, or production-config action is applied. |
| Service-role route without capability check | Must be prevented by unit/integration test; RLS is not expected to block service-role traffic. |

For direct Supabase access, run pgTAP RLS tests with `anon`, authenticated volunteer/worker/member identities, executive identities, and unauthorized identities. Assert both grants and policy outcomes; a denied `SELECT` may return zero rows while a missing grant produces PostgreSQL `42501` [1].

## Rollback and incident response

The initial dry-run file rolls back automatically. For a persisted staging or production deployment, do not attempt to drop role/audit records casually. First disable the new privileged dashboard routes, revoke the relevant `role_capability_grants` records, set affected `organization_roles.status` to `suspended` or `revoked`, and invalidate privileged sessions. Preserve approval and authorization audit data. Then restore the prior known-good server deployment and review the exact grants/policies captured in the pre-deployment metadata snapshot.

If a policy unexpectedly blocks an essential dashboard read, do not broaden it to `using (true)`. Confirm the Auth identity, role binding, capability template, active status, scope, table grant, and route guard in staging, then make the smallest constrained correction. A generic shared service role or a blanket public policy must not be used as a workaround.

## Explicit approvals required before implementation

The scripts are ready for code review but not authorized for database application or authentication changes. Before implementation, HMSI needs to approve the exact Supabase Auth user IDs for the President and initial Operations Administrator(s), decide the temporary legacy-admin cutover window, confirm who may independently approve each high-risk `approval_policies` action, and authorize an isolated staging test.

No credentials, donor data, payment references, actual contact details, message text, or production rows are present in this package.

## References

[1] [Supabase, “Row Level Security.”](https://supabase.com/docs/guides/database/postgres/row-level-security)
