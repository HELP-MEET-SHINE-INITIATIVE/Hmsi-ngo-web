# Worker and Volunteer Dashboard UI Design

**Status:** Frontend design specification. It is aligned with the existing protected portal and the proposed volunteer assignment model. This document does not apply a database migration, create a live assignment, change credentials, or send notifications.

## Product direction

The dashboard should feel like a calm work console rather than a general website. A newly onboarded person should immediately understand three things: what work is assigned, what action is expected next, and where to ask for help. The interface should keep role-specific navigation short, use plain-language actions, and make evidence submission private and explicit.

The current implementation already has a protected unified task workspace at `/portal/my-tasks`, a role dispatcher at `/portal`, role rooms at `/worker-room` and `/volunteer-room`, the protected proof route at `/portal/submissions`, and the role-filtered `WorkspaceOpportunities` component. The design below consolidates those patterns into a reusable shell instead of introducing a second authentication or authorization system.

## Role menu structure

### Worker navigation

| Order | Label | Destination | Purpose |
|---:|---|---|---|
| 1 | My jobs | `/portal/worker#jobs` | Assigned field and operational work, sorted by status and due date. |
| 2 | Opportunities | `/portal/worker#opportunities` | Approved worker openings that can be reviewed or applied for. |
| 3 | Worker Operations Room | `/worker-room` | Role-matched coordination and daily activity discussion. |
| 4 | Submit proof | `/portal/submissions` | Private Google Drive or report-link submission when a job requires evidence. |
| 5 | How it works | `/portal/worker#how-it-works` | Four-step onboarding guide: open, accept, act, report. |
| 6 | Help and sign out | `/get-help` and the session logout action | Support and safe session exit. |

### Volunteer navigation

| Order | Label | Destination | Purpose |
|---:|---|---|---|
| 1 | My jobs | `/portal/volunteer#jobs` | Volunteer assignments once the volunteer-assignment API is enabled. |
| 2 | Opportunities | `/portal/volunteer#opportunities` | Approved volunteer openings, with application status where available. |
| 3 | Volunteer Community Room | `/volunteer-room` | Role-matched coordination and community discussion. |
| 4 | Submit proof | `/portal/submissions` | Private evidence/report link submission with Drive-sharing guidance. |
| 5 | Getting started | `/portal/volunteer#how-it-works` | Plain-language orientation for a newly approved volunteer. |
| 6 | Help and sign out | `/get-help` and the session logout action | Support and safe session exit. |

The menu should not expose administrator links, another role’s room, identity-management controls, or unapproved work. A compact mobile menu should preserve this same order and use `aria-current` for the active section.

## Page composition

Both dashboards use the same `RoleWorkspaceShell` with role configuration supplied as data rather than duplicated JSX:

```ts
type PortalRole = 'worker' | 'volunteer';

type RoleWorkspaceConfig = {
  role: PortalRole;
  eyebrow: string;
  title: string;
  welcomeCopy: string;
  roomHref: string;
  roomLabel: string;
  opportunitiesLabel: string;
  emptyJobsCopy: string;
};
```

The shell has six visually distinct regions. The top bar contains the HMSI mark, page title, role label, notification-safe sign-out control, and a compact menu trigger on mobile. The summary strip shows open jobs, submitted work awaiting review, and the next due date. The “Your next steps” panel gives four numbered steps. The jobs section contains task cards. The opportunities section is rendered by `WorkspaceOpportunities`. The final support strip links to the matching room, protected proof submission, and help route.

The first screen on a phone should show the welcome, summary count, and the first job’s next action without requiring horizontal scrolling. On desktop, the guide and summary sit beside each other, while jobs and opportunities use the full content width.

## Reusable components

| Component | Responsibility | Key props |
|---|---|---|
| `RoleWorkspaceShell` | Role-specific header, menu, summary, support links, and content regions. | `config`, `identity`, `children` |
| `WorkspaceMenu` | Desktop links and mobile disclosure menu. | `items`, `activeId`, `onSignOut` |
| `WorkspaceSummary` | Open-job, submitted-review, and due-date metrics. | `assignments`, `role` |
| `GettingStartedPanel` | Four-step guide and role-specific empty-state copy. | `role`, `hasAssignments` |
| `AssignmentCard` | Job summary, status, priority, due date, attribution, and next action. | `assignment`, `onExpand`, `onTransition`, `onSubmitProof` |
| `AssignmentDetail` | Full brief, required outcome, source dispatch/opportunity, safety notes, and proof requirement. | `assignment`, `expanded` |
| `TaskStatusAction` | Renders the only valid next action for the current state. | `status`, `busy`, `onClick` |
| `ProofLinkPrompt` | Explains private Drive submission and opens the protected submission flow. | `assignmentId`, `proofRequired`, `returnHref` |
| `WorkspaceOpportunities` | Existing role-filtered opportunities feed and approved application entry. | `role`, `id` |
| `RoomEntry` | Matching room CTA with plain-language purpose. | `href`, `label`, `description` |
| `WorkspaceNotice` | Loading, empty, error, success, and session-expiry states. | `tone`, `title`, `message`, `action` |

`AssignmentCard` should be the main reusable unit. It must never render administrator actions such as reassign, delete, or mark another person’s work complete.

## Assignment-card interaction model

The card header contains a small category badge, priority badge, status badge, title, due date, and a `View full job` button. The collapsed description is limited to a readable excerpt. Expanding the card reveals the complete brief and a “Required outcome” block. If an article or opportunity generated the job, the card shows a non-editable “Originating dispatch” or “Opportunity” attribution link.

The next action is status-driven:

| Status | Primary button | Secondary affordance |
|---|---|---|
| `assigned` | `Accept and start job` | `View full job` |
| `accepted` | `Start work` | `View full job` |
| `in_progress` | `Submit proof` when proof is required; otherwise `Mark ready for review` | `View full job` |
| `submitted` | `Awaiting administrator review` disabled state | View submitted status |
| `completed` | `Completed` confirmation state | View final note/status |
| `rejected` or `cancelled` | `Closed` disabled state | Read the closure reason if available |

All mutations show a busy state on the clicked card only. On success, the card updates in place and a `role="status"` message confirms the result. On failure, the prior card state is restored and an actionable message explains whether the user should retry, refresh, or contact HMSI support. Double-clicks are prevented with a per-assignment idempotency key or disabled state.

## Proof-link workflow

The `ProofLinkPrompt` must appear inside the expanded card whenever `proof_required` is true or the volunteer/worker chooses to add supporting material. The prompt should say that the user should upload the file to their approved Google Drive, set sharing to Viewer for the named HMSI administrator, paste the HTTPS link, and keep the original file until HMSI confirms ingestion.

The link form contains a URL input, an optional context note, a clear privacy warning, and a `Submit proof link` button. Client validation catches blank values and malformed URLs for usability; the server remains authoritative and validates HTTPS, allowed Google Drive/Docs hosts, maximum note length, assignment ownership, active identity, and current task state. The form should never display or log a raw setup token, session cookie, or service credential.

After a successful submission, the task changes to `submitted` and the proof area shows a masked or hostname-only confirmation rather than making the full link prominent. Administrators can review the full link through their protected workflow. A `needs_revision` result returns the card to an actionable state with the administrator’s safe feedback.

## Opportunities section

The opportunities section belongs in its own menu anchor and appears after active jobs. Workers see worker-compatible openings; volunteers see volunteer-compatible openings. The empty state should explain that applying is not the same as receiving an assignment: an administrator must review and approve the application first. This distinction prevents a newly onboarded person from believing that browsing an opening grants operational authority.

Each opportunity row shows title, category, location or remote status, required skill, closing date, and one action: `View opportunity` or `Apply`. The UI should not show confidential applicant data, internal assignment notes, or administrator-only controls.

## Session and access behavior

The dashboard should request `/api/portal/tasks` with `credentials: 'include'` and `cache: 'no-store'`. A 401 response redirects to `/login`; a role mismatch redirects to `/portal`; a 503 response shows a temporary service notice without exposing configuration details. The existing periodic refresh pattern may refresh task data every five minutes and call `/api/portal/auth/refresh` every ten minutes while the page is open. Timers must be cleared on unmount.

Room links are navigation conveniences only. The room page and `/api/portal/rooms/[role]` must continue to enforce the role independently. A worker entering `/volunteer-room`, or a volunteer entering `/worker-room`, should receive a safe redirect or forbidden response. The same ownership check applies to task reads, status changes, and proof submissions.

## Accessibility and responsive requirements

Use semantic landmarks, one page-level `h1`, visible keyboard focus, descriptive button labels, and `aria-expanded` on expandable job details. Do not rely on color alone for priority or status. Every badge must have text. Error and success notices use `role="alert"` and `role="status"` appropriately. The mobile menu must be keyboard-operable and close after navigation. Long descriptions should wrap naturally; no task card should require horizontal scrolling.

The desktop layout should use a constrained content width with a two-column guide/summary region. At approximately 768px and below, switch to one column, keep buttons full-width or comfortably tappable, and keep the menu as a disclosure. Reduced-motion preferences should disable nonessential transitions.

## Empty, loading, and error states

A newly onboarded user with no jobs sees a welcoming empty state, a direct room link, the opportunities section, and a concise statement that administrators assign verified work. A volunteer should not see “No jobs means no access”; room and opportunity access remain visible. A worker with completed jobs sees the most recent completed work below open work or behind a status filter. Network failures show a retry action without clearing already loaded task data.

## Implementation boundary

This design can be implemented using the existing portal pages and components without a database migration. The proposed volunteer assignment schema is still required before real volunteer jobs can appear. Until then, the volunteer dashboard should render an honest empty-job state while keeping opportunities, room access, proof guidance, and help available. The first schema-backed release should add volunteer task queries and mutations behind the server authorization rules described in the companion implementation plan.

## Acceptance criteria

| Area | Acceptance condition |
|---|---|
| Role menu | Workers and volunteers see only their own room, work, opportunities, proof, help, and sign-out links. |
| Job clarity | Every active job exposes title, brief, required outcome, status, priority, due date, and one obvious next action. |
| Proof safety | Proof links are submitted through a protected route, validated server-side, and never exposed in public UI or logs. |
| Role isolation | A user cannot read, mutate, or submit proof for another role’s or another person’s job. |
| Session continuity | Active workspaces refresh tasks and valid sessions without storing tokens in browser application state. |
| New-user usability | Empty states explain what to do next and distinguish opportunities from confirmed assignments. |
| Responsive access | Menu, cards, forms, and notices work on narrow mobile screens with keyboard and screen-reader support. |

## References

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"

[2]: https://supabase.com/docs/guides/auth/sessions "Supabase Auth Sessions"
