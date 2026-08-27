# HMSI Administrator and President Access Review

**Review date:** 27 August 2026  
**Scope:** Static source review of the HMSI administrator session, President’s Office route, representative protected API routes, and the newly published Nigerian Volunteers Award 2021 event-support entry. No production login, mutation, payment, email, or private data request was performed.

## Executive finding

The current portal gives the configured administrator a broad operational workspace, including the President’s Office. This is useful for continuity, but **President is not yet a distinct technical role**. The President’s Office API accepts the same shared administrator session used by the broader control centre. A single configured email/password/secret creates an eight-hour signed admin cookie, and every successful user of that shared account inherits the same broad access surface.

This means the system currently provides **one generic all-purpose administrator identity**, rather than separate accountable access for a President and delegated administrators. The recommendation is not to add unrestricted blanket privileges. Instead, HMSI should retain broad executive oversight while moving to individually authenticated, scope-based authority with additional approval requirements for high-risk actions.

## 1. Published community-support update

The supplied 2021 event flyer identifies **Help Meet Shine** as **“Supported By”** for the Nigerian Volunteers Award’s *Amplifying Good Works* event in Lagos on 21 August 2021. It does **not** establish that HMSI received the award, held a certification, or has a current signed partnership.

The portal now publishes this record on the public **Partnerships** page under **“Community-support event evidenced.”** The entry says that HMSI is identified as a supporter in the event flyer and expressly states that it is **not an award received by HMSI or a current formal partnership**. The content is separate from the existing award-recognition component.

| Item | Status | Evidence boundary |
|---|---|---|
| Partnership ecosystem entry | **Implemented and live-verified** | Event support only; no recipient, sponsor, or formal-partner claim. |
| Public source link | **Implemented** | Uses the Nigerian Volunteers Award public Instagram profile. |
| Flyer reuse | **Not published** | The source flyer contains contact details and third-party branding; do not reuse it publicly without permission and a safeguarding/privacy review. |

## 2. Current authorization model

| Surface | Current control | Review finding |
|---|---|---|
| Shared admin session | `HMSI_ADMIN_EMAIL`, `HMSI_ADMIN_PASSWORD`, and `HMSI_ADMIN_SESSION_SECRET` are used to create a signed eight-hour cookie. | A shared static credential is a single point of accountability and compromise. It does not represent individual President or administrator identities. |
| Admin control centre | Protected by the shared admin session. | Provides broad access to people, work, editorial, fundraising, donation, and governance controls. |
| President’s Office | The API checks the same shared admin cookie as the control centre. | The “President” label is a view and dashboard, not a separately enforced executive role. |
| Editorial routes | Use `getEditorialAdmin`, which delegates to the same shared admin session. | An editorial-specific label exists, but it does not currently impose a distinct technical scope. |
| Assistant routes | Use assistant-specific helper functions. | These must be verified against the same role model before any authority expansion; assistant actions should never bypass human approval. |
| Gallery route | Uses authenticated viewer role checking and requires role `admin`. | This is a useful pattern, but it should be consolidated with individual identity and capability checks. |
| Data access | Server routes use the Supabase admin client after application-layer checks. | Service-role use must remain server-only; application guards and database RLS must both enforce the intended access boundary. |

The President’s Office currently returns approved-person directory fields including name, email, phone, location, notification readiness, and work progress to the generic administrator account. That is appropriate only where the viewer has a defined people-operations need; it should not become an unrestricted default for every administrative duty.

## 3. Recommended executive authorization model

Create named individual accounts, each tied to a Supabase Auth identity and an organization-role record. Use the existing governance tables—`organization_roles`, `authority_delegations`, `approval_requests`, and `approval_events`—as the audit vocabulary, but make route and RLS enforcement depend on those records rather than a shared email/password cookie.

| Role | Core authority | Must require an additional approval or restricted workflow |
|---|---|---|
| **President** | Organization-wide read access; approve strategic governance decisions; appoint/revoke delegated roles; review aggregate finance and programme dashboards. | Role elevation, finance adjustments/refunds, high-risk data export, user deletion, policy exceptions, and production changes. |
| **Operations Administrator** | Approve people, assign work, manage operational units/programmes, review task evidence. | Hard deletion, executive role changes, financial ledger changes, and sensitive record export. |
| **Finance Administrator** | Review donations, reconciliations, approved refunds, campaign configuration, and financial reporting. | Final ledger correction, refund/reversal, bank-detail change, and payment-provider configuration. |
| **Editorial Administrator** | Review, request revision, approve, publish, and archive editorial content. | Emergency restoration or public correction outside the normal workflow. |
| **People and Safeguarding Administrator** | Review onboarding, verified contact status, support requests, and safeguarding workflow. | Hard deletion, bulk contact export, or access to unrelated finance/editorial data. |
| **Read-only Auditor/Trustee** | View approved governance records, aggregated health, and audit status. | Any mutation, file export, or credential/configuration action. |

The President may hold multiple approved capabilities, but the interface should display the active capability and purpose. Broad oversight does not require a universal unrestricted mutation token.

## 4. High-risk action policy

The following actions should remain unavailable to a single actor, including the President. They should require server-side authorization, a same-origin request, a change ticket or evidence reference, an immutable audit event, and a second authorized approver.

| Action | Proposed control |
|---|---|
| Financial ledger correction, refund, reversal, or reconciliation apply | Finance Administrator prepares evidence; President or independent Finance approver authorizes; operator cannot self-approve. |
| Permanent user/data deletion | Soft delete first, 30-day recovery where policy allows, independent confirmation, and audit record. |
| Role elevation or delegation | President approves time-bounded scope; a different administrator applies it; automatic expiry and periodic review. |
| Production deployment or infrastructure change | Protected GitHub environment, least-privilege OIDC role, required manual approval, and 24-hour approval timeout. |
| Bulk people/contact export | Narrow purpose, column allowlist, expiry, masked data where possible, and recorded authorization. |
| Safeguarding or retention exception | Dual approval, reason, expiry, and restricted incident record. |

## 5. Recommended remediation order

First, keep the existing admin configuration functional but stop sharing the static account. Assign individual named credentials through the approved authentication system and require multifactor authentication for every privileged identity. Second, define capabilities and make the President’s Office read the authenticated role rather than assuming every administrator is the President. Third, add RLS policies and server-side route guards for each capability. Fourth, route high-risk actions through the existing approval and audit registers, with self-approval prohibited. Finally, perform staging tests with disposable identities for President, operations admin, finance admin, editorial admin, and unauthorized users.

## 6. Required staging checks before privilege expansion

| Check | Expected result |
|---|---|
| President session | An authenticated President can open executive overview and approved strategic queues. |
| Delegated admin session | Each delegated role sees only the menu and data necessary for its capability. |
| Direct API request | A forged client request cannot access or mutate a route outside the identity’s server-side capability. |
| RLS query | A direct authenticated database request cannot read another role’s restricted records or bypass scope. |
| High-risk mutation | The system rejects self-approval, expired delegation, missing evidence reference, and cross-site requests. |
| Audit log | Records action type, role, result, and change reference without secrets, donor data, raw payment references, or sensitive payloads. |
| Session lifecycle | Logout, expiry, password reset, and revoked role access deny further actions immediately or at the next verification boundary. |

## 7. Evidence reviewed

| Evidence | Purpose |
|---|---|
| `components/PartnerEcosystem.tsx` | Public event-support wording and relationship boundary. |
| `tests/partner-ecosystem.test.mjs` | Regression coverage for the event-support entry and source URL. |
| `app/admin/presidents-office/PresidentOfficeDashboard.tsx` | President’s Office data scope and available operational menu. |
| `app/api/admin/presidents-office/route.ts` | Server-side session check and directory/assignment data returned to the executive dashboard. |
| `lib/adminSession.ts` | Shared eight-hour administrator cookie and static configured credential model. |
| `lib/editorialAdmin.ts` | Editorial wrapper’s dependency on the shared administrator session. |
| `app/api/admin/governance/route.ts` | Protected governance actions, same-origin checks, and privacy-minimized security-event handling. |
| `app/api/admin/gallery/route.ts` | Example of role-based `admin` checking through authenticated viewer context. |

## Decision required

HMSI should approve whether to proceed with a staged migration from the current shared administrator credential to individual **President**, **Operations Administrator**, **Finance Administrator**, **Editorial Administrator**, **People and Safeguarding Administrator**, and **Read-only Auditor** identities. This is a security and accountability enhancement, not a withdrawal of executive authority. The President can retain broad oversight while high-risk actions remain independently reviewable and auditable.
