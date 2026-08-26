# HMSI Volunteer Assignment: Live Schema and Security Verification

**Verification date:** 26 August 2026  
**Database project:** HMSI production Supabase project (identifier omitted from this record)  
**Scope:** Additive volunteer assignments, private proof metadata, audit events, and row-level security policies.

## Confirmed deployment state

The `volunteer_assignment_workflow` migration was applied successfully. The live schema now contains `volunteer_assignments`, `volunteer_assignment_proofs`, and `volunteer_assignment_events`. The existing `volunteer_applications` table has the required `status`, `account_status`, `applicant_role`, and nullable `auth_user_id` fields used by the server-side eligibility check.

The verification query returned the following intended RLS policies:

| Table | Policy | Operation | Intended boundary |
|---|---|---|---|
| `volunteer_assignments` | `Volunteer can view own active assignments` | `SELECT` | An authenticated, approved, active volunteer can read only active tasks assigned to the matching application record. |
| `volunteer_assignment_proofs` | `Volunteer can view own assignment proofs` | `SELECT` | An authenticated, approved, active volunteer can read only proof metadata they submitted. |

No direct browser insert, update, or delete policy was granted for assignments, proofs, or events. Protected Next.js routes authenticate the portal or administrator session, check assignment ownership and state, validate proof hosts, and then use the server-side service role to write bounded data and audit records.

## Security-advisor finding interpretation

Supabase reported `RLS Enabled No Policy` for `public.volunteer_assignment_events`. For this event ledger, the finding is expected: no browser role should be able to read or mutate audit events. It remains RLS-enabled with no policy, and only the server-side route may write through the service-role client after an authorization check. This design is intentional and must be retained.

The advisor also reported multiple pre-existing information/warning findings involving unrelated tables and functions. They were not introduced or modified by the volunteer assignment migration. In particular, broader remediation is still needed for the existing public `rls_auto_enable()` SECURITY DEFINER execution exposure and leaked-password-protection configuration; neither control should be changed as an incidental part of the volunteer release.

## Release boundary

The migration is live. A live assignment was **not** created, no volunteer was contacted, and no proof link or personal information was accessed. End-to-end lifecycle behavior remains validated with synthetic local fixtures until an authorized administrator performs a controlled staging or production canary using a disposable approved volunteer account.
