
- [x] Replace the HMSI Assistant Manus transport with a server-side Gemini API transport using `GEMINI_API_KEY`.
- [x] Add Gemini transport regression coverage, validate the production build, and verify a harmless live Assistant reply.
- [x] Migrate the legacy worker Assistant route and frontend result handling to Gemini using `GEMINI_API_KEY`.
- [x] Migrate the legacy newsroom research route and frontend result handling to Gemini while preserving approval safeguards.
- [x] Add worker/newsroom regression coverage, validate the build, and verify harmless live requests.
- [x] Review newsroom Gemini schema normalization for future structured-output compatibility and strengthen coverage where needed.
- [x] Implement built-in Supabase Auth mapping for approved workers, volunteers, and members.
- [x] Add secure worker identity-card activation, sign-in, sign-out, and role-limited portal access.
- [x] Add volunteer/member password recovery and portal profile-photo upload flows.
- [x] Add assignment identity-card notification email delivery and correct remaining stale Assistant error text.
- [x] Add authorization tests, validate the production build, configure required secrets, and verify live flows.
- [ ] Audit Resend configuration and delivery logs for assignment notification emails without exposing secrets or PII.
- [ ] Implement reusable secure Resend templates and notification routing for HMSI events.
- [ ] Add safe delivery logging, regression tests, and Resend configuration documentation.
- [x] Implement idempotent worker ID-card generation and secure email dispatch when an authorized admin creates an assignment.
- [x] Add route regression tests, build validation, and deployment verification for assignment-triggered notifications.
- [x] Review and harden volunteer/member password reset request and callback flows, add security tests, and validate deployment.
- [ ] Review latest Resend notification delivery and API logs against the secured password-reset implementation without exposing PII or secrets.
- [x] Correct ID-card email rendering so every notice contains a non-empty worker ID number.
- [x] Send the confirmed ID-card access notices to the new worker and all verified active workers, then verify Resend delivery metadata.
- [x] Run the complete regression suite and verify automated coverage of the admin-only bulk worker access-notice endpoint.
- [x] Add mocked runtime integration tests for authorization, confirmation, eligible-worker selection, card reissue, delivery, and failure handling in the bulk access-notice endpoint.
- [x] Document the secure bulk worker access-notice API contract, response semantics, safeguards, and administrative integration pattern.
- [x] Create a presentation deck on bulk worker access-notice API design, safeguards, integration, and runtime validation.
- [x] Review and harden bulk access-notice authentication and authorization controls, and clarify worker, volunteer, and member portal sign-in identification.
- [x] Repair the shared portal password-recovery entry and add role-specific sign-in guidance without exposing role eligibility.
- [x] Audit recent password-recovery delivery without exposing recipient data, and configure official-email-only sender and president correspondence controls after exact addresses are approved.
- [x] Enforce `HMSI Portal <no-reply@hmsi.org.ng>` as the sole portal-mail sender (superseded by the subsequently approved multi-sender policy).
- [x] Complete Supabase Auth SMTP configuration after the official Resend SMTP credential and president reply-to address are supplied.
- [x] Implement verified HMSI sender identities and server-side event routing for onboarding, auth, administration, and presidential internal alerts.
- [x] Add professional password-reset, worker-welcome, and president-facing admin-alert templates with regression coverage and no unapproved live dispatch.
- [ ] Align the live Supabase reset-email HTML body with the already implemented HMSI password-reset template through the dashboard code editor.
- [x] Configure and verify required Vercel production notification environment variables, including the approved `HMSI_MAJOR_DONATION_THRESHOLD_NGN=1000000` value.
- [x] Verify `RESEND_API_KEYY` and `RESEND_FROM_EMAILL` are unused; retain them in Vercel Production and Preview by explicit user decision while preserving the standard active Resend keys.
- [x] Verify the current Vercel production deployment and recent notification-route runtime health without modifying HMSI configuration.
- [x] Add a primary image field to the admin news publishing workflow and render it consistently on public news headline cards and articles.
- [x] Document a fail-safe image-path tracking, replacement cleanup, and scheduled orphan-reconciliation design before any destructive storage change is authorized.
- [x] Add protected `/admin/editorial` and `/admin/articles` routes with an editorial queue, content-management views, inspection controls, and optimistic review actions.
- [x] Add admin-only article-management API handlers and editorial audit fields for review, draft, publish, reject, archive, and deletion states.
- [x] Add a safe ten-day article archival policy, scheduled reconciliation route, tests, production validation, and deployment verification.
- [x] Build the selected personal Google Drive submission, administrator intake-routing, ingestion-status, notification, and privacy-cleanup workflow for HMSI portal users.
- [x] Require named-HMSI-administrator viewer sharing for personal Drive submissions and expose submitted links only in the protected administrator intake-routing view.
- [x] Restore the production Paystack donation checkout by verifying and correcting the `NEXT_PUBLIC_PAYSTACK_KEY` configuration without exposing payment credentials.
- [x] Review production server logs for hidden errors during Paystack donation initialization without exposing credentials or donor data.
- [ ] Verify an isolated Paystack test-mode staging environment and run an end-to-end popup test only if it cannot create a production charge or donor record.
- [x] Perform production-safe Paystack donation-flow verification without submitting a payment, donor data, or donation record.
- [x] Prepare an approved verified-donation thank-you acknowledgement, confirm the latest successful donation safely, and assess displaying successful donations in the protected admin dashboard.
- [x] Implement a protected, paginated admin dashboard view for successful donations with privacy-conscious record handling and automatic verified-donation acknowledgements.
- [x] Verify the production mailer configuration and email-service connection using non-delivery checks without exposing credentials or recipient data.
- [x] Verify protected thank-you acknowledgement-log availability and updates for recent successful donations without exposing donor information.
- [x] Add and apply a fail-safe donation acknowledgement audit schema, then verify it without altering existing donation records.
- [x] Connect verified donation acknowledgement dispatch and Resend webhook events to the audit schema and protected admin ledger with idempotent processing.
- [x] Extend the donation model and admin ledger for verified multi-channel tracking, receipt details, campaign attribution, acknowledgement status, and bounded real-time refresh without exposing payment credentials or card data.
- [x] Add a verified provider-webhook trust boundary and an admin-only manual-donation intake path that requires explicit verification before fundraiser totals or donor acknowledgements are triggered.
- [x] Add a volunteer publisher-role taxonomy and a role-limited `/portal/submit-news` workflow that submits content only to the existing editorial review queue and never publishes directly.
- [x] Extend `/portal/submit-news` with rich-text content, controlled category selection, direct image upload or validated Google Drive media links, submitter attribution, and the approved editorial-review confirmation message.
- [x] Extend administrator editorial review with request-revisions feedback, contributor-visible revision state, and protected re-submission while retaining administrator-only publishing.
- [x] Align the protected editorial queue and article model with the publisher dispatch terminology while preserving compatibility with existing pending-review records and public news rendering.
- [x] Add a protected administrator control to assign or remove publisher pathways for approved active volunteers after onboarding.
- [ ] Run a complete end-to-end volunteer news submission, revision, approval, and publication integration test against an isolated staging deployment with disposable test identities and cleanup verification.
- [x] Run isolated mock-mode end-to-end verification of volunteer submission, editorial queue, revision/status transitions, administrator approval, and publication boundaries without live database or external side effects.

## Featured Story Dynamic Routing

- [x] Confirm the homepage featured-story card constructs its destination from the selected record ID rather than a static legacy link.
- [x] Confirm the story detail renderer and public API load the selected published record’s unique metadata, image, excerpt, and body.
- [x] Run focused regression coverage, production build validation, confirm the live record route, and publish the routing verification update.

## Related Field Stories

- [x] Load up to three other published field stories while excluding the current story record.
- [x] Render an accessible related-stories section at the bottom of the selected story detail page with dynamic record links.
- [x] Add regression coverage, validate the production build and live detail route, then publish the enhancement.

## Public Launch Readiness Package

- [x] Add an administrator-reviewed featured campaign seed with a ₦500,000 target and no fabricated donation total, supporter count, or progress.
- [x] Add two clearly labeled, administrator-reviewed HMSI Field Operations dispatch seeds without misrepresenting field verification or live activity.
- [x] Add an administrator-only `/admin/templates` library for approved volunteer and publisher outreach templates with safe HMSI deep links.
- [x] Add a public micro-donation fast-track widget that routes to the approved donation entry path without transmitting unsupported selected amounts or payment details.
- [x] Add a public volunteer and independent-publisher conversion banner to the news feed with clear role-limited pathways.
- [x] Add a live supporters/progress component that displays only verified donation acknowledgements, with an explicit empty state when no verified public record is available.
- [x] Add a bounded administrator-only launch system check for database, notification configuration, and payment-webhook readiness without exposing secrets or implying provider verification.
- [x] Add regression coverage, production-build validation, live-route verification, and a deployment for the launch package.

## Dynamic Story Feed and Outreach Gallery

- [x] Replace homepage field-story placeholder cards with a bounded dynamic query for published or approved story records and exact record links.
- [x] Add public `/updates` compatibility routing to the existing record-specific story renderer without duplicating article data.
- [x] Prioritize related stories sharing the current category, display publication dates, and record privacy-safe aggregate click-through analytics.
- [x] Add the outreach-gallery schema and an administrator-only gallery API that supports ordered image metadata, append, caption update, and deletion state.
- [x] Add protected `/admin/gallery` and `/admin/stories/[id]` controls for image upload, editing, prioritization, and confirmed deletion.
- [x] Ensure gallery deletion removes only storage objects owned by the selected gallery record and preserves auditable metadata or a soft-delete marker.
- [x] Add regression coverage, production-build validation, live verification, and a deployment for the story-feed and gallery release.

## Dynamic Live News Ticker

- [x] Replace the homepage Live News ticker’s static placeholder with the newest approved or published `news_articles` record ordered by publication timestamp.
- [x] Bind the ticker category, headline, excerpt, and Read News call to the active record’s exact `/news/[id]` route.
- [x] Add regression coverage, production-build validation, live verification, and a deployment for the Live News ticker fix.

## Non-Transactional Live Journey Verification

- [x] Verify the production Live News ticker and its exact article-detail view without modifying content.
- [x] Verify the production donation journey through the secure checkout handoff without entering payment data, submitting a donation, or creating a donor record.
- [x] Inspect bounded production runtime signals and record the completed non-transactional verification outcome.

## Production Performance and Accessibility Audit

- [x] Audit performance and accessibility for the public homepage, the verified Live News detail page, and the launch campaign donation page without submitting a transaction.
- [x] Analyze automated audit output for material production issues and record prioritized remediation guidance.

## Post-Onboarding Identity and Worker Directory

- [x] Inspect and document the existing Supabase Auth, onboarding-completion, HMSI ID, task assignment, directory, login, and recovery boundaries before changing identity flows.
- [x] Ensure completed onboarding idempotently issues a unique HMSI ID and requires a user-controlled password setup without exposing or auto-generating passwords.
- [x] Implement authenticated password creation and immediate role-limited portal routing only after the Supabase credential update and session establishment succeed.
- [x] Support login with email or HMSI ID through a server-side ID-to-email lookup that does not disclose account existence or role eligibility.
- [x] Add an email-based, rate-limited password-recovery request path using Supabase Auth’s time-limited reset-link flow.
- [x] Add an administrator-only worker directory profile view with necessary identity, onboarding, task, proof, and activity history data under existing role controls.
- [x] Add protected directory actions for preselected task assignment and password-reset dispatch with audit-friendly server validation.
- [x] Add focused security and behavioral tests, production-build validation, and a non-destructive deployment verification for the new identity and directory flows.

## Retention-Safe User Administration and Role Rooms

- [x] Assess foreign-key dependencies, existing recovery/retention obligations, and audit requirements before enabling any irreversible user or application deletion.
- [x] Add an administrator-only user-removal workflow with explicit confirmation, immediate access revocation, 30-day recovery metadata, preflight dependency reporting, authorization checks, and an auditable record of the action.
- [x] Add application inbox filtering for pending decisions, a controlled archive view for approved records, and retention-state visibility without fabricating historical data.
- [x] Add a deterministic daily retention job that archives approved applications and processes final purge only after the approved 30-day recovery window.
- [x] Add role-limited access to the Worker Operations, Volunteer Community, and HMSI Member discussion rooms using existing portal identities.
- [x] Add secure portal-session refresh and persistence without storing tokens in browser-accessible application state.
- [x] Add tests, production-build validation, protected-route checks, scheduled-job safeguards, and deployment verification for the administration, retention, room, and session release.

## Email-Dispatched One-Time Password Setup

- [x] Inspect existing onboarding invitation issuance, Resend dispatch, HMSI ID-card lifecycle, setup token storage, password endpoint, login handler, and session refresh boundaries.
- [x] On completed onboarding, issue or reuse a unique HMSI ID and send one official transactional email with the ID and a server-generated, one-time setup link without exposing tokens in logs.
- [x] Replace inline onboarding password fields with a completion screen that directs the user to their registered email for the one-time setup link.
- [x] Add a `/setup-password` route that validates an unexpired unused token, presents a prefilled disabled HMSI ID, requires user-controlled matching passwords, consumes the token exactly once, and launches the permitted portal session.
- [x] Preserve email-or-HMSI-ID login using Supabase Auth credentials and extend server-cookie session refresh without placing tokens in browser storage or claiming unlimited sessions.
- [x] Add tests, production-build validation, delivery-safe verification, and a deployment for the setup-email and returning-login flow.

## Production Constraint Review

- [x] Perform a read-only production review of foreign-key delete actions, indexes, and row-level security for user-removal dependencies and `password_setup_links`.
- [x] Document confirmed cascade behavior, retention-safe deletion limits, and any schema gaps without modifying production data or constraints.

## Production Operational Health Review

- [x] Perform a non-destructive review of current production deployment, repository state, and publicly reachable HMSI core routes.
- [x] Review bounded operational and security signals, document any required corrections, and avoid changing production configuration or data unless separately approved.

## Worker Portal Login Diagnosis

- [x] Diagnose the reported worker portal-login failure using only code-path review and bounded production signals; do not change credentials, authenticate as the worker, or send recovery email.
- [x] Report the minimum safe correction and request explicit approval before any password reset, account update, or notification dispatch.
- [x] Preserve the generic invalid-credential response for genuine 401 failures while surfacing a safe temporary-service message for configured 503 login failures.
- [x] Add regression coverage for portal-login status-aware client handling and validate the production build before deployment.
- [x] Verify the required Supabase Auth variable names are present in Vercel Production without exposing secrets, then perform only a non-account-changing post-deployment route check.

## Portal Authentication Environment Audit

- [x] Map portal authentication, session, recovery, setup-link, and redirect configuration dependencies to the Vercel Production variable names without viewing values.
- [x] Identify authentication configuration risks and document safe verification/correction steps without changing values, credentials, or user records.

## Role-Specific Portal Access

- [x] Inspect worker, volunteer, and member login redirects, session refresh, task-workspace behavior, and matching room access controls.
- [x] Route each active role to its appropriate post-login workspace with clear task and role-room entry points while preserving server-side role checks.
- [x] Add regression coverage for role-aware routing, session continuity, task interaction boundaries, and room access isolation.
- [x] Validate the production build and deploy without authenticating as, altering, or messaging any user.

## Role-Specific Dashboard Usability

- [x] Simplify worker, volunteer, and member dashboard menus to show only role-relevant work, rooms, opportunities, profile, help, and sign-out links.
- [x] Expand role task views with clear assignment details, task actions, required outcomes, due dates, proof-link submission, and completion/status feedback.
- [x] Add dedicated opportunities menu entry and role-appropriate opportunity loading with clear onboarding guidance.
- [x] Add regression coverage for role menu isolation, task/proof-link workflows, room access, opportunities, and responsive dashboard behavior.
- [x] Validate the production build and deploy the usability release without changing user credentials or creating live assignments.

### Implementation note

The existing data model does not currently provide a volunteer task-assignment table. Volunteer dashboard task execution must remain limited to data-backed records available through existing protected APIs until a separately approved schema/API change is made.

## Volunteer Task Assignment Model Planning

- [x] Define the volunteer assignment data model, lifecycle, foreign keys, indexes, RLS posture, and retention behavior without applying a migration.
- [x] Specify protected volunteer and administrator API contracts for listing, accepting, progressing, completing, reassigning, and proof-link submission.
- [x] Specify integration with the role portal, opportunities, rooms, notifications, audit events, tests, and staged rollout safeguards.


## Worker and Volunteer Dashboard UI Design

- [x] Define focused worker and volunteer dashboard menus, navigation hierarchy, empty states, and onboarding guidance.
- [x] Design reusable task cards, task-detail panels, status actions, proof-link submission entry, room links, and opportunity sections.
- [x] Implement the frontend components without changing production schema or creating live assignments.
- [x] Add frontend regression coverage and responsive role-isolation verification.


## Admin Assignment Management and Portal Organization

- [x] Add a dedicated administrator jobs/assignments menu and route that lists each assigned job with the assignee name and role.
- [x] Add protected admin review, edit, soft-delete, restore, and lifecycle controls for assigned jobs with explicit confirmation and audit events.
- [x] Organize admin navigation so operational job controls are grouped in the admin menu rather than scattered across the overview dashboard.
- [x] Check and refine worker/volunteer portal self-explanatory guidance, task actions, room links, opportunity menus, and proof-link flow.
- [x] Add regression coverage, build validation, and safe production verification without creating live assignments or changing user credentials.

## Assignment Restore and Archive Planning

- [ ] Define a server-enforced 30-day recovery deadline and one-click admin restore contract for soft-deleted assignments without applying it yet.
- [ ] Specify the protected archived-assignment query/UI, restore confirmation, expired-window state, worker eligibility checks, and audit events.
- [ ] Define migration, tests, rollout, and retention-expiry safeguards; do not change production schema or data until separately approved.


## Recovery Timestamp SQL and RLS Review

- [ ] Prepare an additive review-only migration for `recovery_until`, archive indexing, and an admin archive view.
- [ ] Prepare RLS policies that deny public access and permit only server-authorized administrator operations, with explicit service-role caveats.
- [ ] Include metadata verification, rollback guidance, and retention safeguards; do not apply SQL to production.


## Production-Ready Recovery RLS Adaptation

- [ ] Confirm the existing `work_assignments` base-table columns, RLS policies, grants, and administrator access model using metadata only.
- [ ] Draft an additive production migration and base-table RLS policy set that preserves server-side admin authorization and the 30-day recovery window.
- [ ] Include verification and rollback safeguards; do not execute production DDL or DML until the script is reviewed and explicitly approved.


## Disposable Admin RLS Test Plan

- [ ] Define a disposable-admin test boundary that excludes real users, real assignments, payment data, and production credentials.
- [ ] Specify direct database-role, server-side admin API, archive, privilege, negative-access, and cleanup assertions.
- [ ] Document evidence handling, teardown, rollback, and approval requirements without executing the test.


## Final Dashboard End-to-End Test Review

- [x] Inventory volunteer, member, and staff-worker dashboard integration coverage and map each workflow to assertions.
- [x] Run safe local tests/build and assess role isolation, task lifecycle, rooms, proof links, opportunities, and session refresh coverage.
- [x] Document failures, coverage gaps, and recommended staging tests without using real credentials or mutating production data.


## Staging Browser Test Run

- [ ] Define isolated staging environment, disposable worker/volunteer/member/admin identities, synthetic assignment fixtures, and approval gates.
- [ ] Specify browser workflow steps, role-isolation checks, task/proof/room/opportunity checks, evidence capture, and teardown.
- [ ] Document failure handling and ensure no production credentials, real users, payments, or live assignments are used.


## Soft-Delete Feed and Room Test Suite

- [ ] Define synthetic active/deleted assignment fixtures and map active feeds, counts, room context, archive, and recovery assertions.
- [ ] Specify mocked/integration test harness coverage for worker and member task reads, role rooms, admin archive, and retention boundaries.
- [ ] Document negative authorization, concurrency, teardown, and CI gating without touching production records.


## Reusable HMSI Secure Portal Maintenance Skill

- [x] Define reusable trigger conditions and workflow stages for secure portal maintenance, schema review, role-aware validation, staged testing, and reporting.
- [x] Create and validate a self-contained Manus skill package with concise core instructions and optional references/templates.
- [x] Deliver the validated `SKILL.md` package without exposing project secrets or user data.


## HMSI Name Meaning and Public Explanation

- [x] Add a concise explanation of “Help Meet Shine Initiative” near the public homepage introduction.
- [x] Add a fuller name-meaning section to the public About/mission content, covering Help Meet, Shine, and Initiative.
- [x] Verify accessibility, responsive presentation, content visibility, build status, and deployment readiness.

## HMSI Brand Guidelines Document

- [x] Define brand foundations, name interpretation, mission, vision, and positioning.
- [x] Codify visual identity, typography, colour, logo, imagery, accessibility, and layout standards.
- [x] Add tone of voice, messaging architecture, channel examples, and governance guidance.
- [x] Review the brand guidelines for consistency, clarity, and practical usability.

## HMSI Welcome Packet and Onboarding Guide

- [x] Define onboarding objectives, audience pathways, and first-week structure.
- [x] Integrate HMSI name meaning, mission, brand values, conduct, safeguarding, and role clarity.
- [x] Add portal workflow, communication guidance, support routes, and practical checklists.
- [x] Review the guide for clarity, safety, accessibility, and usability.

## HMSI Welcome Packet Onboarding Deck

- [x] Review the approved onboarding guide and distill the deck narrative.
- [x] Create a presentation outline covering the name, mission, values, roles, safeguarding, portal flow, and first-week plan.
- [x] Build and validate the onboarding slide deck, then present it to the user.


## HMSI One-Month Volunteer Feedback Survey

- [x] Define survey objectives, response privacy, and completion context.
- [x] Draft questions covering onboarding, role clarity, portal usability, safeguarding, support, inclusion, and engagement.
- [x] Format a reusable survey template with rating scales, open responses, and follow-up consent.
- [x] Review the survey for clarity, accessibility, dignity, and brand alignment.


## Volunteer Survey Analysis Presentation Script

- [x] Define the analysis narrative, decision goals, and privacy boundaries.
- [x] Draft the team-lead walkthrough for preparing, segmenting, interpreting, and acting on survey results.
- [x] Format and review the script for analytical rigor, safeguarding, and practical usability.


## Volunteer Retention Strategy Meeting Script

- [x] Define retention goals, evidence boundaries, and meeting decisions.
- [x] Draft discussion prompts and practical retention actions from survey themes.
- [x] Format and review the script for measurement, ownership, privacy, and volunteer safety.


## Quarterly Volunteer Retention Tracking Dashboard

- [x] Define dashboard objectives, metric definitions, formulas, cadence, and data owners.
- [x] Design quarterly summary, trend, cohort, action, and privacy views.
- [x] Format a reusable tracking dashboard template with blank fields and review guidance.
- [x] Review calculations, privacy safeguards, and operational usability.


## Executive Volunteer Retention Dashboard Deck

- [x] Review the quarterly retention dashboard template and define the executive narrative.
- [x] Create an executive slide outline covering metrics, trends, cohorts, safeguards, and decisions.
- [x] Build, validate, and present the executive retention dashboard deck using placeholder values only.


## Executive Volunteer Retention Memo

- [x] Define the memo structure, audience, and strategic alignment.
- [x] Draft the top three next-quarter retention priorities with actions, owners, and measures.
- [x] Format and review the memo for evidence boundaries, clarity, and brand consistency.


## Volunteer Retention Implementation Timeline and Checklist

- [x] Translate the three retention priorities into workstreams, outcomes, and owners.
- [x] Sequence a quarter-long timeline with dependencies, milestones, review points, and communications.
- [x] Create a reusable implementation checklist with verification and safety/privacy gates.
- [x] Review the plan for feasibility, accountability, and sustainable volunteer participation.


## Volunteer Retention Risk Mitigation and Contingency Plan

- [x] Identify and categorize roadblocks from the volunteer-retention implementation checklist.
- [x] Define risk ratings, preventive controls, early-warning triggers, and fallback responses.
- [x] Create a reusable risk matrix, escalation model, contingency playbooks, and recovery review checklist.
- [x] Review the plan for proportionality, safety, privacy, accountability, and operational feasibility.


## First-Month Volunteer Risk Pulse Check

- [x] Map risk triggers to short, observable pulse-check signals.
- [x] Define pulse cadence, response options, escalation rules, and owner fields.
- [x] Create a reusable pulse-check form and weekly review template.
- [x] Review the mechanism for privacy, proportionality, accessibility, and safe routing.


## First-Month Pulse-Check Escalation Deck

- [x] Review the approved pulse-check framework and define the team-lead narrative.
- [x] Create a slide outline covering cadence, questions, triggers, escalation, contingency, and privacy.
- [x] Build, validate, and present the pulse-check escalation deck using placeholder values only.


## Printable Team-Lead Pulse-Check Cheat Sheet

- [x] Review the approved pulse-check framework for the five questions and trigger thresholds.
- [x] Design a one-page print layout with response scale, triggers, and first-response actions.
- [x] Format and review the cheat sheet for print readability, accessibility, and brand alignment.


## Digital Pulse-Check Form Template

- [x] Define the Google Forms/Typeform specification, audience, privacy boundaries, and response storage rules.
- [x] Map the five questions, response scale, optional context fields, branching, and trigger logic.
- [x] Create a reusable platform-portable form template with follow-up and escalation fields.
- [x] Review automation, confidentiality, accessibility, and portability safeguards.


## Digital Pulse-Check Rollout Deck

- [x] Review the approved digital form specification and define the rollout narrative.
- [x] Create a team-lead slide outline covering introduction, cadence, privacy, branching, follow-up, and feedback closure.
- [x] Build, validate, and present the digital pulse-check rollout deck.


## Trigger Threshold Escalation Flowchart

- [x] Review the approved pulse-check trigger matrix and escalation decision tree.
- [x] Draft a reusable flowchart showing threshold conditions, first responses, confidential routing, and closure.
- [x] Render and verify the flowchart for accuracy, legibility, and quick-reference use.


## Sensitive Volunteer Follow-Up Conversation Script

- [x] Define conversation objectives, consent expectations, and confidentiality boundaries.
- [x] Draft the team-lead talk track for opening, listening, support planning, escalation, and closure.
- [x] Format and review the script for safeguarding, privacy, non-retaliation, and practical usability.


## Volunteer Support Conversation Role-Play Guide

- [x] Define simulation objectives, participant roles, facilitation rules, and safety boundaries.
- [x] Design scenario cards for difficult routine, capacity, access, confidentiality, and escalation conversations.
- [x] Add observer criteria, debrief prompts, scoring rubric, and facilitator contingency guidance.
- [x] Review scenarios for realism, dignity, privacy, non-retaliation, and practical usability.


## Live Volunteer Support Peer-Coaching Checklist

- [x] Define peer-coaching purpose, roles, consent expectations, and safety boundaries.
- [x] Draft live-observation and post-conversation criteria for team leads.
- [x] Add coaching notes, escalation checks, action ownership, and reflective review fields.
- [x] Review the checklist for privacy, safeguarding, non-retaliation, and practical usability.


## Peer-Coaching Feedback Summary for Program Directors

- [x] Define the summary purpose, audience, reporting period, and privacy boundaries.
- [x] Design aggregate observation views for strengths, improvement themes, escalation trends, and system issues.
- [x] Add action ownership, target dates, decisions requested, and follow-up verification fields.
- [x] Review the template for evidence quality, confidentiality, proportionality, and accountability.


## Aggregate Escalation and Coaching Dashboard Framework

- [x] Define dashboard purpose, audiences, reporting cadence, and privacy boundaries.
- [x] Specify aggregate metrics, cohort suppression rules, filters, and visualization views.
- [x] Design action-routing, leadership review, data dictionary, and governance controls.
- [x] Review calculations, privacy safeguards, accessibility, and operational usability.


## Typeform and CRM Retention Data Pipeline Specification

- [x] Define Typeform and CRM source contracts, reporting scope, and privacy boundaries.
- [x] Design secure ingestion, normalization, deduplication, suppression, and aggregate computation stages.
- [x] Specify orchestration, monitoring, audit, failure handling, recovery, and reconciliation controls.
- [x] Review the pipeline for security, correctness, data minimization, and operational usability.


## Data Governance and Volunteer Privacy Compliance Policy

- [x] Define policy scope, governance roles, accountability, and legal-safety boundaries.
- [x] Specify lawful, fair, minimal, secure, and purpose-limited handling of volunteer data.
- [x] Document lifecycle, access control, volunteer rights, vendor controls, incident response, and audit procedures.
- [x] Review the policy for accuracy, proportionality, implementation readiness, and explicit legal-review requirements.


## CRM Retention and Suppression Configuration Runbook

- [x] Map the governance policy to CRM fields, lifecycle states, retention dates, suppression flags, and access scopes.
- [x] Define CRM automation for retention review, deletion/anonymisation, legal holds, aggregate-only exports, and audit events.
- [x] Define validation tests for suppression, re-identification resistance, exports, access control, and deletion exceptions.


## Staged Retention Automation Scripts and Workflow Rules

- [x] Define the retention state machine, eligibility gates, hold checks, and suppression rules.
- [x] Draft idempotent automation scripts for review, anonymisation/deletion, audit logging, retries, and recovery.
- [x] Define CRM workflow rules, dry-run controls, batch limits, and synthetic validation tests.


## Staged Retention State Machine Acceptance Checklist

- [x] Define synthetic fixtures, test environments, roles, release gates, and evidence requirements.
- [x] Specify state-transition, safety-gate, suppression, deletion, audit, retry, authorization, and observability tests.
- [x] Review staging-readiness criteria and document stop-ship conditions.


## Retention Audit Logging Specification

- [x] Define the audit scope, event taxonomy, compliance objectives, and non-sensitive logging boundary.
- [x] Specify event schemas for state transitions, suppression exceptions, approvals, retries, failures, and access reviews.
- [x] Define immutable storage, access control, reporting views, retention, monitoring, and validation tests.


## Retention Governance and Automation Summary Deck

- [x] Review source documents and define the presentation narrative.
- [x] Write the slide outline and concise speaker-ready content.
- [x] Create and verify each slide in the presentation project.
- [x] Present the completed executive-technical deck.


## RBAC Matrix for Retention Overrides and Suppression Exceptions

- [x] Define roles, permission categories, and sensitive-action taxonomy.
- [x] Specify the RBAC matrix, separation of duties, approval workflows, and emergency access rules.
- [x] Define mandatory audit, evidence, least-privilege, and zero-trust safeguards.


## Salesforce and HubSpot RBAC Permission Mapping

- [x] Research current Salesforce and HubSpot authorization primitives and licensing constraints.
- [x] Map HMSI retention and suppression roles to Salesforce permission sets, sharing, field security, and approval controls.
- [x] Map HMSI retention and suppression roles to HubSpot permission sets, teams, property restrictions, approvals, and API scopes.
- [x] Define shared service-account, audit, separation-of-duties, and platform validation controls.


## Salesforce and HubSpot Two-Person Approval Integration Tests

- [x] Define provider-neutral test contracts, synthetic fixtures, and two-person approval invariants.
- [x] Implement Salesforce and HubSpot adapter test doubles with authorization and provider-call evidence.
- [x] Write integration tests for approvals, protected-record gates, audit events, retries, and idempotency.
- [x] Review provider-specific limitations and document live validation requirements.


## Retention Override Monitoring and Alerting Dashboard

- [x] Define privacy-safe observability objectives, telemetry fields, and non-sensitive label boundaries.
- [x] Specify metrics, logs, traces, dashboard panels, Datadog monitors, and Prometheus/Grafana recording rules.
- [x] Define alert routing, runbooks, SLOs, access controls, and validation tests.


## News Reset and Controlled Publishing Workflow

- [ ] Inventory current news records, status values, public queries, publishing routes, and role permissions.
- [ ] Define a reversible archive/reset procedure and confirm the exact destructive scope before execution.
- [ ] Enforce admin-only publication with moderated submissions for approved non-admin roles.
- [ ] Improve empty states, editorial metadata, image validation, moderation feedback, and auditability.
- [ ] Add regression tests for authorization, public filtering, archive/reset behavior, and editorial transitions.


## Confirmed News Archive Reset and Publishing Controls

- [x] Archive all current `published` and `approved` news records reversibly while preserving approval history.
- [x] Restrict public news queries and ticker/detail routes to `published` records only.
- [x] Confirm administrator direct publishing and moderated submission paths for approved non-admin roles.
- [x] Add archive visibility/recovery controls, clear empty states, and no-new-post default behavior.
- [x] Validate the reset and workflow with regression tests and record counts before/after.


## News Archive and Permission Workflow Presentation Script

- [x] Define team learning objectives and the operational narrative.
- [x] Explain the reversible archive reset, admin publishing, moderated submissions, and published-only public visibility.
- [x] Document recovery, responsibilities, validation results, and team handoff actions.


## Organization-Wide News Workflow Announcement

- [x] Draft a concise Slack announcement covering the archive reset, admin publication control, moderated submissions, and published-only public visibility.
- [x] Include clear next steps for administrators, contributors, and all staff.


## Management Briefing on News Governance Changes

- [x] Define management decisions, audience needs, and presentation narrative.
- [x] Explain the rationale, risk reduction, operational impact, and evidence behind the archive reset and permission controls.
- [x] Document management decisions, success measures, residual risks, and next actions.


## Engineering Handover for News Archive Changes

- [x] Inventory commit `4731dc2`, changed files, live archive results, tests, and deployment state.
- [x] Document safe archive restoration, authorization, schema prerequisites, verification, and rollback procedures.
- [x] Record operational cautions, ownership, and follow-up checks for the engineering team.


## Archive Restoration Private-Review Integration Tests

- [x] Define restoration invariants, synthetic fixtures, and provider-independent test contracts.
- [x] Implement archive-restore policy and in-memory adapter test doubles.
- [x] Test authorization, private-review transitions, public filtering, publication gating, and idempotency.


## Emergency Content Restoration Administrator Runbook

- [x] Define emergency restoration scope, roles, stop conditions, and private-review safeguards.
- [x] Document conflict rejection scenarios, recovery paths, escalation rules, and evidence requirements.
- [x] Provide administrator procedures for restoration, verification, publication, and incident follow-up.


## Datadog Emergency Restoration Monitoring

- [x] Define privacy-safe restoration telemetry, event fields, and alert objectives.
- [x] Specify Datadog logs, metrics, monitors, dashboard panels, and notification routing.
- [x] Define runbooks, SLOs, validation tests, and live-configuration prerequisites.


## Datadog Emergency Restoration Failure Simulation

- [x] Define a synthetic end-to-end failure scenario, telemetry contract, and pass criteria.
- [x] Implement a scrubber, event pipeline, and Datadog-style monitor-evaluation harness.
- [x] Run alert-trigger and sensitive-data leakage assertions, including false-positive checks.


## Datadog False-Positive Rollback and Incident Response Manual

- [x] Define incident classes, false-positive criteria, roles, stop conditions, and severity levels.
- [x] Document triage, safe monitor silencing, fail-closed containment, rollback, recovery, and escalation procedures.
- [x] Provide operational decision tables, evidence requirements, checklists, and post-incident review steps.


## Public-Boundary Incident Escalation and Communications

- [x] Define severity levels, roles, escalation triggers, and communication principles.
- [x] Outline technical, privacy, safeguarding, security, management, and external escalation paths.
- [x] Draft internal, executive, contributor, and controlled external communication templates.


## Communication Template Privacy and Safeguarding Audit Checklist

- [x] Define template scope, review roles, privacy boundaries, and stop-send conditions.
- [x] Create rapid checks for content minimization, routing, recipients, channels, links, attachments, and incident language.
- [x] Define escalation, approval evidence, and periodic re-review requirements.


## Communication Audit Tabletop Exercise

- [x] Define exercise objectives, synthetic scenario, roles, assumptions, and success criteria.
- [x] Design timed injects, decisions, evidence requirements, and pressure conditions.
- [x] Create the facilitator guide, participant materials, evaluator scorecard, and after-action template.


## Tabletop Exercise After-Action Report Template

- [x] Define AAR scope, audience, decision records, evidence requirements, and confidentiality boundaries.
- [x] Design control-gap taxonomy, participant decision log, lessons-learned sections, and corrective-action register.
- [x] Include validation criteria, ownership, due dates, closure evidence, and management sign-off.


## Periodic Communication-Audit and Restoration Tabletop Schedule

- [x] Define cadence, exercise owners, scenario rotation, and governance objectives.
- [x] Map recurring exercise types, trigger-based rehearsals, preparation windows, and after-action deadlines.
- [x] Document schedule controls, participation requirements, stop-ship criteria, and annual review.


## Jira/Notion Tabletop Corrective-Action Dashboard

- [x] Define the corrective-action and control-gap data model, lifecycle, and governance objectives.
- [x] Design dashboard fields, views, workflows, reporting metrics, and escalation rules.
- [x] Map the template to concrete Jira and Notion implementations and document operating rules.


## Datadog-to-Jira Corrective-Action Synchronization

- [x] Define the webhook integration contract, security boundary, privacy-safe field mappings, and required secrets.
- [x] Specify Datadog webhook validation, Jira API issue creation/update, deduplication, idempotency, and retry behavior.
- [x] Provide reference code, example payloads, audit mappings, and integration tests.


## Datadog-to-Jira Node.js Reference Implementation

- [x] Define the handler contract, synthetic fixtures, scrubbing invariants, and idempotency requirements.
- [x] Implement the Node.js webhook handler, scrubber, idempotency store, dry-run mode, and Jira adapter boundary.
- [x] Add unit tests for scrubbing, idempotency, authorization, dry-run, duplicate delivery, and retry behavior.
- [x] Run the supported test suite and review implementation limitations before delivery.


## Datadog-to-Jira Production Deployment and Secret Management Runbook

- [x] Define production architecture, trust boundaries, environment separation, and deployment prerequisites.
- [x] Document HMAC secret generation, storage, rotation, revocation, and access controls.
- [x] Document Redis-backed idempotency keys, TTLs, atomic locks, recovery, failover, and observability.
- [x] Provide deployment, validation, incident, rotation, and rollback procedures.


## SOC 2 and GDPR Redis/Webhook Verification Pipeline

- [x] Read required safety and automation guidance and define the compliance scope, evidence boundary, and non-certification disclaimer.
- [x] Define SOC 2 control themes, GDPR control objectives, evidence model, and privacy-safe telemetry.
- [x] Design policy-as-code checks for Redis, webhook authentication, secrets, retention, access, and data handling.
- [x] Specify orchestration, evidence storage, alerting, exception approvals, remediation, and audit reporting.


## Redis/Webhook Architecture and Fail-Closed Diagrams

- [x] Review the existing Redis/webhook trust boundaries and diagram scope.
- [x] Create a component architecture showing ingress, verification, policy, Redis, Jira, audit, alerting, and mutation-gate boundaries.
- [x] Create normal-path, duplicate/replay, Redis-outage, and unknown-outcome sequence diagrams.
- [x] Render and review diagrams for legibility, safety, and absence of secrets or personal data.


## Redis/Webhook Architecture and Fail-Closed Diagrams

- [x] Review the existing Redis/webhook trust boundaries and diagram scope.
- [x] Create a component architecture showing ingress, verification, policy, Redis, Jira, audit, alerting, and mutation-gate boundaries.
- [x] Create normal-path, duplicate/replay, Redis-outage, and unknown-outcome sequence diagrams.
- [x] Render and review diagrams for legibility, safety, and absence of secrets or personal data.

## Redis/Webhook Verification Architecture Deck

- [x] Define the deck narrative and source visual assets.
- [x] Create slides covering trust boundaries, request lifecycle, Redis idempotency, fail-closed branches, evidence, monitoring, and operating responsibilities.
- [x] Review rendered slides for clarity, consistency, and absence of secrets or personal data.
- [x] Present the completed architecture deck.

## Split-Brain Redis Webhook Flood Recovery

- [x] Define severity, assumptions, operator roles, and immediate containment for a split-brain Redis outage during a webhook flood.
- [x] Document provider-neutral and Redis CLI investigation commands for topology, replication, quorum, divergence, and flood state.
- [x] Document safe mutation-gate, ingress-throttle, and webhook pause commands with confirmation and rollback steps.
- [x] Document recovery, deterministic external-key reconciliation, duplicate prevention, evidence capture, and controlled reopening.
- [x] Review all commands for destructive-operation risk and mark provider-specific placeholders clearly.

## Fail-Closed Mutation Gate Integration Tests and Chaos Scenarios

- [x] Define synthetic test architecture, safety boundaries, and Redis-partition failure hypotheses.
- [x] Design deterministic integration fixtures and assertions for gate state, idempotency, audit writes, and Jira mutation counts.
- [x] Design chaos experiments for Redis partition, stale topology, lock uncertainty, recovery, and controlled reopening.
- [x] Write the integration tests and chaos scenario package.
- [x] Review the package for fail-closed correctness, destructive-risk controls, and production isolation.

## Staging Kubernetes Fail-Closed Mutation Gate

- [x] Define staging Kubernetes assumptions, trust boundaries, and provider-neutral deployment constraints.
- [x] Document required non-secret configuration and secret environment variables.
- [x] Write Kubernetes manifests with fail-closed defaults, probes, RBAC, network policy, and secret references.
- [x] Review the package for secret leakage, unsafe defaults, and staging-only deployment safeguards.

## Staging Kubernetes Deployment Presenter Script

- [x] Define the presenter narrative for the staging Kubernetes deployment and fail-closed security posture.
- [x] Generate speaker notes covering configuration, secrets, hardening, networking, canary validation, and rollback.
- [x] Review notes for technical accuracy, operational clarity, and staging-only boundaries.
- [x] Present the deck with the completed script.

## Prometheus and Grafana Fail-Closed Monitoring

- [x] Read required scheduling guidance and define telemetry scope, privacy boundary, and production safety assumptions.
- [x] Define metric taxonomy, labels, cardinality limits, and recording rules.
- [x] Design Grafana dashboard panels, SLOs, and alert thresholds for gate, Redis, webhook, idempotency, Jira, and audit signals.
- [x] Specify alert routing, incident workflow, and safe remediation links.
- [x] Write and review the Prometheus/Grafana dashboard specification.

## Volunteer Onboarding and Admin Assignment Workflow Guide

- [x] Reconcile documented volunteer onboarding, role-room, task, proof, and administrator authorization rules.
- [x] Write the end-to-end volunteer and administrator procedure.
- [x] Review permissions, state transitions, notifications, retention, recovery, and audit safeguards.

## Volunteer Assignment Schema, RLS, and API Package

- [x] Read secure portal guidance and reconcile the deployed/base HMSI data model.
- [x] Design assignment, proof, audit, idempotency, and retention schema.
- [x] Write restrictive RLS policies and server-side authorization rules.
- [x] Write assignment lifecycle and proof submission API route references.
- [x] Write integration tests and review privacy, authorization, and retention controls.

## Volunteer Task Lifecycle End-to-End Tests

- [x] Inspect existing test conventions and define isolated synthetic E2E boundaries.
- [x] Design fixtures and role-specific assertions for assignment, execution, proof, review, and completion.
- [x] Implement the Playwright or Jest end-to-end test suite.
- [x] Run and review positive, negative, audit, idempotency, and cleanup scenarios.

## Database Pooling and RLS Load Tests

- [x] Define peak volunteer traffic model, staging safety boundary, and measurable pass/fail outcomes.
- [x] Design synthetic fixtures and workload scenarios for connection pools, RLS reads, assignment writes, and contention.
- [x] Implement load, concurrency, authorization, and latency measurement tests.
- [x] Run synthetic tests and review pool pressure, RLS isolation, and mutation invariants.

## Supabase Pooling and Statement Timeout Configuration

- [x] Read current Supabase pooler and PostgreSQL timeout guidance.
- [x] Map smoke, peak, burst, and soak profiles to connection and timeout budgets.
- [x] Write Supabase, PostgreSQL, and application-side configuration snippets.
- [x] Add verification queries, monitoring checks, and rollback guidance.

## Supavisor Real-Time Dashboard Configuration

- [x] Reconcile existing Supavisor telemetry sources and fail-closed monitoring conventions.
- [x] Define the Supavisor metric contract, recording rules, and privacy-safe label controls.
- [x] Create Grafana dashboard panels and Prometheus alert rules for utilization, timeout errors, and queue latency.
- [x] Document staging validation, incident routing, runbook links, and rollback controls.

## Staging Monitoring Deployment Pipeline

- [x] Read automation guidance and define repository, staging, secret, and approval boundaries.
- [x] Design validation, rollback, artifact, and failure-handling controls for Prometheus and Grafana configuration.
- [x] Write the GitHub Actions workflow and staging deployment helper scripts.
- [x] Run static tests and review the pipeline for secret leakage and production-target safeguards.

## Staging Monitoring Post-Deployment Smoke Test

- [x] Define synthetic smoke-test scope, staging boundaries, and observable success criteria.
- [x] Write the Prometheus, Grafana, and Alertmanager smoke-test helper.
- [x] Add static tests and deployment-pipeline integration guidance.
- [x] Run local synthetic validation and review target and secret safeguards.

## Staging Workflow Least-Privilege Token Security Assessment

- [x] Review workflow, helper scripts, and staging credential boundaries.
- [x] Map each credential to minimum permissions, target restrictions, and secret controls.
- [x] Assess exposure paths, rotation, revocation, monitoring, and residual risks.
- [x] Write and review the least-privilege token security assessment report.

## Production Volunteer Assignment Workflow

- [x] Inspect the current portal schema, role/session model, routes, components, and notification boundary for volunteer integration.
- [x] Define additive migration, RLS, protected API, navigation, assignment, progress, proof, audit, and notification changes.
- [x] Apply additive schema/RLS migration and implement secure assignment, task, proof, and review routes.
- [x] Add the Admin Volunteer Assignments menu, assignment form, progress register, and protected volunteer task/proof experience.
- [x] Run migration, unit, integration, negative-authorization, and UI validation with synthetic data.
- [x] Deploy the approved implementation and report the live verification status.

## Role-Based People Operations and President’s Office

- [x] Inspect the live approved-user schema, directory data, role dashboards, notification utilities, assignment review controls, and President’s Office administration surface.
- [x] Define additive approved-contact, role-tool, directory, submission-review, audit, and President’s Office changes.
- [x] Implement durable approved-contact readiness, live directory data, and administrator-only work approval controls.
- [x] Implement role-aware dashboard tools and an organized President’s Office oversight workspace.
- [x] Run database, authorization, notification-boundary, synthetic regression, and UI validation.
- [x] Deploy the vetted people-operations enhancements and report live verification status.

## Approved Volunteer Directory and Assignment Eligibility Fix

- [x] Diagnose why approved volunteers are absent from the volunteer assignment directory and why the President’s Office route reports records not ready.
- [x] Correct production role-directory and President’s Office aggregation so approved active volunteers appear with protected notification readiness.
- [x] Validate volunteer assignment eligibility without creating a task or sending a notification.
- [ ] Create a named volunteer assignment only after task details and explicit final confirmation are supplied.

## Cross-Role Location and Duplicate-Application Protection

- [x] Inspect worker, volunteer, and member application/onboarding schemas and submission routes for location capture, duplicate handling, and approval activation consistency.
- [x] Add additive location fields and protected admin-directory display across worker, volunteer, and member records.
- [x] Enforce server-side one-active-application-per-email handling with a clear pending-approval response for workers, volunteers, and members.
- [x] Align approved worker, volunteer, and member directory/assignment readiness with portal activation status without exposing private data publicly.
- [x] Add cross-role regression coverage, apply the reviewed additive migration, and validate the live behavior without sending emails or creating applications.
- [x] Deploy the verified cross-role onboarding and duplicate-prevention release.

## Goodstack Verification Follow-up

- [x] Inspect the Goodstack verification application status and any outstanding information or document requirements.
- [x] Review the official requirement context without submitting, uploading, or changing the application.
- [x] Report the current status and obtain explicit approval before any Goodstack verification action.

## Goodstack Authorized Application Action

- [x] Attempt the Goodstack organization sign-in or claim flow using the authorized official contact email, pausing for any password, one-time code, CAPTCHA, document, or identity-verification step.
- [x] Resume or submit only the explicitly authorized Goodstack application information and record non-sensitive application status details.

## Goodstack CAC Evidence Staging

- [x] Locate a candidate official HMSI CAC registration document, confirm its file format and size, and stage it for user review without submitting it to Goodstack.
- [x] Upload the user-verified CAC evidence to the existing Goodstack form and obtain final confirmation before any verification submission.

## Goodstack CAC Certificate Receipt

- [x] Enter the official registration details from the user-provided CAC certificate and upload that certificate to Goodstack without submitting the final application.
- [x] Review the resulting Goodstack application status and obtain explicit final approval before verification submission.

## HMSI Database, Security, and President-Authority Ecosystem Review

- [x] Inspect database coverage for HMSI operational branches, role directories, onboarding, tasks, finance, content, communications, and audit history using metadata and aggregate-only checks.
- [x] Assess RLS, server authorization, private-contact handling, onboarding safeguards, and known security-advisor findings without changing production controls.
- [x] Evaluate the long-term onboarding-to-work lifecycle and identify automation opportunities with appropriate President/administrator separation of duties.
- [x] Produce a prioritized ecosystem roadmap covering data governance, branch operations, onboarding automation, Presidential authority, monitoring, and safe implementation phases.

## HMSI Governance Foundation Implementation

- [x] Inspect current security-definer functions, automation infrastructure, role routes, and migration patterns before implementation.
- [x] Add safe search-path hardening and restrict unintended public execution of privileged database functions.
- [x] Add additive operational-unit, programme, organization-role, scoped-delegation, approval-request, approval-event, and automation-run data models.
- [x] Add member onboarding invitation/progress parity and controlled branch/programme assignment support without inferring historical mappings.
- [x] Add protected President’s Office governance views and administrator routes for scoped delegation, approval queues, automation run history, and branch summaries.
- [x] Add static and behavioral contract coverage, apply reviewed migrations, and run full regression, build, and passive production checks.
- [x] Commit, push, and verify the production deployment; do not enable recurring outbound notifications without a separate bounded confirmation.

- [x] Add Vitest unit and integration coverage for security-event route timeout handling, redaction, and fail-closed 401/403 preservation.

- [x] Design privacy-safe alert thresholds, routing, incident response, containment, recovery, and post-incident controls for repeated origin failures and security-event database timeouts.

- [x] Add a secure CI/CD pipeline that validates and provisions Prometheus alert rules and Grafana dashboards with environment-scoped secrets and post-deployment verification.

- [x] Add Semgrep custom rules and fixtures for sensitive-header logging, request serialization, dynamic metric labels, and unsafe security-event payloads; runtime Semgrep execution remains a CI/environment validation step.

- [x] Add a local Semgrep contract test that asserts known sensitive-header violations are detected and the safe fixture remains clean; full Semgrep execution awaits a Semgrep-enabled environment.

- [x] Integrate the custom Semgrep rules into a local pre-commit hook and required GitHub Actions pull-request gate.

- [x] Add a fail-closed Python validator for Semgrep suppression metadata, exact rule IDs, required fields, and UTC expiration dates.

- [x] Add a privacy-minimized exception-summary script with idempotent Slack alerting for expired and expiring Semgrep suppressions; keep scheduling disabled until separately authorized.

- [x] Document a secure recurring GitHub Actions workflow for Semgrep exception summaries with protected webhook secrets and durable deduplication; do not enable it without explicit cadence and recipient authorization.

- [x] Design a private durable state schema for expired-security-exception alert deduplication, compare-and-set delivery, retention, RLS, and least-privilege access; production migration remains separately gated.

- [x] Add an additive Supabase migration for durable security-exception alert state, delivery attempts, RLS, grants, and atomic claim semantics; keep production application separately gated.

- [x] Add a server-only TypeScript client for atomic security-exception alert claim, sent, and failed Supabase stored procedures with typed validation and tests.

- [x] Add aggregate-only Grafana dashboard queries/schema for alert delivery success rates, failure outcomes, duplicate suppression, and retry queue backlogs.

- [x] Add a server-side TypeScript Prometheus exporter for aggregate alert delivery success, retry backlog, retry age, and attempt outcomes with privacy-safe labels.

- [x] Design secure Prometheus and Alertmanager PagerDuty routing for critical retry-queue backlog, with deduplication, privacy-safe annotations, testing, and rollback; do not enable live paging.

- [x] Add a provider-neutral TypeScript circuit breaker for Slack/PagerDuty delivery with bounded timeouts, retry-after support, provider isolation, and tests.

- [x] Write a deployment and operational runbook for security-alert triage, circuit-breaker tuning, PagerDuty escalation, privacy-safe evidence handling, rollback, and recovery.

- [x] Add reviewable Terraform IaC for Supabase migration application, GitHub Actions AWS OIDC role, and staging monitoring resources with least-privilege defaults; do not provision without explicit authorization.

- [x] Add a secure GitHub Actions Terraform CI workflow for fmt, lint, validate, OIDC-backed read-only plan, secret-safe artifacts, and no apply step.

- [x] Add a separate protected Terraform CD workflow that triggers only after a pull request is merged into main, plans with OIDC, and applies only the reviewed saved plan.

- [x] Add an approval-gated Terraform rollback workflow that restores a selected previous remote state version after apply failure, with state backup, OIDC, workspace verification, and reconciliation guidance.

- [x] Add a protected read-only workflow that lists the five newest S3 Terraform state VersionIds and safe metadata without downloading state contents.

- [x] Integrate failure-only S3 state-version discovery into the Terraform CD workflow without automatic rollback or state mutation.

- [x] Add sanitized automatic GitHub issue creation to the Terraform CD apply-failure path with safe state-version metadata, bounded diagnostics, deduplication, and no raw log leakage.

- [x] Add an authorized issue-comment Terraform rollback workflow with exact VersionId parsing, allowlisted commenters, protected approval, replay guards, and sanitized issue audit updates.

- [x] Run a verification-only terraform plan after rollback, with no refresh, apply, state mutation, or plan artifact publication.

- [x] Close the Terraform failure issue only when rollback succeeds and the post-rollback verification plan returns match; leave it open for all other outcomes.

- [x] Defer team-slug binding at the user's direction; use the protected production Environment for manually configured required reviewers.

- [x] Configure the Terraform CD apply behind the protected production Environment in YAML without binding a team slug, and document manual required-reviewer setup.

- [x] Notify Slack when the production CD job reaches the manual approval gate, using a protected webhook secret and sanitized deployment metadata without bypassing approval.

- [x] Add a supported direct GitHub Actions run link to the Slack production approval notification and document the reviewer navigation boundary.

- [x] Configure the protected production Environment with a 24-hour approval wait timer so unapproved deployments fail automatically, and document the required GitHub Settings control.

- [x] Add an idempotent sanitized pull-request comment when a merged production deployment reaches the manual approval path, with least-privilege pull-request write permission and no approval bypass.

- [x] Delete only the marked pending-approval pull-request comment after successful production deployment, while retaining it for failed, cancelled, timed-out, or rejected runs.

- [x] Send a final sanitized Slack notification after production apply completion, reporting success or failure without exposing Terraform output or state data.

- [x] Add the `deployed-to-prod` label to the merged pull request only after successful production deployment, with least-privilege GitHub permissions and no failed-run labeling.

- [x] Include the merged PR number, author login, and merged PR link in the final Slack deployment-status notification without adding untrusted PR content.

- [x] Create and validate a reusable HMSI secure portal governance and Terraform deployment-controls skill without secrets or project-specific credentials.

- [ ] Design and safely implement a complete HMSI transactional and lifecycle email automation system with consent, suppression, idempotency, and draft-first activation controls.

- [x] Create an Excel tracking log for Goodstack verification and other platform applications with status controls, evidence tracking, follow-up dates, dashboard summaries, and secure handling guidance.

- [x] Create a visual chart for application statuses and follow-up priorities from the HMSI tracker data, with a blank-state safeguard when no records are present.

- [x] Add clearly labeled synthetic sample application records to a preview copy of the HMSI tracker and regenerate the status and follow-up-priority charts without changing the clean master template.

- [x] Export high-priority follow-up items from the populated tracker preview into a separate actionable checklist with owners, due dates, status controls, and synthetic-data labeling.

- [x] Create a visual chart showing task-status and owner distributions from the exported high-priority checklist, preserving the synthetic preview label.

- [x] Add the verified 2020 Entrepreneurship Support NGO of the Year – West Africa award to appropriate HMSI public portal surfaces, metadata, and trust/recognition content with consistent attribution.

- [x] Create a stakeholder presentation slide summarizing the 2020 award update, portal publication surfaces, governance accomplishments, and remaining readiness boundaries.

- [x] Add evidence-aware partner and network entries from the supplied correspondence to the HMSI partnerships page, with relationship categories, source notes, and no unsupported formal-partnership claims.

- [x] Review remaining uploaded screenshots and attachments for additional awards or certifications, compare with existing portal recognition content, and document publication recommendations.

- [x] Create stakeholder presentation slides summarizing HMSI partner additions, evidence-aware relationship labels, and award publication status.

- [x] Audit all remaining public HMSI portal pages for outdated, missing, placeholder, inconsistent, or broken information and document findings with recommended corrections.

- [x] Draft a production-safe remediation plan for reconciling public fundraiser totals with successful donation records and donor counts, including audit, backfill, verification, rollback, and monitoring steps.

- [x] Write exact read-only PostgreSQL diagnostics for HMSI donations and fundraisers, including duplicate Paystack references, ledger-vs-summary discrepancies, donor-count mismatches, status exceptions, currency issues, and orphaned records.

- [x] Draft a safe transactional PostgreSQL migration template for approved fundraiser reconciliation and explicitly verified Paystack-reference duplicate handling, with dry-run default, audit preservation, allowlists, and rollback safeguards.

- [x] Draft a brief presentation script explaining the donation reconciliation migration safety controls, execution sequence, verification gate, and rollback path.

- [x] Expand the donation reconciliation migration script into a stakeholder sign-off slide deck with detailed speaker notes and explicit production-execution boundaries.

- [x] Draft an engineering and finance team email update for the donation reconciliation migration review, including safety controls, no-production-change status, sign-off roles, and next steps.

- [x] Draft a presentation script for the engineering and finance team meeting reviewing the donation reconciliation migration update email, with speaking roles, discussion prompts, and sign-off criteria.

- [x] Draft a sanitized leadership email requesting approval for the donation reconciliation dry-run, including prerequisite evidence, accountable roles, and an explicit no-commit boundary.

- [x] Draft a staging-only post-dry-run validation checklist with read-only SQL queries for reconciliation totals, duplicate references, status/currency exclusions, audit behavior, and rollback integrity.

- [x] Publish the supplied 2021 Nigerian Volunteers Award event-support evidence in an accurate community-support context without presenting HMSI as the award recipient.
- [x] Audit current HMSI administrator and president authorization paths and document a least-privilege executive-access model with audit and high-risk-action safeguards.

- [x] Write a post-migration production monitoring plan for the final donation reconciliation apply run, covering integrity checks, public health, alerts, escalation, ownership, and rollback triggers.

- [x] Draft a condensed 10-minute executive briefing script for senior leadership reviewing the donation reconciliation migration decision, controls, risks, and required approvals.
- [x] Design a schema-aware migration plan for individually scoped executive and administrator roles, permission grants, delegations, approvals, and RLS enforcement without applying production changes.
- [x] Draft an idempotent, dry-run-first PostgreSQL migration script for scoped roles and audited executive access to volunteer, worker, member, and community-room records; do not grant shared or anonymous bypass access.
- [x] Validate the migration assumptions against the existing HMSI database scripts and document required staging tests, rollback steps, and explicit approval gates.
- [x] Design a fail-closed review queue for matching historical governance-role emails to named Supabase Auth user IDs before any role activation.
- [x] Draft a dry-run-first SQL backfill and separately approved activation script that handles no-match, duplicate-match, mismatch, and already-bound role records safely.
- [x] Validate the backfill script structure and document the evidence, co-approval, staging verification, rollback, and production cutover requirements.
