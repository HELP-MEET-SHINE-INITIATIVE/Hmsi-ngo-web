# HMSI Governance Foundation Release

## Scope and operating boundary

This release introduces a **private governance foundation** for HMSI’s national, branch, regional-office, and programme operations. It does not create branches, programmes, people, authority assignments, tasks, financial records, or external messages. The data models are additive and historical people are not inferred or mapped to a branch or programme.

| Area | Implemented control | Boundary retained |
|---|---|---|
| Operational structure | RLS-protected `operational_units` and `programmes` registers, with optional references on people, assignments, member tasks, and opportunities | New units are drafted before activation; no historic mapping was created. |
| Presidential authority | Private organization-role, delegation, formal-approval, approval-event, and automation-run registers | Existing configured President administrator session remains the only live privileged browser sign-in. A delegation is recorded, scoped, reasoned, and time-bounded; it does not create account access. |
| Member lifecycle | Member invitations, onboarding tasks, onboarding progress, first-time password setup, and private task review parity | Member activation remains subject to existing approved/active status checks. |
| Work assurance | Member work transitions from assigned/in-progress to submitted; administrators approve or cancel only submitted work with a review note and audit event | Members cannot self-complete work; deleted work is excluded from active feeds. |
| Automation foundation | Private idempotency-ready `automation_runs` table and a manual **dry-run record** control | No new scheduler, recurring job, notification, task assignment, approval decision, or data change is triggered by the dry-run control. |

## Database security verification

The production migration `hmsi_governance_foundation_20260826` was applied to the existing HMSI Supabase project after compile and contract checks. Metadata verification confirmed all seven new governance tables have RLS enabled and **zero direct browser policies**. They are accessed only through protected server routes after administrator authorization.

The migration also removed anonymous and authenticated execution of `public.rls_auto_enable()`. The five security-advisor-flagged trigger helpers now use a fixed `search_path=pg_catalog, public`. The refreshed advisor reports the governance tables as `rls_enabled_no_policy` **INFO** findings, which is intentional for private server-only tables. The remaining material warning is Supabase Auth leaked-password protection, which is an account-level setting and was not changed in this release. Reference: [Supabase password security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Validation record

| Check | Result |
|---|---|
| Governance-focused contracts | Passed, including RLS/no-direct-policy migration posture, function hardening, member onboarding parity, same-origin mutation guards, review-note requirement, and no automatic notification assertion. |
| Full repository suite | **163 tests passed**. |
| Production build | Passed after type checking and route collection. Existing informational Next.js middleware/Edge-runtime warnings remain unrelated to this release. |
| Local passive route check | Unauthenticated `GET /api/admin/governance` returned `401` with a generic administrator-authentication response; public `/signup` returned `200`. |
| Production schema check | Member invitation role constraint now includes `member`; onboarding subject constraint permits a worker, volunteer, or member subject; onboarding task role constraint includes `member`; member onboarding status constraint was verified. |

## Deferred activation decisions

> Recurring outbound automation remains **disabled**. Any future notification, digest, automated workflow, or scheduled job requires a separate authorization specifying the exact workflow, cadence, recipients, sender, content, safeguards, and rollback/monitoring plan.

Activating a draft unit or programme, assigning organizational roles, issuing a real delegation, and deciding an approval request are intentionally explicit protected administrative actions. No production records of those types were created as part of this release.
