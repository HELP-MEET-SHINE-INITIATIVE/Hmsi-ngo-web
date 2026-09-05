# HMSI Tabletop Corrective-Action and Control-Gap Dashboard
## Jira / Notion Implementation Template

**Purpose:** Provide a single operational register for corrective actions and control gaps identified across HMSI communication-audit, emergency-restoration, Datadog, rollback, and public-boundary tabletop exercises.  
**Implementation options:** Jira project or Notion database.  
**Data posture:** Use bounded references and synthetic exercise data. Do not store raw safeguarding narratives, volunteer personal data, credentials, tokens, or sensitive incident content in the dashboard.

> **Operating principle:** A finding is not closed because it was discussed. It is closed only when the control change is implemented, independently validated, and supported by evidence.

## 1. Recommended data model

Each record represents one discrete control gap, corrective action, strength, or follow-up decision. If one finding produces several independent actions, create one parent finding and separate linked action records. This makes ownership, deadlines, and validation measurable.

| Field | Type | Required | Description |
|---|---|:---:|---|
| Action ID | Unique text/ID | Yes | Stable identifier such as `ACT-2026-001` |
| Record type | Select | Yes | `Control gap`, `Corrective action`, `Strength`, `Decision`, `Follow-up` |
| Source exercise ID | Relation/text | Yes | Tabletop or drill that produced the record |
| Source inject/control | Select/text | Yes | Inject, control ID, or decision point |
| Title | Text | Yes | Short, non-sensitive action title |
| Bounded description | Long text | Yes | What must change, without raw case details |
| Control domain | Multi-select | Yes | `Template`, `Routing`, `Privacy`, `Safeguarding`, `Security`, `Editorial`, `Public boundary`, `Monitoring`, `Audit`, `Recovery`, `Training` |
| Severity | Select | Yes | `Critical`, `High`, `Medium`, `Low`, `Informational` |
| Priority | Select | Yes | `P0`, `P1`, `P2`, `P3` |
| Status | Status | Yes | `New`, `Triaged`, `Accepted`, `In progress`, `Blocked`, `Ready for validation`, `Validated`, `Closed`, `Deferred` |
| Finding owner | Person/text | Yes | Accountable individual or team, not a shared mailbox alone |
| Implementer | Person/text | Yes | Person/team responsible for the change |
| Independent validator | Person/text | Yes | Must differ from implementer for critical/high actions |
| Management sponsor | Person/text | Conditional | Required for critical/high actions or risk acceptance |
| Opened at | Date/time | Yes | UTC timestamp |
| Target date | Date | Yes | Completion target |
| Validation due | Date | Conditional | Required before closure |
| Days to target | Formula/number | Yes | Derived from target date and current date |
| Aging band | Formula/select | Yes | `0–7`, `8–14`, `15–30`, `31–60`, `61+` days |
| Blocker reason | Select/text | Conditional | `Dependency`, `Approval`, `Access`, `Vendor`, `Evidence`, `Capacity`, `Unknown` |
| Risk accepted? | Checkbox | Conditional | Only management may approve; never substitutes for remediation |
| Risk acceptance expiry | Date | Conditional | Required when risk is accepted |
| Evidence reference | URL/text | Yes | Restricted evidence ID or approved link; no sensitive payload |
| Validation result | Select | Conditional | `Pass`, `Pass with conditions`, `Fail`, `Not run` |
| Change reference | Text/URL | Conditional | Pull request, ticket, change record, or configuration reference |
| Last review date | Date/time | Yes | Last owner or governance review |
| Next review date | Date | Yes | Required for open/deferred/accepted records |
| Closed at | Date/time | Conditional | Set only after validation and approval |
| Closure note | Long text | Conditional | Bounded explanation of what was verified |
| Audit trail reference | URL/text | Yes | Link or ID for immutable audit evidence |

Jira supports organization-specific custom fields and field contexts, and fields must be placed on the relevant screens to appear during creation, editing, or transitions.[1] Notion supports select, status, date, formula, relation, rollup, person, URL, checkbox, ID, created/edited metadata, and button properties that map well to this data model.[2]

## 2. Lifecycle and workflow rules

The workflow below applies in either platform. Status changes must be controlled by role and supported by required fields.

| Transition | Who may perform it | Required conditions |
|---|---|---|
| New → Triaged | Operations or governance coordinator | Source exercise, domain, severity, owner, and bounded description present |
| Triaged → Accepted | Finding owner | Scope and target date accepted |
| Accepted → In progress | Implementer | Change plan and dependency check recorded |
| In progress → Blocked | Implementer or owner | Blocker reason and next review date required |
| Blocked → In progress | Owner or dependency owner | Blocker resolution evidence recorded |
| In progress → Ready for validation | Implementer | Change reference and evidence reference present |
| Ready for validation → Validated | Independent validator | Validation test passes; validator is not implementer |
| Validated → Closed | Owner plus governance reviewer | Closure note, audit reference, and evidence present |
| Any open status → Deferred | Management sponsor or governance owner | Reason, risk treatment, review date, and expiry required |
| Deferred → Accepted | Governance owner | Deferral still justified and new target date set |
| Any status → Reopened | Governance reviewer or incident commander | New evidence, regression, failed validation, or expired risk acceptance |

A critical or high action must not be closed by the implementer alone. A record affecting public visibility, safeguarding routing, privacy controls, audit integrity, authorization, or production monitoring requires an independent validator and an explicit change reference.

## 3. Jira configuration

### 3.1 Project and issue types

Create a dedicated project named `HMSI Governance Actions` or use a controlled component in the existing governance project. Configure the following issue types:

| Issue type | Use |
|---|---|
| Control Gap | Original weakness or missed control from an exercise |
| Corrective Action | Implementable remediation linked to a control gap |
| Exercise Decision | Decision requiring management or governance tracking |
| Strength | Control that worked and should be preserved or scaled |
| Validation Task | Independent verification of an implementation |

Link issues using `relates to`, `blocks`, `is validated by`, and `derived from`. Use a parent Control Gap for related actions rather than putting multiple unrelated remediations into one issue.

### 3.2 Custom fields and screens

Create the fields in the data model with exact names and stable descriptions. Use contexts to limit them to the governance project and relevant issue types. Put required fields on create, edit, and transition screens. Configure separate screens for triage, implementation, validation, and closure.

Jira administrators should keep the custom-field catalog small and documented. Atlassian notes that custom fields are managed through Administration → Issues → Custom fields and that screens determine where fields are visible.[1]

### 3.3 Workflow validators and conditions

Configure workflow validators as follows:

| Transition | Jira validator/condition |
|---|---|
| New → Triaged | Required-field validator for source, domain, severity, owner, and description |
| Triaged → Accepted | Assignee or project-role condition; target date required |
| In progress → Blocked | Blocker reason and next review date required |
| In progress → Ready for validation | Change reference and evidence reference required |
| Ready for validation → Validated | Validator must not equal implementer; validation result must be `Pass` or approved conditional pass |
| Validated → Closed | Closure note, audit reference, evidence reference, and governance reviewer required |
| Any → Deferred | Management-sponsor role, deferral reason, review date, and expiry required |

Use automation for reminders and reporting, not for automatic closure. A rule may notify an owner when a target date is approaching or when a record becomes overdue, but it must not set `Closed` without an independent validation transition.

### 3.4 Jira dashboard gadgets

Create a dashboard named `HMSI Tabletop Governance`. Add filters or gadgets for the following views:

| Panel | Suggested filter or metric |
|---|---|
| Open critical/high actions | `priority in (P0, P1) AND statusCategory != Done` |
| Overdue actions | `duedate < now() AND status not in (Closed, Deferred)` |
| Blocked actions | `status = Blocked` grouped by blocker reason |
| Awaiting validation | `status = "Ready for validation"` |
| Unvalidated high-risk actions | `priority in (P0, P1) AND status != Closed` grouped by owner |
| Actions by control domain | Count grouped by control domain and status |
| Aging distribution | Count by aging band |
| Exercise trend | Opened and closed actions by source exercise and month |
| Deferred/risk accepted | `status = Deferred OR "Risk accepted?" = Yes` with expiry date |
| Recent stop-ship findings | `severity = Critical` sorted by opened date |

Use saved filters for these views and restrict dashboard sharing to approved operations, governance, engineering, privacy, safeguarding, security, editorial, and management groups.

## 4. Notion configuration

### 4.1 Database structure

Create a database named `HMSI Tabletop Corrective Actions`. Implement the data model using Notion properties. Use `ID` or a controlled `Action ID` property for the stable identifier. Use relations to connect actions to an `Exercises` database, `Owners` directory, `Evidence Register`, and `Change Register`.

Notion supports database properties for owners, due dates, URLs, formulas, relations, rollups, statuses, and audit metadata.[2] Use a separate restricted evidence database or external approved repository for sensitive material; the dashboard should contain only an opaque evidence reference.

### 4.2 Recommended Notion views

| View | Filters and purpose |
|---|---|
| Management overview | Status is not Closed; group by Severity; sort by Target date |
| Operations queue | Finding owner is current team; Status is New, Triaged, Accepted, or In progress |
| Blocked and escalated | Status is Blocked; group by Blocker reason; show Next review date |
| Validation queue | Status is Ready for validation; show Implementer, Independent validator, Evidence reference |
| Overdue | Target date is before today and Status is not Closed or Deferred |
| Privacy and safeguarding | Control domain contains Privacy or Safeguarding; restrict page access |
| Public-boundary actions | Control domain is Public boundary or Editorial; show Change reference and Validation result |
| Calendar | Target date and Validation due by month |
| Archive | Status is Closed or Deferred; sorted by Closed at or Next review date |

Notion’s database automations can trigger on page additions, property edits, or recurring schedules and can send notifications, email, Slack notifications, or webhooks, subject to plan and access limitations.[3] Use these automations for reminders, not high-risk authorization. Do not configure a Notion automation to approve deletion, release suppression, publish content, or close a critical action.

### 4.3 Notion buttons and automation rules

Create a `Request validation` button that sets Status to `Ready for validation` only when Change reference and Evidence reference are populated. Create a `Request review` button that sets Next review date and notifies the Finding owner. Create a `Escalate overdue` automation that notifies the owner and management sponsor when Days to target is negative.

Because Notion automations cannot act on restricted pages and database automations require appropriate database access,[3] keep the operational dashboard free of restricted case content. Use an approved restricted repository for any confidential evidence and store only the reference ID in Notion.

## 5. Metrics and management reporting

The dashboard should report trends, not people. Do not rank individual staff in a way that creates unnecessary exposure or blame. Use team-level ownership for management trend views when individual attribution is not operationally required.

| Metric | Definition | Suggested review |
|---|---|---|
| Open critical/high actions | Count of P0/P1 records not Closed | Weekly |
| Overdue action rate | Overdue open actions ÷ all open actions | Weekly |
| Median days to triage | Median from Opened at to Triaged | Monthly |
| Median days to validation | Median from Opened at to Validated | Monthly |
| Validation failure rate | Failed validations ÷ validations performed | Monthly |
| Blocked-action rate | Blocked open actions ÷ open actions | Weekly |
| Closure evidence completeness | Closed records with evidence and audit references ÷ closed records | Monthly |
| Repeat-gap rate | New findings matching a previously open or recently closed control gap | Quarterly |
| Deferral expiry rate | Deferred records past review/expiry date ÷ deferred records | Weekly |
| Critical stop-ship closure | Critical findings closed with independent validation ÷ total critical findings | Per exercise |
| AAR timeliness | AARs completed within five business days ÷ exercises completed | Quarterly |

All metrics should be accompanied by scope, time window, last refresh time, and a clear statement when data is incomplete. Avoid publishing raw comments, names, or restricted evidence in management dashboards.

## 6. Escalation rules

| Trigger | Action | Owner |
|---|---|---|
| P0 action opened | Notify incident commander, engineering, privacy, safeguarding, security, and management sponsor | Operations |
| P0/P1 action overdue | Escalate to management sponsor and governance owner | Dashboard automation/operations |
| Public-boundary or safeguarding control failed | Keep related workflow paused and open restricted review | Incident commander |
| Validation failed | Reopen action, record failure, and prevent closure | Independent validator |
| Risk acceptance nearing expiry | Notify sponsor and owner 14 and 3 days before expiry | Operations |
| Audit evidence missing | Block closure and notify governance owner | Validator |
| Action blocked for more than 7 days | Escalate with blocker category and next decision required | Finding owner |
| Corrective action repeats in a later exercise | Open a systemic-control review | Programme director |

## 7. Access and privacy controls

Use least privilege. Participants may create or comment on assigned records, owners may update implementation fields, validators may record validation but not implement changes, and governance reviewers may close actions. Privacy and safeguarding records require restricted access and should not expose case details in ordinary project views.

At minimum, configure separate groups or teams for `Operations`, `Engineering`, `Editorial`, `Privacy`, `Safeguarding`, `Security`, `Management`, `Validators`, and `Read-only Observers`. Use an external immutable audit log for changes to severity, owner, target date, status, risk acceptance, validation result, and closure.

No dashboard record should contain passwords, access tokens, private reset links, raw volunteer narratives, exact safeguarding locations, unredacted allegations, or donor/payment details. If a record must reference such material, use an opaque evidence ID and a restricted repository link with independent access control.

## 8. Operating procedure

The operations coordinator reviews the dashboard weekly, confirms owners and dates, checks overdue and blocked queues, and escalates exceptions. After each tabletop exercise, the evaluator creates the initial records and links them to the exercise and control IDs. The owner triages each record, assigns an implementer and validator, and records the target date. The implementer attaches a change reference and evidence reference before requesting validation. The validator independently tests the control and records a pass or failure. The governance reviewer closes the action only after the evidence, audit reference, and closure note are complete.

Every month, governance reviews trend metrics, deferred items, repeat gaps, and actions nearing expiry. Every quarter, management reviews unresolved critical/high actions and decides whether to fund remediation, change scope, or accept risk temporarily. Risk acceptance must have an owner, rationale, compensating controls, and expiry date; it is never a substitute for a permanent fix.

## 9. Implementation and acceptance checklist

| Check | Jira | Notion | Evidence |
|---|:---:|:---:|---|
| Fields/properties created with documented definitions | [ ] | [ ] | Configuration export |
| Status values and transition rules configured | [ ] | [ ] | Workflow/database screenshot or export |
| Required validation and closure fields enforced | [ ] | [ ] | Negative test record |
| Owner, implementer, and validator separation tested | [ ] | [ ] | Test IDs |
| Critical/high escalation notifications tested | [ ] | [ ] | Notification evidence |
| Overdue and blocked views tested | [ ] | [ ] | Dashboard evidence |
| Sensitive fields excluded from ordinary views | [ ] | [ ] | Privacy review |
| Restricted evidence links require independent access | [ ] | [ ] | Access test |
| No automatic high-risk closure configured | [ ] | [ ] | Automation review |
| AAR-to-action traceability tested | [ ] | [ ] | Linked exercise/action records |
| Closure requires validation and evidence | [ ] | [ ] | Negative/positive test |
| Backup/export and recovery procedure documented | [ ] | [ ] | Recovery test |
| Management dashboard reviewed and approved | [ ] | [ ] | Sign-off reference |

## 10. Sources

[1]: https://confluence.atlassian.com/adminjiraserver/managing-custom-fields-1047552711.html "Atlassian: Managing custom fields"  
[2]: https://www.notion.com/help/database-properties "Notion: Database properties"  
[3]: https://www.notion.com/help/database-automations "Notion: Database automations"
