# HMSI Periodic Communication-Audit and Emergency Restoration Tabletop Schedule

**Purpose:** Maintain continuous readiness for communication-template audits, public-boundary incidents, emergency content restoration, privacy review, safeguarding routing, and Datadog alert response.  
**Audience:** Operations, engineering, editorial, privacy, safeguarding, security, communications, management, and approved system owners.  
**Data posture:** Use synthetic fixtures only. Do not use real volunteer, donor, safeguarding, authentication, or production incident data in exercises.  
**Schedule status:** Proposed governance calendar; no automated scheduler has been configured.

> **Operating principle:** Rehearse the controls regularly, vary the pressure and failure mode, and require evidence before declaring the team ready.

## 1. Cadence at a glance

| Exercise | Frequency | Duration | Primary purpose | Minimum participants |
|---|---:|---:|---|---|
| Operations checklist micro-drill | Monthly | 20–30 minutes | Confirm rapid template review, stop-send decisions, and confidential routing | Operations, communications, privacy or safeguarding delegate |
| Restoration conflict drill | Every two months | 30–45 minutes | Test stale-state rejection, private-review restoration, idempotency, and audit evidence | Operations, engineering, editorial |
| Cross-functional tabletop | Quarterly | 60–90 minutes | Test end-to-end public-boundary response under pressure | Incident commander, operations, engineering, privacy, safeguarding, editorial, security, communications |
| Datadog alert and routing drill | Quarterly, alternating with cross-functional tabletop | 30–45 minutes | Test monitor triggers, scrubbing, alert routing, silences, and escalation | Engineering, operations, security, privacy |
| Recovery and rollback rehearsal | Twice yearly | 90 minutes | Exercise fail-closed containment, smallest-safe rollback, reconciliation, and resume gates | Engineering, operations, incident management, privacy, security |
| Executive decision exercise | Twice yearly | 45–60 minutes | Test management decisions, external messaging approval, and residual-risk acceptance | Management, communications, privacy, safeguarding, engineering |
| Full annual readiness exercise | Annually | 2–3 hours | Combine communication audit, restoration, monitoring, escalation, recovery, and after-action review | All critical roles and delegates |

The schedule is deliberately layered. Monthly drills maintain individual familiarity, while quarterly and annual exercises test cross-team coordination and decision quality.

## 2. Standard monthly calendar

Use the following recurring pattern unless a trigger-based exercise supersedes it.

| Week | Activity | Output |
|---|---|---|
| Week 1 | Select synthetic scenario and owner | Scenario card, objectives, participant list |
| Week 2 | Prepare injects, templates, dashboards, and evidence pack | Facilitator pack and synthetic fixtures |
| Week 3 | Run the exercise | Decision log, evaluator scorecard, communication outputs |
| Week 4 | Complete after-action review | AAR, corrective-action register, management decision |

Exercises should not always occur at the same time of day. At least twice each year, conduct a drill during a lower-coverage or handover period, while ensuring that all participants are informed that it is an exercise and that no real communications or production changes are allowed.

## 3. Annual scenario rotation

| Period | Scenario | Core controls tested |
|---|---|---|
| Q1 | Unsafe urgent email during an approved-but-unpublished article alert | Stop-send, sender validation, recipient scope, published-only boundary |
| Q2 | Archived article restoration rejected because of stale state and active safeguarding restriction | Conflict handling, confidential routing, private-review target, escalation |
| Q3 | Datadog audit-write failure and reconciliation drift during deployment | Fail-closed behavior, monitor response, audit integrity, rollback |
| Q4 | Suspected public exposure through ticker, detail route, and external distribution | SEV-1 response, containment, privacy/safeguarding assessment, management communications |

Rotate the scenario owner and inject order so that teams learn the controls rather than memorizing a script. Every scenario must contain at least one plausible but unsafe shortcut, such as pressure to send, pressure to publish, pressure to silence an alert, or pressure to bypass a second reviewer.

## 4. Trigger-based exercises

The standing calendar is supplemented by a targeted exercise when any of the following occurs:

| Trigger | Exercise required | Deadline |
|---|---|---:|
| Public-boundary alert fires in production | Focused public-boundary response drill after incident closure | Within 30 days |
| Audit-write failure or reconciliation drift | Audit-integrity and fail-closed drill | Within 14 days |
| Permission-set, role, or service-account change | Authorization and two-person approval drill | Before or within 14 days of release |
| New sender, recipient list, channel, or template merge field | Communication-template audit drill | Before release |
| Safeguarding route or contact changes | Confidential-routing drill | Within 14 days |
| Restoration or publication route changes | Restoration/publication separation drill | Before production activation |
| Datadog monitor query, threshold, tag, or destination changes | Synthetic alert-routing drill | Before production paging |
| Missed corrective-action deadline | Repeat the affected inject | Within 14 days |
| Confirmed or suspected privacy incident | Governance-led exercise after containment | Within 30 days, unless incident leadership sets an earlier date |

A trigger-based exercise may replace the corresponding monthly drill, but it must not cancel the quarterly cross-functional exercise unless the incident commander and management sponsor document the reason.

## 5. Exercise preparation procedure

The exercise owner opens a change or exercise record and defines the scenario, objectives, scope, participants, synthetic-data boundary, start and end times, facilitator, evaluator, and expected outputs. The facilitator prepares the injects, the communication-template audit checklist, the restoration runbook, the monitoring specification, and the after-action report template.

Engineering must confirm that all test links, article keys, audit IDs, email addresses, and message content are synthetic. Operations must prepare a no-send marker and ensure that any mail, Slack, WhatsApp, SMS, or Datadog delivery is simulated or directed to an isolated test destination. The exercise owner must confirm that no live password-reset link, token, private media URL, donor record, or safeguarding case is present.

At least two business days before the exercise, circulate the scope, participant roles, ground rules, and confidentiality expectations. Do not distribute the answer key or expected decisions to participants.

## 6. Standard exercise flow

| Time | Activity | Required evidence |
|---:|---|---|
| T–10 days | Confirm scenario, owner, participants, and synthetic data | Exercise record |
| T–5 days | Complete facilitator and technical readiness review | Readiness checklist |
| T–2 days | Send participant briefing | Briefing record |
| T+0 | Open exercise and establish roles | Attendance and role record |
| T+5 to T+60 | Release timed injects | Decision log with UTC timestamps |
| T+60 | State final classification and recovery decision | Closing decision |
| T+1 business day | Evaluator submits scorecard | Scorecard and evidence references |
| T+5 business days | Conduct after-action review | AAR and lessons learned |
| T+10 business days | Assign corrective actions | Action register with owners and dates |
| Before next release | Validate critical corrective actions | Test evidence and sign-off |

## 7. Minimum success criteria

Every exercise must demonstrate that the team can stop an unsafe message before sending, avoid publishing private or non-published content, route safeguarding details confidentially, preserve bounded evidence, distinguish confirmed facts from assumptions, and keep restoration separate from publication.

For technical exercises, the team must also demonstrate that unauthorized or conflicted requests do not mutate state, audit events are durable, monitor payloads are scrubbed, duplicate requests are idempotent, and uncertain provider or audit outcomes fail closed.

A minimum pass requires that no participant sends a simulated unsafe message, no participant authorizes direct archived-to-published restoration, and no participant places sensitive content into a broad communication channel. A failure in any of these controls is a critical finding and requires a repeat exercise.

## 8. After-action and corrective-action deadlines

The evaluator should submit the scorecard within one business day. The exercise owner should complete the AAR within five business days. Critical or high-priority corrective actions must have an owner and target date within ten business days. Any action affecting public queries, authorization, safeguarding routes, audit integrity, or production monitoring requires a validation test before closure.

Corrective actions should be closed only when evidence shows that the control was implemented and re-tested. “Discussed,” “communicated,” or “monitor stopped firing” is not sufficient closure evidence.

## 9. Governance and accountability

The programme director or designated management sponsor owns the annual schedule. Operations owns the calendar and participation records. Engineering owns technical injects, monitor tests, and public-boundary verification. Privacy and safeguarding owners determine when confidential review is required. Editorial owns publication-state decisions. Security owns authorization and suspicious-activity scenarios. Communications owns approved stakeholder language.

The schedule should be reviewed every six months and after any material incident. Review whether the exercise mix still covers the highest risks, whether participants are rotating, whether corrective actions are being closed, and whether alert thresholds or communication channels have changed.

## 10. Scheduling implementation guidance

This document is a governance schedule, not an activated background job. If HMSI later automates reminders, use the approved scheduled-work mechanism and a deployed callback endpoint rather than an in-process timer. A reminder job should create or update calendar tasks only; it must not automatically send incident communications, restore content, publish articles, silence monitors, or change production permissions.

Any future scheduler implementation must be idempotent, use UTC, include an owner and durable task identifier, and keep its callback under the approved scheduled endpoint boundary. Before enabling it, engineering must complete code review, testing, deployment, secret review, ownership confirmation, and a manual runbook rehearsal.

## 11. Calendar template

| Month | Exercise type | Scenario | Owner | Participants | AAR due | Status |
|---|---|---|---|---|---|---|
| January | Operations micro-drill |  |  |  |  | Planned |
| February | Restoration conflict drill |  |  |  |  | Planned |
| March | Cross-functional tabletop |  |  |  |  | Planned |
| April | Operations micro-drill |  |  |  |  | Planned |
| May | Datadog alert/routing drill |  |  |  |  | Planned |
| June | Executive decision exercise |  |  |  |  | Planned |
| July | Operations micro-drill |  |  |  |  | Planned |
| August | Restoration conflict drill |  |  |  |  | Planned |
| September | Cross-functional tabletop |  |  |  |  | Planned |
| October | Operations micro-drill |  |  |  |  | Planned |
| November | Recovery and rollback rehearsal |  |  |  |  | Planned |
| December | Annual readiness exercise |  |  |  |  | Planned |

## 12. Final readiness reminder

> **Practice the decision, not merely the notification.**
>
> HMSI should be able to show that its teams can identify an unsafe communication, stop it, protect confidential information, preserve evidence, escalate uncertainty, restore content only to private review, and publish only through explicit authorization.
