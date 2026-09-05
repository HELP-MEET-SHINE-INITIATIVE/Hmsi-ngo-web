# HMSI Datadog False-Positive Rollback and Incident Response Manual
## Operations Procedure for Live Deployment

**Audience:** HMSI operations, engineering on-call, security, editorial, privacy, safeguarding, and incident-management teams  
**Scope:** Suspected false positives from Datadog monitors during live deployment of emergency content restoration controls  
**Primary principle:** Confirm before suppressing; fail closed when integrity is uncertain  
**Status:** Operational manual draft for approval

> **Important:** A monitor that looks noisy may still indicate a real control failure. Operators must not silence, delete, or downgrade an alert until the underlying state, audit event, and public-visibility boundary have been checked.

---

## 1. Purpose

This manual provides a controlled response when a Datadog monitor triggers during live deployment and the initial evidence suggests a false positive. It explains how to distinguish a metric or pipeline defect from a real restoration, audit, authorization, or public-boundary incident.

The procedure covers alert triage, evidence preservation, temporary monitor silence, fail-closed containment, code or configuration rollback, service recovery, validation, and post-incident review. It applies especially to monitors for public-boundary violations, audit-write failures, restoration conflicts, unauthorized attempts, validation failures, and approval bottlenecks.

The procedure does not authorize operators to bypass publication controls, restore archived content directly to public visibility, or suppress a critical alert merely because it is inconvenient during deployment.

---

## 2. Incident classifications

| Class | Example | Initial severity | Default response |
|---|---|---:|---|
| Observability-only defect | Duplicate metric, delayed log, malformed dashboard query with no underlying mutation | P2/P3 | Correct telemetry; preserve service controls |
| Operational noise | Expected synthetic or test traffic incorrectly sent to production monitor | P3 | Confirm scope, time-box silence, fix routing |
| Control-path failure | Audit event missing, state transition not reconciled, provider result unknown | P1/P2 | Fail closed, stop further mutations, reconcile |
| Authorization failure | Repeated denied actions, unexpected role behavior, permission drift | P1/P2 | Preserve evidence, security review, restrict affected path |
| Public-boundary incident | Private or non-published content visible through public route | P1 | Immediate containment and incident declaration |
| Data-protection incident | Personal, confidential, or safeguarding information exposed in telemetry or public response | P1 | Immediate containment and privacy/safeguarding escalation |

An alert is not classified as a false positive solely because no customer or public user reported an issue. The classification must be based on evidence from application state, audit records, public-query behavior, and deployment context.

---

## 3. Roles during response

| Role | Responsibility |
|---|---|
| Incident commander | Owns severity, coordination, decision log, and recovery approval |
| Operations responder | Performs initial triage, evidence capture, monitor-state review, and safe containment |
| Engineering responder | Checks code, deployment, metrics, logs, database state, and rollback options |
| Security responder | Investigates authorization, account, token, or suspicious-attempt signals |
| Privacy owner | Assesses personal-data exposure and controls restricted evidence |
| Safeguarding lead | Handles protection concerns through the confidential route |
| Editorial owner | Confirms whether content was intended, reviewed, and authorized for publication |
| Communications owner | Coordinates external messaging if public content was exposed |

One operator may perform the initial triage, but the person who declares a monitor false positive should not be the only person approving a high-impact rollback or alert suppression.

---

## 4. First ten minutes: triage procedure

### Step 1: Acknowledge without suppressing

Acknowledge the Datadog notification and record the monitor ID, environment, service, firing time, first responder, and incident channel. Do not mute the monitor yet. Do not paste sensitive log lines into a broad channel.

### Step 2: Check deployment context

Confirm whether a deployment, migration, monitor change, telemetry-pipeline change, role update, or scheduled job ran within the alert window. Record the release ID and change ticket. A timing correlation is a clue, not proof of causation.

### Step 3: Determine whether the signal is real

Check the bounded metric, structured event count, audit event, application response, and current record state. For a public-boundary alert, query the public endpoint with a synthetic or approved test record and confirm whether private content is actually returned. For an audit alert, compare accepted state mutations with durable audit events.

### Step 4: Preserve evidence

Capture the monitor ID, timestamp range, correlation ID, audit event ID, release ID, bounded reason code, metric values, and relevant dashboard state. Keep raw sensitive evidence in the approved restricted system, not in Slack, ordinary tickets, or alert annotations.

### Step 5: Choose the safety posture

If state, audit integrity, or public visibility cannot be established, classify the event as a real or unknown control incident and fail closed. Do not label it a false positive while evidence is incomplete.

---

## 5. False-positive decision gate

An alert may be classified as a likely false positive only when all conditions below are satisfied:

| Gate | Required evidence |
|---|---|
| No underlying mutation | No unauthorized restoration, publication, deletion, or suppression mutation occurred |
| No public exposure | Public list, ticker, and detail checks show no private or non-published content |
| Audit complete | Expected audit event exists, or the alert was proven to be generated by duplicate telemetry rather than a missing event |
| Known telemetry cause | The trigger is attributable to a documented test fixture, duplicate delivery, timestamp issue, query error, or ingestion delay |
| Bounded scope | The signal is limited to a known environment, release, synthetic actor, or approved maintenance window |
| Independent review | A second responder confirms the evidence and classification |
| Remediation planned | A ticket identifies the fix, owner, due date, and validation method |

If any gate fails, keep the incident open and use the control-path or public-boundary procedure.

---

## 6. Safe temporary monitor silence

Monitor silence is an operational control, not a resolution. It may be used only after the false-positive decision gate is satisfied or during a documented maintenance window with compensating checks.

A silence must include the monitor ID, environment, reason, incident or change ticket, owner, start time, expiry time, affected scope, compensating monitor or manual check, and rollback condition. The default maximum duration is 30 minutes for critical monitors and 2 hours for warning monitors unless the incident commander approves a shorter or longer period with written justification.

The following monitors must not be permanently silenced: public-boundary violation, audit-write failure, reconciliation drift, unauthorized-attempt spike, and data-protection exposure. If one must be silenced temporarily, the team must add a manual or alternate alert path before silence begins.

Example Datadog silence record:

```text
Monitor: DDM-RESTORE-004
Environment: production
Reason: approved synthetic deployment test generated three known conflict fixtures
Ticket: HMSI-INC-0000
Owner: operations-on-call
Start: 2026-08-26T12:00:00Z
Expiry: 2026-08-26T12:30:00Z
Compensating check: manual audit/state reconciliation every 5 minutes
Unsilence condition: immediately after synthetic test completion or any non-synthetic correlation ID
```

Never silence by deleting the monitor, changing the threshold without review, removing notification recipients, or suppressing the entire service when only one test scope is affected.

---

## 7. Fail-closed containment

Fail closed whenever the team cannot prove that restoration, audit, authorization, or public visibility is operating correctly.

The containment sequence is:

1. Pause emergency restoration and publication actions through the approved operational control.
2. Preserve current metrics, logs, audit events, release metadata, and correlation IDs.
3. Keep public queries restricted to `status = 'published'`.
4. Confirm that archived records remain private and that restoration targets remain `draft` or private review.
5. Disable only the affected automation if a narrower control is available.
6. Notify the incident commander, engineering lead, and relevant privacy, safeguarding, or security owner.
7. Reconcile application state with audit events before resuming.

Do not use database edits to hide the symptom. Do not delete the alert evidence. Do not restore an archived article directly to `published` as a workaround.

---

## 8. Rollback decision matrix

| Situation | Rollback recommendation | Approval |
|---|---|---|
| Dashboard query or monitor-only defect; controls work | Roll back monitor/configuration only | Datadog owner plus incident commander |
| Telemetry scrubbing defect; controls work but sensitive fields may leak | Roll back telemetry release or disable affected telemetry path; preserve control path | Engineering and privacy owner |
| Restoration route rejects valid requests but no unsafe mutation occurred | Roll back application release if safe; keep restoration paused until validated | Engineering lead and incident commander |
| Audit writes fail or reconciliation drifts | Keep mutation/publication paused; roll back affected release only after preserving state | Engineering, privacy, incident commander |
| Unauthorized actions or permission drift | Restrict affected roles/session path; do not restore broad access until security review | Security and incident commander |
| Private content is publicly visible | Immediate containment and critical rollback or route restriction | Incident commander; management notification |

Rollback must be based on the smallest change that restores safe operation. A code rollback does not automatically reverse database state changes. Any records changed during the incident must be reconciled separately.

---

## 9. Rollback procedure

### Before rollback

Record the current release ID, deployment timestamp, database migration state, active monitor versions, current feature flags, pending restoration requests, and recent audit event range. Confirm that a rollback will not remove the archive columns or invalidate the audit schema.

### Execute rollback

Use the approved deployment mechanism or reviewed repository revert. Do not use `git reset --hard` on the shared working copy. Do not drop archive columns, delete audit events, or bulk-change article statuses as part of an application rollback.

If the issue is monitor-only, revert the monitor query, tag mapping, or notification route rather than rolling back application code. If the issue is in the restoration route, pause the route or revert the application release while preserving the published-only public query boundary.

### Verify after rollback

Check that the service starts successfully, public routes return only published records, archived records remain private, restoration attempts are rejected or accepted according to the known-good policy, audit events are being written, and Datadog metrics resume with the expected tag set. Run the synthetic restoration and privacy-leakage tests before resuming operations.

---

## 10. Monitor-specific response guides

### DDM-RESTORE-001: Public-boundary violation

Treat every firing as real until disproven. Verify the public list, ticker, and detail route. If any private or non-published record is returned, declare a critical incident, contain the route, preserve evidence, and involve privacy/safeguarding leads. Do not silence the monitor because the article was “only a test.”

### DDM-RESTORE-002: Audit-write failure

Stop restoration and publication. Confirm whether any state mutation completed without a durable audit event. If yes or unknown, classify as a control-path incident. Repair the audit path and reconcile before resuming.

### DDM-RESTORE-004: Conflict spike

Check whether the conflicts correspond to the approved deployment test or to real concurrent updates. A known synthetic burst may be a bounded false positive, but production or unknown correlation IDs require engineering investigation. Never force the stale update.

### DDM-RESTORE-005: Unauthorized-attempt spike

Check session expiry, role mapping, deployment changes, and access logs using bounded identifiers. If the attempts are not explained by a known test or user-support issue, escalate to security. Do not add broad permissions to make the alert stop.

### DDM-RESTORE-006: Validation-failure rate

Break down by validation name and reason code. Missing-image failures are editorial remediation; hold or safeguarding failures are protected decisions; audit failures are engineering incidents. Do not treat them as one retryable class.

### DDM-RESTORE-007/008: Review backlog or age

Check staffing and queue state. Assign qualified reviewers without removing independent review or privacy gates. A bottleneck is not permission to publish unreviewed content.

---

## 11. Communications rules

Internal alerts should contain only the monitor ID, severity, environment, bounded reason code, correlation ID, audit event ID, release ID, and runbook link. Do not include article titles, article bodies, contributor names, email addresses, phone numbers, precise locations, safeguarding narratives, or tokens.

If public exposure occurred, the incident commander coordinates with management, privacy, safeguarding, and communications owners. External communication must be accurate, limited to confirmed facts, and approved through HMSI’s incident-communications process.

Do not describe an alert as a false positive in an external message until the independent review and incident record are complete.

---

## 12. Recovery and resume criteria

Operations may resume only when the incident commander confirms all applicable conditions:

| Recovery check | Required result |
|---|---|
| Root cause | Documented as monitor, telemetry, application, data, permission, or unknown |
| Public boundary | Published-only behavior verified |
| Archive state | Archived records remain private and recoverable |
| Restoration target | Restoration returns only to private review |
| Audit integrity | State transitions and decisions have durable audit evidence |
| Permissions | Administrator and contributor paths tested with negative authorization checks |
| Monitor status | Correct query, tags, thresholds, routes, and expiry settings |
| Synthetic test | Failure and privacy-scrubbing simulation passes |
| Compensating controls | Any temporary manual checks assigned and time-boxed |
| Approval | Engineering and relevant governance owner sign off |

Resume gradually. Start with monitor-only validation, then a synthetic staging or controlled production-safe check, then normal operations. Do not use a live donor, volunteer, or public article as a test fixture.

---

## 13. Post-incident review

Within the agreed review window, document the timeline, monitor behavior, evidence, classification, false-positive determination, containment, rollback, affected records, audit reconciliation, privacy assessment, and corrective actions.

The review should answer four questions:

1. Did the monitor accurately represent the underlying control state?
2. Did the response preserve the public boundary and audit trail?
3. Could the signal have been made more precise without reducing detection coverage?
4. What code, query, tagging, runbook, test, ownership, or training change prevents recurrence?

Corrective actions should have an owner, due date, acceptance test, and change-control reference. Do not close the incident merely because the alert stopped.

---

## 14. Operator quick reference

> **Acknowledge, do not mute.**  
> **Check state, audit, and public visibility.**  
> **Preserve bounded evidence.**  
> **Fail closed if uncertain.**  
> **Silence only with an owner, scope, expiry, and compensating control.**  
> **Restore archived content to private review—not publication.**  
> **Rollback the smallest safe change.**  
> **Resume only after reconciliation and independent review.**

## 15. Required engineering and operations follow-up

Engineering should add automated monitor tests for synthetic alert delivery, tag cardinality, sensitive-field scrubbing, public-boundary detection, and silence-expiry behavior. Operations should rehearse this manual using a synthetic conflict spike, an audit-write outage, and a simulated public-boundary violation. Governance owners should approve the severity model, response ownership, monitor-silence duration, and resume criteria before production paging is enabled.
