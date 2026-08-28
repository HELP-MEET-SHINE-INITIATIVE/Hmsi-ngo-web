# HMSI Secure Email-Match Backfill and Role Activation Runbook

**Author:** Manus AI  
**Date:** 27 August 2026  
**Status:** Review-ready; no user, role, or capability has been activated

## Objective

This runbook handles historical `organization_roles` records that identify a person only through `principal_email`. It uses email equality only to create a **private review candidate**, then requires identity evidence and two independent approvals before a protected server action binds the role to an Auth user and grants capabilities.

> An exact email match is a discovery clue. It is **not** proof that the current Supabase account is held by the person who received the historic HMSI authority, and it is never an automatic entitlement.

The process deliberately does not strip `+` suffixes, rewrite domains, rely on aliases, or use fuzzy matching. This avoids accidentally granting authority to a related but different account. A confirmed Auth email and an unbanned account are necessary candidate conditions, but they are not sufficient approval conditions.

## Deliverables and order of execution

| Sequence | Artifact | Outcome |
|---|---|---|
| 1 | `hmsi_scoped_roles_rls_dry_run_migration.sql` | Adds identity/capability fields but leaves historic roles unbound. |
| 2 | `hmsi_role_identity_backfill_review_dry_run.sql` | Creates the private candidate-review queue and performs no role binding, activation, or capability grant. |
| 3 | Protected role-review server workflow | Records reviewer identity, evidence reference, review decision, and approval request. |
| 4 | Protected activation server workflow | Rechecks the candidate against the live Auth account, verifies independent approval, binds the Auth UUID, creates approved capability grants, and audits the result. |

Both SQL artifacts end with `ROLLBACK` for staging review. To persist their DDL in staging, a database owner must create a separately reviewed copy and change **only** the final terminal statement to `COMMIT`. Never edit the security conditions to make a migration pass.

## Exact review procedure

### 1. Prepare a private staging review

Create named, disposable Auth accounts for a President candidate, Operations Administrator candidate, finance and safeguarding/compliance reviewers, a volunteer, a worker, a member, and an unauthorised user. The reviewer accounts must not be shared. Run the base scoped-role migration in dry-run form, inspect its output, then persist the reviewed copy only in staging.

Run `hmsi_role_identity_backfill_review_dry_run.sql` unchanged. It confirms the required base tables and the `auth.users.email_confirmed_at` field before it creates the queue. The script deliberately returns only opaque review IDs, role names, candidate Auth UUIDs, counts, and status indicators; it does not export email addresses or persist a deterministic email fingerprint. The protected activation route re-reads the source email from `organization_roles` and compares it with the reviewed candidate account in the same final transaction.

### 2. Triage each result

| Review status | Meaning | Required disposition |
|---|---|---|
| `pending_identity_verification` | One exact, confirmed, currently unbanned Auth candidate exists and the role is unbound. | Obtain independent identity and appointment evidence; do not activate yet. |
| `requires_email_correction` | The historic role has no usable email. | Correct the source role record through a separate, approved data-quality process; then refresh the queue. |
| `no_exact_auth_match` | No Auth user exactly matches the historic role email. | Do not create an account or alter an existing account from the backfill. Contact the authority holder through a trusted off-platform process and complete normal onboarding. |
| `ambiguous_auth_match` | More than one exact Auth match was returned. | Block activation and investigate with security/identity owners. Do not select the “most likely” account. |
| `candidate_not_eligible` | One candidate exists but its email is unconfirmed or account is currently banned. | Block activation. Resolve the account condition independently, then refresh and repeat review. |
| `already_bound_same` | The role already maps to the exact candidate. | Treat as a historical reconciliation finding. Verify existing permissions; do not issue duplicate grants. |
| `already_bound_conflict` | The role maps to a different Auth ID than the discovered candidate. | Treat as a security incident or data-integrity exception. Suspend affected role capability grants while investigated. |
| `approved_for_activation` | A protected reviewer recorded the evidence and approval request ID. | Proceed only after the separate approval workflow is complete and still valid. |
| `stale` | The source email or candidate record changed after review. | Re-run discovery and identity verification; prior approvals cannot be reused. |

### 3. Verify identity outside of the email-match query

An authorised governance reviewer must verify the person’s role appointment using an official HMSI record or signed governance decision. The reviewer compares the verified organisational contact method with the candidate’s confirmed sign-in account. The review record should store only a short internal evidence reference—such as a board-resolution or personnel-file reference—not an attachment, raw identity document, phone number, message body, password, or payment data.

The prospective role holder must not approve their own record. An administrator running the technical activation also should not be the sole approver.

### 4. Open an approval request

Create an `approval_requests` record through the protected governance route with the following fields. The migration extends the request with the needed `action_key`, target, evidence, requestor, and expiry metadata.

| Field | Required value |
|---|---|
| `action_key` | `governance.role_grant` |
| `target_type` | `organization_role` |
| `target_id` | The specific `organization_roles.id`, never only the person’s email |
| `requested_by_auth_user_id` | The named requestor’s Auth UUID |
| `evidence_reference` | Approved, minimally descriptive internal evidence reference |
| `expires_at` | A short, explicit deadline appropriate to the governance workflow |
| Requester | Not the prospective role holder and not a co-approver |

For the first President or first Operations Administrator, ordinary in-application approval cannot be treated as a bootstrap substitute if no independent authorised roles exist yet. Use a documented two-person board/trustee decision and a controlled, time-bound database-owner activation window. The bootstrap decision must identify the two named approvers, the exact candidate Auth UUID, intended role, capabilities, evidence reference, and rollback owner. Once the first independent governance accounts are active, all later role grants must use the normal protected workflow.

## Co-approval requirements

The approval-policy baseline requires two **distinct** approver Auth UUIDs and forbids requester self-approval. For a `governance.role_grant`, HMSI should require one operational/governance approver and one independent control reviewer. Neither can be the candidate.

| Role being activated | Required two-person pattern | Notes |
|---|---|---|
| President | Two independent board/trustee approvers during the one-time bootstrap, recorded in the approval evidence and audit record. | The candidate cannot be an approver; do not use a generic admin session. |
| Operations Administrator | President or independently authorised governance approver **and** Compliance/Read-only Auditor or appointed trustee reviewer. | Avoid a single administrator creating another administrator. |
| Finance Administrator | President/Operations governance approver **and** an independent finance or compliance reviewer. | Does not grant unilateral application of financial corrections. |
| People & Safeguarding Administrator | President/Operations governance approver **and** independent safeguarding/compliance reviewer. | Do not include unrelated people records in the evidence. |
| Editorial Administrator | President/Operations governance approver **and** independent compliance/editorial oversight reviewer. | Publishing rights remain separately limited. |

The protected activation routine must count `approval_events.action = 'approved'` by distinct `actor_auth_user_id` values, ensure that none equals the candidate or requestor, ensure the approval request is unexpired, and ensure the action has the evidence reference. It must not accept a summary `decided_by` field alone as proof of two-person approval.

## Protected activation transaction requirements

The activation transaction is a server-side operation, not a direct browser or SQL-console flow. It must execute in one transaction after verifying the current session, same-origin mutation request, capability to administer roles, and the valid approval request. It must re-query the candidate identity at transaction time, because Auth email, confirmation state, bans, and role bindings may have changed after the queue was generated.

```sql
-- Pseudocode contract for the protected server transaction; values originate
-- from authenticated server context, never browser-supplied email strings.
begin;

-- Lock the review and role rows, then re-check all conditions:
-- 1. review_status = 'approved_for_activation';
-- 2. the live lower(trim(principal_email)) still exactly equals the reviewed
--    candidate's current lower(trim(auth.users.email));
-- 3. exactly one current auth.users email matches and it is the reviewed UUID;
-- 4. candidate email_confirmed_at is non-null and banned_until is null/past;
-- 5. role.auth_user_id is null; role status is active;
-- 6. approved request targets this exact role, is unexpired, has evidence, and
--    contains two distinct qualifying approval_events; candidate/requester are excluded.

update public.organization_roles
set auth_user_id = :reviewed_candidate_auth_user_id,
    assigned_by_auth_user_id = :executing_auth_user_id
where id = :organization_role_id
  and auth_user_id is null
  and status = 'active';

insert into public.role_capability_grants (
  organization_role_id, capability, granted_by_auth_user_id, reason
)
select :organization_role_id, template.capability, :executing_auth_user_id,
       'Approved role activation; see approval request ' || :approval_request_id::text
from public.role_capability_templates as template
where template.role = :approved_role_name;

update public.role_identity_backfill_reviews
set review_status = 'activated',
    approval_request_id = :approval_request_id,
    activated_at = timezone('utc', now()),
    activated_by_auth_user_id = :executing_auth_user_id,
    updated_at = timezone('utc', now())
where id = :review_id
  and review_status = 'approved_for_activation';

insert into public.authorization_audit_events (
  actor_auth_user_id, actor_role, action_key, target_type, target_id,
  approval_request_id, route_key, result, reason_code
) values (
  :executing_auth_user_id, :executing_role, 'governance.role_grant',
  'organization_role', :organization_role_id, :approval_request_id,
  'admin.governance.role-activation', 'allowed', 'approved_backfill_activation'
);

commit;
```

The placeholder notation is intentional: these values must come from a protected route after authorization, not from a manually edited browser request. If any validation produces no row or a conflict, the transaction must roll back without granting a capability.

## Staging tests and production gate

| Test | Expected outcome |
|---|---|
| One exact confirmed, unbanned candidate | Queue only; no `organization_roles.auth_user_id` or capability row changes. |
| No exact candidate | `no_exact_auth_match`; activation endpoint rejects it. |
| Duplicate candidate | `ambiguous_auth_match`; activation endpoint rejects it. |
| Candidate unconfirmed or banned | `candidate_not_eligible`; activation endpoint rejects it. |
| Historic role already mapped to another UUID | `already_bound_conflict`; investigate before any entitlement change. |
| Candidate changes email after review | Source/candidate recheck fails and status becomes `stale`; old approval is not reusable. |
| Candidate self-approves | Reject before binding or grant creation. |
| One approver only or same person twice | Reject before binding or grant creation. |
| President/Operations role activates correctly | Only the approved Auth UUID receives the template capabilities; a generic admin account receives none. |

Production activation requires a completed staging test record, named Auth UUIDs, evidence references, two independent approvers, a rollback owner, a short deployment window, and read-only post-activation verification. If a role is incorrectly activated, first revoke its `role_capability_grants`, set the role to `suspended` or `revoked`, invalidate the user’s privileged session, and preserve the review/approval/audit records for investigation.

## References

[1] [Supabase, “Row Level Security.”](https://supabase.com/docs/guides/database/postgres/row-level-security)
