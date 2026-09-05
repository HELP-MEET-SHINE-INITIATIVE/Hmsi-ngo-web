# HMSI Database, Security, and Long-Term Operating Ecosystem Review

**Date:** 26 August 2026  
**Scope:** Read-only assessment of the live HMSI Supabase metadata, relevant portal authorization and onboarding code, and a current security-advisor scan. No production records, secrets, proof links, credentials, payments, messages, or application data were accessed or changed.

## Executive assessment

HMSI already has a substantial operational database foundation. It can hold the core information needed for the current portal: applications, approved people, onboarding, role-specific assignments, task evidence, communications, news, fundraising, donations, training, rooms, regional offices, and audit events. Its strongest current controls are **row-level security on all inventoried public tables**, server-side role resolution for workers, volunteers, and members, administrator-gated President’s Office data, private contact directories, and explicit worker/volunteer work-review states.

The database is therefore **suitable for the present multi-role portal**, but it is **not yet a complete long-term branch operating system**. Regional offices exist as a reference table, yet people and most operational records are not consistently linked to a structured office/programme identifier. The President’s Office is protected, but it is currently tied to one configured administrator credential rather than a durable delegated-authority model with scoped approvals, temporary delegation, and two-person controls. The most urgent technical remediation is to address the security-advisor warnings around a publicly executable security-definer function, mutable function search paths, and leaked-password protection.

> **Conclusion:** HMSI should retain its present portal as the core operational system, strengthen the security baseline, then add a structured branch/programme model and a governance layer above the existing people, task, and approval workflows. It does not need to replace the current database.

## What the current database already covers

| Operating area | Current model observed | Assessment |
|---|---|---|
| Applicant intake | Volunteer/worker intake, member applications, and a private normalized-email registry | **Strong.** One-email reservation prevents duplicate applicant requests before a second intake record or notification is made. |
| People records | Workers, approved volunteers, members, approved-contact directory, ID cards, profile data, locations | **Strong.** Approved contact readiness is separated from public views and can support official notifications. |
| Onboarding | Invitations, task templates, task progress, invitation acceptance, password-setup links, HMSI IDs | **Good for workers and volunteers.** Member onboarding should be brought into the same formal invitation/progress lifecycle. |
| Assignments and review | Separate worker, volunteer, and member task stores; work/volunteer event logs; proof flow; soft-delete fields on worker/volunteer assignments | **Good but uneven.** Worker and volunteer completion records contain review metadata. Member tasks should receive equivalent submission, review, audit, and recovery controls. |
| Editorial and public information | News, approval events, publisher role, evidence metadata, archive dates, gallery, newsletter drafts | **Strong.** The system supports an approval-based publication boundary. |
| Fundraising and donations | Fundraisers, donations, provider verification, acknowledgements, delivery states | **Strong foundation.** Keep financial approval and adjustment authority separated from communications and content roles. |
| Training and education | Training modules/enrollments, school modules, school certificates, assessments | **Good.** Training is one of the few areas already linked to regional offices. |
| Branch operations | Regional offices, office code/state/coordinator/headcount | **Partial.** The office reference model exists, but most people, assignments, opportunities, and programme outcomes are not consistently linked to an office ID. |
| Audit and communications | Portal access events, role/assignment events, notification records, assistant/operator actions | **Good foundation.** Standardize retention, event naming, and investigation views before scale. |

## Current security posture

### Verified strengths

All inventoried tables in the production public schema reported **row-level security enabled**. The portal resolves contributors as `worker`, `volunteer`, or `member` only after checking their approved/active state. The President’s Office route independently checks an administrator session before returning its directory, task progress, and review queue. This aligns with the least-privilege principle: permissions should be limited to the resources necessary for an assigned function.[1]

Private operational tables such as the duplicate-email registry, approved-contact directory, certain audit/event stores, and credential-related records have RLS with no direct browser policy. This is appropriate **when those tables are deliberately server-mediated**: no direct policy means the browser is denied, while protected server routes enforce the business rule. This choice should be documented table by table and verified with negative role tests; it must not be interpreted as a universal security guarantee for service-role code.

The code review also shows several complementary application controls: administrator session validation, portal-session role resolution, short-lived onboarding/password-setup records, approved-role checks, official notification routing, and task lifecycle data that allows an administrator to review submitted work before final completion.

### Remediation priorities

| Priority | Finding | Risk | Recommended action |
|---|---|---|---|
| **P0 — before expanding privileged automation** | `public.rls_auto_enable()` is a `SECURITY DEFINER` function executable by anonymous and authenticated roles | A public caller may reach a privileged function unexpectedly | Confirm its business purpose. If it is administrative-only, revoke public `EXECUTE`; otherwise redesign it as a narrowly validated invoker function. Add a regression test proving anonymous invocation is denied. |
| **P1 — next database hardening release** | Several trigger/helper functions use a mutable `search_path` | Function behavior can be affected by an unexpected object-resolution context | Redefine each affected function with an explicit safe `search_path`, qualify table references, and test the triggers. |
| **P1 — authentication policy** | Leaked-password protection is disabled | Users may select known compromised passwords | Enable leaked-password protection in the authentication configuration, publish the updated password guidance, and test recovery/password-setup flows. |
| **P1 — President authority** | President’s Office uses a single configured administrator identity | It does not provide delegated scope, secondary approvers, or a durable authority history | Introduce explicit organization roles, scoped delegations, and authority audit events without removing the existing fail-closed administrator check. |
| **P2 — member parity** | Member tasks do not evidence the same explicit review fields as worker/volunteer tasks | Member work may not have the same administrator-review traceability | Add submitted/reviewed/review-note/event/recovery fields and align the API state machine. |
| **P2 — regional scale** | Regional office linkage is not yet present across people, assignments, opportunities, and programme work | Branch reporting can become manual or inconsistent | Add a branch/programme relationship model, backfilled only after an administrator verifies each mapping. |

## Branch and programme readiness

The present `regional_offices` table can represent HMSI branches, but it is currently more of a registry than a full operating dimension. For long-term use, every operational object should be attributable to one of three scopes:

| Scope | Purpose | Examples |
|---|---|---|
| **National** | President-led or central-service work | governance, national fundraising, policy, organization-wide media |
| **Programme** | A defined service line or campaign | humanitarian response, education, advocacy, community outreach |
| **Branch / regional office** | Delivery accountability by location | a state office, local outreach unit, or field coordination team |

The recommended additive model is `operational_units` (national/branch/programme) plus `programme_units` for programmes delivered in multiple branches. Add nullable `operational_unit_id` or `programme_id` references to people, opportunities, assignments, external submissions, relevant donations/fundraisers, and outcome records. Use a migration and a phased administrator-reviewed backfill; do not infer an office from a free-text location.

Each unit should have a code, status, responsible coordinator, safeguarding contact, financial contact, activation/deactivation dates, and a small set of measurable indicators. A coordinator may see only their unit by default; the President’s Office sees summarized national data with a controlled drill-down path.

## Recommended onboarding-to-work lifecycle

Microsoft’s nonprofit volunteer-management guidance emphasizes approval, onboarding stage tracking, opportunities, qualification information, communications, attendance, and engagement insight as distinct operational capabilities.[2] HMSI already has many of these pieces. The recommended improvement is to make the lifecycle consistent for **members, volunteers, and workers**.

| Lifecycle stage | Required system action | Human authority |
|---|---|---|
| 1. Application | Normalize email, reserve one application, collect location, role interest, and consent | Applicant submits; no automatic approval |
| 2. Intake triage | Screen for completeness, duplicate, safeguarding flag, and target branch/programme | Operations reviewer |
| 3. Approval decision | Approve, request clarification, or reject with recorded reason | Authorized administrator; President only for escalated/high-risk cases |
| 4. Provisioning | Create or activate approved people record, approved-contact readiness, branch/programme link, role template | Deterministic system event after approval |
| 5. Onboarding | Issue time-limited invitation, role checklist, policy/safeguarding acknowledgement, training requirements | Person completes; coordinator follows up |
| 6. Access activation | Create HMSI ID, one-time password setup, minimal portal role and room access | System only after onboarding conditions are met |
| 7. Work allocation | Match approved active availability/skills/location to an opportunity or task | Coordinator assigns; system prepares notice |
| 8. Work review | Contributor submits work or proof; reviewer approves, requests revision, or cancels | Assigned reviewer; escalated work to President authority where required |
| 9. Retention and improvement | Record training, attendance, quality, recognition, departure, and retention outcomes | Coordinators manage; President receives aggregate trends |

No stage should automatically approve a person, publish content, move money, delete a record, or grant broad administrator access. Those remain intentional decisions with attributable audit events.

## President-authority operating model

The President should have **national oversight and final authority**, not be the only operational bottleneck. The practical model is a controlled delegation system.

| Authority level | Typical scope | Examples | Required control |
|---|---|---|---|
| **President** | National, cross-branch, financial/governance, exceptional safeguarding | appoint branch leads, approve high-risk campaigns, authorize policy exceptions, review national performance | immutable authority event; high-impact action requires rationale |
| **President delegate** | Time-bound and scoped | approve ordinary onboarding for a branch, review routine task escalations | delegation start/end date, branch/programme scope, revocation control |
| **Operations administrator** | Daily people and task operations | review applications, issue assignments, review submitted work | cannot grant self President authority or override policy without escalation |
| **Branch coordinator** | One assigned operational unit | local opportunities, attendance, coordination notes, local task proposals | cannot access other branches’ people, donations, or national data by default |
| **Finance/compliance reviewer** | Financial or policy evidence only | donation exceptions, compliance evidence, data-retention exceptions | dual approval for sensitive action; no general people-administration privilege |

Implement this through additive `organization_roles`, `authority_delegations`, `approval_requests`, and `approval_events` tables. Every privileged action should record: actor, role at the time, authority scope, request/reference ID, reason, decision, timestamp, and any required second approver. The President’s Office dashboard should show **aggregate branch health first** and only expose personal or donor details through an authorized drill-down.

## Automation choices

The recommended workflows are deterministic: remind an approved applicant, flag an expiring invitation, surface an overdue task, prepare an approval queue, reconcile notification delivery, or produce branch-level aggregate indicators. They should run in HMSI’s protected backend with idempotency keys, audit events, and a visible run history. They should not rely on browser sessions or unbounded AI processing.

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---|
| **Protected in-portal background workflows** | Best long-term option for deterministic reminders, status checks, retention reviews, and approval queues. Gives the President’s Office a run history and editable policies. Requires initial database/workflow implementation and testing. | Included in normal portal hosting unless an always-on worker is later needed | Medium |
| **Daily leadership operations digest** | Faster and lighter first step. Produces a daily President/operations summary of pending approvals, stale onboarding, delivery failures, and branch data gaps. It does not replace workflow-level automation or a unit management interface. | Low | Low |

For either approach, use event-driven processing when an HMSI database action occurs and scheduled processing only for time-based conditions. Automated messages should be idempotent, rate-limited, logged, and sent only from an approved official sender. Any external service integration must be assessed separately for callback/webhook support before it is made part of a workflow.

## Phased implementation roadmap

| Phase | Time horizon | Deliverables | Approval boundary |
|---|---:|---|---|
| **0. Security baseline** | 0–30 days | Restrict `rls_auto_enable`, harden function search paths, enable leaked-password protection, document server-only tables, run anonymous/non-admin negative tests | President approves security policy; technical administrator implements |
| **1. Branch and authority foundation** | 30–60 days | Operational-unit/programme model, scoped role/delegation records, branch assignment fields, President delegation register | President approves branch and delegation policy |
| **2. Unified onboarding** | 60–90 days | Member invitation/progress parity, role templates, qualification/availability fields, onboarding service-level targets, readiness dashboard | Operations administers; President handles escalations |
| **3. Work and outcome automation** | 90–120 days | Approval queues, reminder runs, notification outbox, member review parity, branch/programme task dashboards | Routine automation is bounded; completion/policy actions retain human approval |
| **4. Governance and learning** | Ongoing | Quarterly access review, branch data-quality score, retention indicators, audit sampling, incident exercises, annual role/delegation recertification | President receives aggregate reports and approves policy changes |

## Immediate decision points

1. **Approve a security hardening release first.** It should address the publicly executable security-definer function, mutable function search paths, and leaked-password protection before additional privilege automation is built.
2. **Choose an operating-unit vocabulary.** Confirm whether HMSI uses “branches,” “regional offices,” “programmes,” or all three, and nominate the initial national and local units.
3. **Adopt an authority schedule.** Define which decisions require the President, a delegated branch coordinator, or two approvers.
4. **Choose an automation start point.** Either begin with the lightweight daily operations digest or build the protected in-portal background workflow foundation first.

## Verification boundaries

| Item | Status |
|---|---|
| Production schema coverage and RLS inventory | **Verified by read-only metadata query** |
| Current security-advisor findings | **Verified by read-only advisor scan** |
| Server-side administrator/portal/onboarding implementation | **Reviewed statically** |
| Anonymous and cross-role runtime authorization tests | **Not run in this assessment** |
| Database migrations, policy changes, automation, or notification changes | **Not performed** |
| Production records, contacts, donations, task proofs, or credentials | **Not accessed or altered** |

## References

[1]: [NIST Computer Security Resource Center — Least Privilege](https://csrc.nist.gov/glossary/term/least_privilege)

[2]: [Microsoft Learn — Manage volunteers](https://learn.microsoft.com/en-us/industry/nonprofit/volunteer-management-use)
