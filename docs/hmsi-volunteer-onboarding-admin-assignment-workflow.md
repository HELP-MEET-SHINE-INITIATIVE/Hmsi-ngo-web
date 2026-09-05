# HMSI Volunteer Onboarding and Administrator Assignment Workflow

## Purpose and implementation status

This guide explains how a volunteer should move from application to approved portal user, how an authorised administrator issues and controls assignments, and how the volunteer performs and submits work. It is aligned with the existing HMSI portal design, the volunteer assignment implementation plan, and the worker/volunteer dashboard specification.

The documented assignment model is a controlled design for the schema-backed volunteer workflow. The implementation plan explicitly states that the volunteer assignment table, migration, API mutation, user assignment, notification, and production data change are design work unless separately deployed. Until that release is enabled, a volunteer may have portal, room, opportunities, and proof guidance while seeing an honest empty-job state. An opportunity application must never be treated as an assignment.[1] [2]

## 1. Roles and access levels

| Actor | Can access | Can do | Cannot do |
|---|---|---|---|
| Applicant | Registration/application flow | Submit identity, contact, skills, location, and role preferences for review | Enter the operational task feed before approval; assign work; access private rooms before authorization |
| Approved volunteer | Volunteer portal, Volunteer Community Room, approved opportunities, own jobs when assignments are enabled, protected proof submission | View own assigned work, accept, progress, submit proof, request help, sign out | Publish directly to the public news feed; read another volunteer’s work; reassign, delete, or complete another person’s task |
| Administrator | Admin dashboard, volunteer directory, applications, assignment register, editorial and operational controls | Approve or reject applications, verify eligibility, create assignments, review proof, request revisions, complete/cancel/reassign work, send official notifications, review audit history, recover soft-deleted records within policy | Bypass two-person review or audit requirements; expose private proof publicly; use a volunteer’s credentials; make an assignment to an unapproved or inactive volunteer |
| Security/platform operator | Operational control plane and monitoring | Maintain authentication, notification, audit, Redis/idempotency, and platform safety controls | Act as the volunteer or bypass application-layer authorization without an approved incident procedure |
| Governance reviewer | Bounded audit and retention evidence | Review approvals, state transitions, retention, exceptions, and access records | Edit assignments or volunteer records as an ordinary reviewer |

The administrator’s authority is application-layer authority, not an invitation to use a service-role key directly from the browser. The server must independently verify the administrator session, role, request origin protections, assignment input, target volunteer status, and audit requirements before any mutation.

## 2. Volunteer onboarding workflow

### Step 1 — Volunteer application and role selection

The volunteer starts through the approved HMSI registration or application flow. The form should collect only the information necessary for identity and operational matching: name, email, phone or WhatsApp contact where required, primary skill, location, availability, role preference, and relevant consent or safeguarding acknowledgements. The volunteer may express interest in roles such as Community Publisher, Humanitarian Activist, Independent Field Reporter, Field Worker, Outreach, or another approved HMSI profile.

The application is not an assignment. It is a request for review. The applicant must receive a clear status such as `pending`, and the system must not grant operational task authority, private room access, or access to another person’s data merely because the form was submitted.

### Step 2 — Administrator review

An authorised administrator reviews the application in the protected application-management workflow. The review should verify that the submission is complete, that the chosen role is operationally appropriate, that the volunteer is eligible for the requested access, and that any safeguarding or identity checks required by HMSI have been completed.

The administrator should record a bounded review decision, reviewer identity, timestamp, and reason category. The record should not copy unnecessary personal details into audit notes. A pending applicant remains outside the assigned-task feed.

### Step 3 — Approval and account activation

When approved, the administrator changes the application to `approved` and activates the account according to the configured authentication flow. The server should ensure that the volunteer identity is linked to the approved application record and that `account_status = active`, `is_deleted = false`, and onboarding requirements are satisfied before role-specific access is returned.

The official notification system may send a welcome or access message from the approved HMSI onboarding sender. Notification delivery should record a bounded delivery status and provider message ID, not password values, setup tokens, or private proof links. Password creation or reset must use the secure authentication flow rather than emailing a permanent password.

### Step 4 — Role-based portal entry

After authentication, the role dispatcher routes the volunteer to the volunteer workspace. The volunteer navigation should be deliberately short:

| Menu item | Purpose |
|---|---|
| My jobs | Shows the volunteer’s own active and historical assignments when the assignment API is enabled |
| Opportunities | Shows volunteer-compatible openings and application status |
| Volunteer Community Room | Provides role-matched coordination and community discussion |
| Submit proof | Opens protected proof-link submission for an assigned job |
| Getting started | Explains the open → accept → act → report workflow |
| Help and sign out | Provides support and a safe session exit |

The volunteer should not see administrator links, worker-only rooms, another role’s dashboard, identity-management controls, reassignment controls, deletion controls, or private directory information. A role-mismatch request must be rejected or safely redirected by the server even if a user manually enters another URL.[2]

## 3. Administrator procedure for issuing an assignment

### Step 1 — Open the assignment register

The administrator enters the protected volunteer-assignment area and reviews the approved volunteer directory. The directory should show only the minimum matching data needed for assignment: volunteer name, approved role, location or operating region where appropriate, availability, active workload, and onboarding state.

The administrator should first confirm that the target volunteer is:

| Eligibility check | Required state |
|---|---|
| Application | `approved` |
| Account | `active` |
| Onboarding | Complete enough for the specific duty |
| Deletion | `is_deleted = false` |
| Capacity | Available or within approved active capacity |
| Role fit | Compatible with the duty profile |
| Safeguarding | Any task-specific requirement satisfied |
| Contactability | Official notification route is available or an exception is documented |

A volunteer with a pending, rejected, inactive, removed, or deleted record must not be assignable. An opportunity application alone must not create a task.

### Step 2 — Create the assignment

The administrator chooses either an existing unassigned operational task or creates a new task. Required fields are the title, description, required outcome, target volunteer, priority, due date where applicable, proof requirement, and optional originating article or opportunity.

The assignment should be expressed in plain language. The volunteer must be able to answer: what is the action, what does success look like, when is it due, what safety boundary applies, and what evidence is required. A task generated from a field dispatch should preserve non-editable attribution such as the originating dispatch title, publisher name, and verification date.

The server, not the browser, writes `assigned_by`, timestamps, volunteer identity, and role. The browser must not be trusted to submit `volunteer_id`, `assigned_by`, `actor_email`, or role values without independent server verification.

### Step 3 — Confirm and dispatch notification

Before saving, the server validates the task, checks assignment eligibility, verifies any source article or opportunity, and applies an idempotency key so a double click cannot create duplicate assignments or duplicate emails. The assignment is inserted with an initial status of `assigned`, and an append-only event is written.

The official onboarding or assignment sender dispatches a notification containing the task title, safe summary, due date, priority, and a protected deep link to the volunteer’s task. The email must not expose private Drive links, access tokens, passwords, or raw internal notes. Delivery status is recorded as `sent`, `failed`, or `pending`, with retry behavior bounded and auditable.

### Step 4 — Verify the assignment

The administrator confirms that the assignment appears in the volunteer’s own task feed, that the task detail route requires the volunteer’s authenticated identity, and that the notification is associated with the correct assignment. A successful assignment does not mean the volunteer has completed the work; it means the volunteer is now authorized to act on that specific task.

## 4. Volunteer task-execution workflow

### Assigned

The volunteer sees the task card with title, priority, due date, source attribution, description, required outcome, and the next action. The primary action is `Accept and start job`. The volunteer can view the full job but cannot change administrator-owned fields.

### Accepted or in progress

The volunteer accepts the assignment and begins work. The server applies a conditional status update using the assignment ID, volunteer identity, expected current state, and `is_deleted = false`. This prevents a stale tab or another account from overwriting the record. The interface shows a busy state only on the selected task and confirms successful changes with an accessible status message.

### Proof submission

If proof is required, the volunteer uploads the material to the approved Google Drive location, sets sharing to Viewer for the named HMSI administrator, and submits the HTTPS Drive or Docs link through the protected proof route. The volunteer should keep the original file until HMSI confirms ingestion.

The server validates the URL host, HTTPS, assignment ownership, active identity, note length, current task state, and proof requirement. The full proof link must not appear in public UI, another volunteer’s feed, ordinary logs, or notifications. The volunteer sees a masked or hostname-only confirmation after submission.

### Submitted

The assignment changes to `submitted`, and the administrator receives a bounded review notification or sees the item in the review queue. The volunteer cannot mark the task complete on behalf of the administrator. The volunteer can see that the work is awaiting review and can respond to a revision request.

### Completed, revision requested, rejected, or cancelled

The administrator reviews the work and selects `completed`, `needs_revision`, `rejected`, or `cancelled` according to the evidence and task policy. A revision request includes safe feedback and returns the task to an actionable state. A completed, rejected, or cancelled task is closed to ordinary volunteer transitions.

## 5. Administrator controls after assignment

| Administrative action | What it means | Required safeguards |
|---|---|---|
| Review | Open the full protected task and proof context | Verify administrator session and audit the access |
| Edit duty | Correct instructions, outcome, priority, or due date | Preserve prior values in an audit event; do not silently rewrite history |
| Reassign | Move work to another eligible volunteer | Close or cancel the old assignment and create a new auditable assignment rather than silently changing ownership |
| Request revisions | Return submitted work with safe feedback | Do not expose internal notes or other volunteers’ data |
| Mark complete | Accept the outcome | Verify proof and write reviewer identity/timestamp |
| Cancel | Stop an open task | Record reason and notify the affected volunteer |
| Soft delete | Hide an assignment from active views | Set `is_deleted`, retain recovery metadata, and respect the 30-day recovery window |
| Restore | Return a soft-deleted assignment | Require administrator authorization, confirm recovery window, and write an audit event |
| Bulk action | Apply pause, reassignment, or deletion to multiple records | Validate each row independently and return affected/skipped counts |

Delete or recovery operations must not be used to conceal a governance decision. The active task feed should filter `is_deleted = false`, while the archive/recovery view should be restricted to authorised administrators and show recovery metadata.

## 6. Valid lifecycle and authorization rules

The expected state machine is:

| Current status | Permitted actor | Valid next state |
|---|---|---|
| `assigned` | Assigned active volunteer | `accepted` or `in_progress` |
| `accepted` | Assigned volunteer | `in_progress` |
| `in_progress` | Assigned volunteer | `submitted` when required note/proof is supplied |
| `submitted` | Administrator | `completed`, `needs_revision`, or `rejected` |
| Any open state | Administrator | `cancelled` or reassignment through a new record |
| `completed`, `rejected`, `cancelled` | Administrator recovery procedure only | No ordinary volunteer transition |

Every volunteer read and mutation must re-check the authenticated portal identity, role, corresponding volunteer application ID, approved state, active account status, assignment ownership, non-deleted state, and expected current status. Every administrator operation must re-check an administrator session, same-origin protections, target eligibility, input validation, and audit availability.

## 7. Notifications and rooms

The volunteer receives access to the Volunteer Community Room after role authorization, independent of whether a job exists. Room access is checked again by the room endpoint; a volunteer should not gain access to the Worker Operations Room by changing a URL.

Assignment notifications should use an official HMSI sender and a protected task deep link. The notification should state the task title, action expected, due date, and how to open the portal. It should never include a permanent password, private proof URL, session token, or raw administrator note. Notification retries must be idempotent and should not create duplicate assignment records.

## 8. End-to-end administrator checklist

1. Sign in through the authorised administrator account and open the volunteer directory or assignment register.
2. Confirm the volunteer is approved, active, fully onboarded for the duty, not deleted, available, and role-compatible.
3. Review whether the work comes from an approved opportunity, a verified dispatch, or a manually created operational need.
4. Create the task with a clear action, required outcome, priority, due date, safety instruction, and proof requirement.
5. Submit the assignment once and allow the server-side idempotency guard to prevent duplicate creation.
6. Confirm that the server—not the browser—recorded the assigning administrator, volunteer identity, timestamps, and audit event.
7. Confirm official notification dispatch status without exposing its token or private link content.
8. Verify that the volunteer can see only the assigned task and the correct role-based menu and room.
9. Monitor acceptance and progress; do not alter volunteer status from the volunteer’s browser.
10. Review submitted proof through the protected administrator route and select completion, revision, rejection, or cancellation.
11. Record any reassignment as a new auditable ownership record rather than silently changing the old assignment.
12. Use soft deletion and recovery procedures for cleanup, preserving the approved recovery window and audit history.

## 9. Volunteer quick-start checklist

1. Complete the HMSI application with accurate contact, skill, location, availability, role, and required acknowledgements.
2. Wait for administrator approval and official account activation.
3. Sign in through the HMSI portal and confirm that the Volunteer Community Room and Opportunities menu are visible.
4. Open `My jobs` when an assignment is issued and read the required outcome before accepting.
5. Accept the task, follow the safety instructions, and keep the task status current.
6. Upload required evidence to approved Google Drive, set the required sharing permission, and submit the protected link.
7. Keep the original evidence until HMSI confirms ingestion.
8. Respond to revision requests through the task workflow; do not create a second assignment to work around a review state.
9. Use the Volunteer Community Room or Help route when clarification is needed.
10. Sign out safely when finished.

## 10. Current limitation and release boundary

The design documents describe the intended schema-backed volunteer assignment process. They do not by themselves prove that every route, migration, notification, or production assignment is currently enabled. Before treating this as a live operational procedure, the release owner should verify the deployed assignment table, protected admin endpoints, volunteer task feed, notification provider configuration, role-room enforcement, RLS policies, audit table, idempotency guard, and soft-delete recovery process using synthetic or disposable accounts.

## References

[1]: https://www.hmsi.org.ng/ "Help Meet Shine Initiative public site; verify current public navigation and organizational information independently"  
[2]: ../docs/volunteer_task_assignment_implementation_plan.md "HMSI Volunteer Task-Assignment Model — Implementation Plan"  
[3]: ../docs/worker_volunteer_dashboard_ui_design.md "HMSI Worker and Volunteer Dashboard UI Design"  
