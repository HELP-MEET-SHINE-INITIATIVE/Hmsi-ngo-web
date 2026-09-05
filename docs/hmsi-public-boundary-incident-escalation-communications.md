# HMSI Public-Boundary Incident
## Escalation Path and Stakeholder Communication Templates

**Audience:** HMSI operations, engineering, security, privacy, safeguarding, editorial, management, and communications teams  
**Applies to:** Any event in which private, archived, draft, approved-but-unpublished, restricted, or confidential news content is exposed through a public route or external distribution channel  
**Primary principle:** Contain first, preserve evidence, communicate only confirmed facts

> **Definition:** A public-boundary incident occurs when content that should not be publicly visible is returned by a public page, API, ticker, search feed, RSS feed, newsletter integration, social integration, cached route, or other external distribution path.

---

## 1. Incident severity

| Severity | Trigger | Required action |
|---|---|---|
| **SEV-1 Critical** | Confirmed or suspected public exposure of private, safeguarding, personal, restricted, or non-published content; audit integrity cannot be established | Declare incident immediately, contain public access, page incident leadership, involve privacy and safeguarding as applicable |
| **SEV-2 High** | Public-boundary control appears to fail but exposure is not yet confirmed; multiple unexplained unauthorized or reconciliation failures | Freeze restoration/publication activity, investigate urgently, notify engineering/security/privacy owners |
| **SEV-3 Moderate** | A monitor or test indicates a bounded configuration problem with no public exposure and complete audit evidence | Assign owner, correct within the change window, notify affected operational teams |
| **SEV-4 Low** | Dashboard or notification noise with no underlying control or data issue | Track as an observability improvement; no incident-wide broadcast required |

Any uncertainty about whether sensitive content was exposed should be treated as **SEV-1 until disproven**.

---

## 2. Escalation path

### Stage 0: Detection and acknowledgement — first 5 minutes

The responder acknowledges the Datadog alert without silencing it, records the monitor ID, environment, timestamp, release ID, correlation ID, and audit event ID, and opens the restricted incident channel. The responder must not paste article text, names, emails, phone numbers, safeguarding details, or tokens into the general operations channel.

The responder checks whether the alert is tied to a known synthetic test or maintenance window. A known test does not automatically make a public exposure safe; the public route must still be verified.

### Stage 1: Containment — first 15 minutes

The operations responder pauses restoration and publication activity through the approved operational control. Engineering verifies whether the public query is still returning non-published records. If needed, engineering restricts the affected route or rolls back the smallest safe application or configuration change. The team must preserve the published-only boundary and must not “fix” the incident by deleting audit records or making informal database edits.

If a personal, confidential, or safeguarding record may be exposed, the privacy and safeguarding owners are paged immediately through their confidential routes.

### Stage 2: Classification and evidence — within 30 minutes

The incident commander assigns severity and owners. Engineering compares the application state, public response, audit events, deployment metadata, and Datadog signal. The team determines whether the issue is a real public exposure, an authorization failure, an audit/reconciliation failure, or an observability-only defect.

Evidence is captured using opaque identifiers and stored in the approved restricted incident system. Broad stakeholder channels receive only bounded facts and response status.

### Stage 3: Management and governance escalation — within 60 minutes

For SEV-1 or SEV-2, notify the engineering lead, incident owner, executive/management sponsor, privacy/data-governance owner, safeguarding lead where relevant, security owner, editorial lead, and communications lead. The incident commander decides whether external notification is required under HMSI policy and applicable professional advice.

### Stage 4: Recovery decision

Operations resumes only after the affected route is contained, the record state and audit trail are reconciled, the public query is verified as published-only, sensitive-data impact is assessed, and the incident commander plus relevant governance owner approve recovery.

### Stage 5: Closure and review

The incident remains open until the root cause, affected scope, public exposure assessment, audit reconciliation, corrective action, owner, due date, and follow-up test are documented. A stopped alert is not sufficient evidence of resolution.

---

## 3. Responsibility matrix

| Activity | Operations | Engineering | Security | Privacy | Safeguarding | Editorial | Management | Communications |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Acknowledge alert | R | C | C | C | C | C | I | I |
| Pause restoration/publication | R | R | C | C | C | C | A | I |
| Verify public route | C | R | C | C | C | C | I | I |
| Assess unauthorized access | C | C | R | C | C | I | I | I |
| Assess personal-data impact | I | C | C | R/A | C | I | I | I |
| Assess safeguarding impact | I | C | C | C | R/A | I | I | I |
| Confirm editorial status | C | C | I | C | C | R/A | I | C |
| Approve recovery | R | R | C | C | C | C | A | I |
| Approve external message | I | C | C | C | C | C | A | R |
| Complete post-incident review | R | R | C | C | C | C | A | C |

**R:** Responsible. **A:** Accountable. **C:** Consulted. **I:** Informed.

---

## 4. Containment decision table

| Finding | Containment |
|---|---|
| Private article appears through public API | Disable or restrict the affected public route; verify all public surfaces |
| Archived article appears in ticker or list | Stop public news cache/feed refresh; correct query and invalidate affected cache |
| Approved-but-unpublished article appears publicly | Treat as publication-boundary failure; freeze publishing and restore published-only filtering |
| Safeguarding or confidential information appears publicly | Restrict access immediately; use confidential safeguarding and privacy channels |
| Audit event missing after a state change | Freeze further mutations and reconcile before retrying |
| Alert caused by approved synthetic test with no exposure | Preserve evidence, verify scope, apply a time-boxed silence if needed, and remediate routing |
| Current state cannot be determined | Fail closed; do not restore, publish, or delete until reconciled |

---

## 5. Internal incident communication templates

### 5.1 Initial restricted incident alert

**Subject:** `[SEV-1/SEV-2] HMSI public-boundary incident — [monitor ID] — [environment]`

**Message:**

> We are investigating a possible HMSI public-boundary incident detected at `[UTC timestamp]`.
>
> **Monitor:** `[monitor ID]`  
> **Environment:** `[staging/production]`  
> **Component:** `[component]`  
> **Release:** `[release ID]`  
> **Correlation ID:** `[opaque correlation ID]`  
> **Audit event ID:** `[opaque audit event ID]`  
> **Current status:** `[investigating/contained/confirmed exposure]`
>
> Restoration and publication activity has been paused while engineering verifies public responses, record state, and audit evidence. Do not share article content, personal information, safeguarding details, screenshots containing sensitive data, or tokens in this channel.
>
> **Incident commander:** `[role/name in restricted system]`  
> **Next update:** `[UTC time]`

### 5.2 Containment update

**Subject:** `[UPDATE] HMSI public-boundary incident contained — [incident ID]`

**Message:**

> The suspected public-boundary issue has been contained as of `[UTC timestamp]`.
>
> The team has `[restricted the affected route/paused publication/rolled back the affected release/disabled the affected integration]`. Restoration and publication remain paused pending reconciliation.
>
> Current assessment: `[confirmed exposure/no exposure found/unknown pending privacy review]`.
>
> Engineering is verifying `[public list/ticker/detail route/external distribution]`. Privacy and safeguarding review is `[not required/in progress/complete]`.
>
> **Next update:** `[UTC time]`. Please continue to use the restricted incident channel and do not redistribute incident evidence.

### 5.3 Resolution update

**Subject:** `[RESOLVED/RECOVERY] HMSI public-boundary incident — [incident ID]`

**Message:**

> The HMSI public-boundary incident was contained and resolved at `[UTC timestamp]`.
>
> **Root cause classification:** `[application/query/telemetry/permission/integration/unknown]`  
> **Affected public surface:** `[bounded surface]`  
> **Exposure assessment:** `[no exposure confirmed/exposure confirmed and assessed/under review]`  
> **Corrective action:** `[bounded summary]`  
> **Audit reconciliation:** `[complete/pending]`  
> **Recovery approval:** `[role] at [UTC timestamp]`
>
> Restoration and publication have `[resumed/remained paused]` after verification of the published-only public boundary, audit integrity, and relevant privacy/safeguarding controls. A post-incident review is scheduled for `[UTC date/time]`.

### 5.4 False-positive determination

**Subject:** `[CLOSED AS OBSERVABILITY ISSUE] Datadog alert — [monitor ID]`

**Message:**

> The alert from `[monitor ID]` was reviewed and classified as an observability-only issue rather than a public-boundary incident.
>
> The review confirmed that no underlying restoration or publication mutation occurred, no private content was publicly exposed, the audit trail was complete, and the signal was attributable to `[bounded cause]`.
>
> A time-boxed monitor silence was applied from `[UTC start]` to `[UTC expiry]` with `[compensating check]`. The remediation ticket is `[ticket ID]`, owned by `[team/role]`, with a target date of `[date]`.
>
> This classification was independently reviewed by `[role]`. Any new signal outside the documented scope must be treated as a new incident.

---

## 6. Governance and privacy templates

### 6.1 Privacy-owner notification

> **Subject:** Potential public exposure requiring privacy assessment — `[incident ID]`
>
> HMSI detected a possible exposure of content that may contain personal, restricted, or confidential information. The current known scope is `[bounded description]`.
>
> The public route has been `[contained/not yet contained]`. Technical evidence is stored under restricted access using correlation ID `[opaque ID]` and audit event ID `[opaque ID]`.
>
> Please advise on the privacy assessment, evidence-handling requirements, affected data categories, and any notification or remediation steps. No sensitive content is included in this message.

### 6.2 Safeguarding-owner notification

> **Subject:** Potential safeguarding exposure requiring confidential review — `[incident ID]`
>
> HMSI detected a possible public exposure involving content that may require safeguarding assessment. The affected public surface is `[bounded surface]`; technical containment is `[status]`.
>
> Please use the designated confidential safeguarding route for all case details. The ordinary incident channel contains only opaque references `[correlation ID]` and `[audit event ID]`.
>
> Restoration and publication remain paused pending your direction.

### 6.3 Management decision request

> **Subject:** Decision required: HMSI public-boundary incident recovery — `[incident ID]`
>
> Engineering has `[contained/repaired]` the affected path. Current evidence indicates `[bounded assessment]`. The published-only public filter has been verified, and audit reconciliation is `[complete/pending]`.
>
> Management decision requested: `[approve gradual recovery/keep publication paused/authorize additional review]`.
>
> Recovery will not restore archived content directly to public visibility. Any recovered article must return to private editorial review and pass a separate publication decision.

---

## 7. Controlled external communication template

External communication requires management, communications, privacy, and safeguarding review as applicable. Do not use this template to make legal conclusions or confirm affected individuals before the facts are established.

**Subject:** Update regarding HMSI website content availability

> HMSI recently identified an issue affecting the availability or presentation of content on part of its website. We restricted the affected feature while our technical and governance teams reviewed the matter.
>
> The affected feature is currently `[available/temporarily unavailable]`. We are reviewing the relevant records and have taken steps to prevent further unintended publication while the investigation continues.
>
> We will provide further information when the facts and appropriate next steps have been confirmed. If you believe you have received information in error, please do not redistribute it and contact `[approved HMSI contact]`.

Do not include article titles, names, personal details, safeguarding information, internal monitor IDs, security-sensitive architecture, or unverified claims.

---

## 8. Evidence and communication rules

All messages should use UTC timestamps and the incident ID. Use role names in broad channels and keep personal identities, article content, and case details in the restricted incident system. Communications should distinguish confirmed facts, working hypotheses, and unknowns.

Never describe a potential public-boundary incident as a false positive before an independent review verifies that no private content was exposed and that the audit trail is complete. Never promise that an article has been deleted when it has only been archived. Never state that an incident is resolved while reconciliation, privacy review, or safeguarding review remains open.

---

## 9. Closure checklist

| Closure item | Complete |
|---|:---:|
| Severity and incident owner assigned | [ ] |
| Public and external routes checked | [ ] |
| Restoration/publication activity paused or safely resumed | [ ] |
| Application state reconciled with audit events | [ ] |
| Privacy assessment completed | [ ] |
| Safeguarding assessment completed where relevant | [ ] |
| Security/authorization review completed where relevant | [ ] |
| Monitor status, silence, and expiry reviewed | [ ] |
| Sensitive evidence stored in restricted system | [ ] |
| Internal stakeholder updates sent | [ ] |
| External communication approved or marked not required | [ ] |
| Corrective action owner and due date assigned | [ ] |
| Regression or synthetic validation test added | [ ] |
| Management closure approved | [ ] |

## 10. Operating reminder

> **Contain the public surface. Preserve evidence. Protect sensitive information. Escalate uncertainty. Restore to private review. Publish only through explicit authorization.**
