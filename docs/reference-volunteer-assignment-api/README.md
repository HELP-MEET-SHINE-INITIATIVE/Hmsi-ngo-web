# Volunteer Assignment and Proof API Reference

This directory contains a reference implementation for the HMSI volunteer assignment and private proof workflow. It is intentionally separated from the live application routes because the current repository’s deployed schema and route conventions must be reconciled before migration or production enablement.

## Files

| File | Purpose |
|---|---|
| `../volunteer_task_assignment_schema_rls.sql` | Additive tables, constraints, indexes, helper functions, and restrictive RLS policies |
| `portal-tasks-route.ts` | Volunteer-only task feed and guarded lifecycle transitions |
| `admin-volunteer-assignments-route.ts` | Administrator-only assignment creation with eligibility checks and idempotency |
| `volunteer-proof-route.ts` | Volunteer-owned HTTPS Google Drive/Docs proof submission |
| `admin-assignment-review-route.ts` | Administrator review, completion, revision, rejection, cancellation, and recovery |

## Suggested route placement

After reconciling imports and local helpers, the route files can be adapted to:

```text
app/api/portal/tasks/route.ts
app/api/portal/tasks/[id]/proofs/route.ts
app/api/admin/volunteer-assignments/route.ts
app/api/admin/volunteer-assignments/[id]/route.ts
```

The reference imports the existing HMSI `getPortalIdentity`, `getAdminEmailFromCookie`, and `getSupabaseAdmin` helpers. It does not expose a Supabase service key to the browser.

## Endpoint contract

| Endpoint | Actor | Purpose |
|---|---|---|
| `GET /api/portal/tasks` | Approved active volunteer | Read only the volunteer’s non-deleted assignments |
| `PATCH /api/portal/tasks` | Assigned volunteer | Move `assigned → accepted/in_progress` or `in_progress → submitted` with an expected-current-status guard |
| `POST /api/portal/tasks/[id]/proofs` | Assigned volunteer | Submit a private, validated Google Drive/Docs link and move the assignment to `submitted` |
| `POST /api/admin/volunteer-assignments` | Authorized administrator | Create a task for an approved, active, completed, non-deleted volunteer |
| `PATCH /api/admin/volunteer-assignments/[id]` | Authorized administrator | Review, complete, request revision, reject, cancel, or restore within the recovery window |

## Important transaction note

The proof route includes a clearly marked sequential reference flow. For production, replace that sequence with a reviewed PostgreSQL RPC or equivalent transaction that inserts the proof, conditionally changes the assignment status, and writes the audit event atomically. If any step fails, the route must return a reconciliation-required outcome and must not silently report success.

Likewise, assignment creation should use a transaction or an outbox pattern that prevents a created assignment from being reported as fully dispatched when idempotency or audit recording failed. Notification sending must happen after the durable assignment and audit event exist, with a separate idempotent notification record.

## RLS model

RLS allows a volunteer to select only their own active assignments and proofs. It provides no direct volunteer insert/update/delete policy. The protected server routes use the service client only after application-layer authorization and input validation. Administrator custom-session authorization is performed by the server helper; if direct Supabase Auth access is also required, map administrator claims to the reviewed `is_hmsi_admin()` helper rather than broadening the policy.

## Required tests

At minimum, test unauthenticated access, role mismatch, cross-volunteer reads, forged volunteer IDs, pending/rejected/inactive/deleted volunteer assignment, duplicate `Idempotency-Key`, invalid transitions, stale expected status, invalid proof host, non-HTTPS proof, assignment ownership mismatch, audit failure, notification failure, soft-delete filtering, expired restore, and double restore. Use disposable identities and synthetic fixtures only.

## Required deployment review

Before applying the SQL, compare every referenced column with the deployed schema, inspect foreign-key dependency order, review `SECURITY DEFINER` search paths and ownership, verify that no public RLS policy exists, and apply through the approved migration workflow. Run schema catalog checks, API integration tests, type checks, and browser smoke tests before enabling real volunteer assignments.
