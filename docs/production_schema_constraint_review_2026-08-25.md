# Production Schema Constraint Review — 25 August 2026

**Author:** Manus AI
**Scope:** Read-only production metadata review of foreign-key delete actions, `password_setup_links` constraints/indexes, and row-level-security state.
**Excluded activities:** No schema migration, DDL, DML, retention run, user removal, email dispatch, authentication attempt, or production-row/PII retrieval was performed.

## Conclusion

The deployed `password_setup_links` table is configured as intended for one-time setup-link integrity: it has a primary key, a unique stored-token hash, mandatory expiry/relationship fields, two `ON DELETE CASCADE` foreign keys, the expected invitation-and-expiry index, and row-level security enabled. The database does **not** implement a universal immediate cascade-hard-delete of a person from Supabase Auth through every HMSI record. That is consistent with the approved 30-day recovery policy: access is revoked first and final deletion is performed later by an authenticated server-side retention workflow in a defined dependency order.

## Verified `password_setup_links` Configuration

| Area | Verified production state | Operational meaning |
|---|---|---|
| Primary identifier | `id` is a non-null UUID primary key. | Each setup-link record has a stable record identity. |
| Token protection | `token_hash` is non-null and protected by `password_setup_links_token_hash_key` (unique). | The table prevents duplicate stored hashes; raw setup tokens are not represented in the reviewed metadata. |
| Required relationships | `onboarding_invitation_id` and `hmsi_id_card_id` are non-null UUIDs. | A link must belong to both the onboarding invitation and the HMSI ID card. |
| Deletion behavior | Both setup-link foreign keys use `ON DELETE CASCADE`. | Deleting the linked invitation or ID card removes dependent setup-link records automatically. |
| Lifecycle fields | `expires_at` is non-null; `email_sent_at` and `setup_completed_at` are nullable timestamps. | The application can enforce expiry and one-time completion without retaining plaintext tokens. |
| Indexes | `password_setup_links_invitation_idx` indexes `(onboarding_invitation_id, expires_at DESC)`; primary-key and unique-token indexes are also present. | Invitation-scoped lookup and expiry ordering are indexed. |
| RLS | RLS is enabled; no direct table policies were returned. | The table is not opened by a public policy. Server-side service-role access must remain restricted to reviewed server routes because the service role bypasses RLS. |

## Verified Foreign-Key Deletion Map

| Parent / trigger | Dependent relationship | Verified action | Result |
|---|---|---|---|
| `onboarding_invitations` | `password_setup_links.onboarding_invitation_id` | `CASCADE` | Removing an invitation removes its setup-link records. |
| `hmsi_id_cards` | `password_setup_links.hmsi_id_card_id` | `CASCADE` | Removing an ID card removes its setup-link records. |
| `volunteer_applications` | `onboarding_invitations.volunteer_application_id` | `CASCADE` | Removing a volunteer application removes its invitations and therefore setup links through the invitation cascade. |
| `workers` | `portal_access_events.worker_id` | `CASCADE` | Worker-specific portal access-event rows are removed with a worker. |
| `workers` | `onboarding_invitations.worker_id` | `SET NULL` | The invitation can remain as an historical record with its worker reference cleared. |
| `workers` | `work_assignments.assigned_worker_id` | `RESTRICT` | The worker cannot be deleted until assignments are explicitly removed. |
| `workers` | `hmsi_monthly_worker_assessments.worker_id` | `RESTRICT` | The worker cannot be deleted until assessments are explicitly removed. |
| `hmsi_members` | `hmsi_member_tasks.assigned_member_id` | `RESTRICT` | The member cannot be deleted until member tasks are explicitly removed. |
| `hmsi_members` | `hmsi_school_enrollment_requests.member_id` | `CASCADE` | Dependent enrollment requests are removed with a member. |
| `auth.users` | `workers`, `volunteer_applications`, `hmsi_members` via `auth_user_id` | `SET NULL` | Supabase Auth deletion clears these application-side identity references; it does not cascade-delete the related business records. |

## Retention-Safe Boundary and Limitations

The currently deployed model is intentionally **not** an immediate, irreversible “delete user completely” cascade. The protected retention handler schedules final deletion after a 30-day recovery deadline. At finalization it explicitly deletes worker assignments and assessments before deleting the worker, removes member tasks before deleting a member, invokes Supabase Auth user deletion only after application-record cleanup, and records the completed purge. This explicit ordering is necessary because the reviewed `RESTRICT` constraints deliberately prevent accidental removal of active task or assessment history.

> **Confirmed distinction:** Setup-link cleanup is database-cascaded from its two direct parents. Person/account deletion is retention-managed and application-orchestrated; it is neither an immediate global cascade nor triggered merely by deleting an Auth user.

The review identified two important operating limits. First, enabled RLS with no table policy is a default-deny posture for roles subject to RLS, but it does not restrict a Supabase service-role client; protection therefore depends on the server-only implementation and route authorization. Second, the table contains an `expires_at` value but no database-native TTL/purge constraint was present in the reviewed metadata. Expired or completed links must remain rejected by the setup endpoint and should be removed only through an explicitly approved retention process if storage minimization is later required.

## Review Method and Confidence

The findings were obtained from production schema metadata only: `information_schema`, PostgreSQL constraint/index catalogs, and PostgreSQL RLS/policy metadata. The deployed metadata matched the committed `supabase/password_setup_links_patch.sql` design for the table's cascades, unique hash, invitation-expiry index, and RLS enablement. This review did not execute a destructive test, inspect individual user records, or assert a cascade configuration for unobserved/absent legacy tables such as generic `profiles`, `chat_messages`, or `task_assignments`.
