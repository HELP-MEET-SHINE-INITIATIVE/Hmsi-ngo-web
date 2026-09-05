# HMSI Communication Audit Tabletop Exercise
## Emergency Template Review Under Time Pressure

**Exercise type:** Facilitated tabletop exercise  
**Audience:** Operations, communications, editorial, privacy, safeguarding, security, engineering, and management representatives  
**Duration:** 60 minutes exercise time plus 30 minutes after-action review  
**Data posture:** Synthetic content only; no real volunteer, donor, safeguarding, incident, or authentication data

> **Exercise purpose:** Test whether HMSI can rapidly audit communication templates, stop unsafe sends, route safeguarding concerns confidentially, preserve evidence, and communicate accurate updates during a suspected public-boundary incident.

---

## 1. Exercise objectives

By the end of the exercise, participants should demonstrate that they can identify an unsafe communication template under severe time pressure; apply the rapid privacy and safeguarding audit checklist; distinguish a noisy monitor from a real or unknown public-boundary incident; prevent a message from being sent through an inappropriate route; escalate to the correct technical, privacy, safeguarding, security, editorial, and management owners; and produce a bounded, approved stakeholder update.

The exercise also tests whether the team can preserve evidence without copying sensitive material into broad channels, maintain a clear decision log, use a time-boxed monitor silence only when justified, and resume operations only after public-boundary and audit checks pass.

---

## 2. Scenario overview

At 09:00 UTC, during a planned release of the HMSI emergency content restoration controls, Datadog monitor `DDM-RESTORE-001` fires for a suspected public-boundary violation. The initial dashboard shows a non-zero `hmsi.news.restoration.public_boundary_violations` count in production. At the same time, an operations coordinator receives a draft email titled **“Urgent verified field update”** from an unapproved shared mailbox. The draft contains a synthetic article title, a raw article excerpt, an exact location, a contributor email address, and a link to a private review route.

A programme lead asks the operations team to send the draft immediately because “management needs everyone to know.” A safeguarding lead separately reports that the underlying synthetic record is marked restricted. Engineering says the monitor may have been caused by a test fixture, but cannot yet prove that the public route was not exposed.

The team must decide whether to send, revise, hold, route confidentially, pause restoration/publication, escalate, and eventually close or continue the incident.

---

## 3. Ground rules and assumptions

The scenario uses synthetic names, addresses, URLs, article text, and audit identifiers. Facilitators must never introduce real personal data, real safeguarding information, active reset links, live credentials, production screenshots containing personal information, or real private media.

The exercise is a decision and communication drill. Participants must not change a live Datadog monitor, send a real message, modify a database record, publish news, or contact real external recipients. Any “send,” “rollback,” “silence,” or “route” action is recorded as an intended decision only.

The public news rule is that only `published` records are publicly visible. Archived, draft, approved-but-unpublished, restricted, and pending-review records must remain private. Restoration returns content to private review and never directly to live publication.

---

## 4. Participants and responsibilities

| Participant | Exercise responsibility |
|---|---|
| Incident commander | Keeps time, assigns decisions, maintains the incident record, and decides when escalation is sufficient |
| Operations lead | Applies the communication-template checklist and controls send/no-send decisions |
| Engineering lead | Verifies public routes, application state, audit events, release context, and containment options |
| Privacy lead | Assesses personal-data exposure, minimization, and approved privacy handling |
| Safeguarding lead | Determines whether the restricted route and confidential handling requirements apply |
| Security lead | Assesses sender identity, authorization, suspicious attempts, and access boundaries |
| Editorial lead | Confirms article status, review state, source, and publication authorization |
| Communications lead | Drafts approved internal or external language without speculation or sensitive details |
| Observer/evaluator | Records decisions, timing, evidence, missed controls, and improvement actions |

Where a role is not available, the incident commander must name a delegate. The absence of a privacy or safeguarding representative is itself an escalation condition for the scenario.

---

## 5. Facilitator preparation

Before the exercise, prepare a synthetic incident pack containing the initial Datadog alert, a bounded dashboard screenshot or text summary, a synthetic article record, a synthetic audit event, the suspect message template, a public-route test result, a redacted recipient list, a release/change record, and the HMSI communication-template privacy and safeguarding audit checklist.

Prepare four inject cards. Release each card only when the participant group reaches the relevant point in the scenario or when the facilitator needs to test a specific control. Do not reveal the expected answer in the inject.

The facilitator should establish a visible clock and a decision log with columns for UTC time, decision, owner, evidence reference, affected scope, and next review time.

---

## 6. Exercise timeline

| Exercise time | Scenario event | Participant task |
|---:|---|---|
| 00:00 | Briefing and rules | Confirm synthetic-only boundaries and roles |
| 05:00 | Initial Datadog critical alert | Acknowledge, classify provisionally, do not silence |
| 12:00 | Unsafe draft message appears | Apply stop-send checklist and identify prohibited fields |
| 20:00 | Pressure to send immediately | Make a send/no-send decision and explain the evidence |
| 28:00 | Safeguarding restriction is revealed | Route confidentially and restrict broad communication |
| 36:00 | Engineering reports possible test-fixture cause | Separate known test noise from unresolved exposure |
| 44:00 | Management requests public status update | Draft bounded stakeholder communication |
| 52:00 | Recovery evidence becomes available | Decide whether to resume or keep the incident open |
| 60:00 | Exercise ends | State final classification, actions, and owners |
| 60–90 | After-action review | Score performance and agree corrective actions |

---

## 7. Inject cards

### Inject 1 — Critical monitor alert

**Release at 05:00.**

> Datadog monitor `DDM-RESTORE-001` is firing in `production`. The monitor message includes environment `production`, component `news-restoration`, correlation ID `corr-synthetic-001`, audit event ID `audit-synthetic-001`, and reason category `private_news_public_boundary_violation`. No article body or person identifier is included.

**Expected discussion:** Participants should acknowledge the alert, open a restricted incident record, avoid broad redistribution, pause restoration/publication activity, and verify application state, audit evidence, and public routes. They should not silence the monitor or classify the event as a false positive yet.

### Inject 2 — Unsafe urgent message

**Release at 12:00.**

> A draft message is found in the operations queue. It includes a synthetic contributor email, exact coordinates, raw field narrative, an archived article title, and a private review link. The sender is `updates@example.invalid`, which is not an approved HMSI sender. The recipient list is a broad organization-wide group.

**Expected discussion:** The message must be stopped. Participants should identify the unapproved sender, broad recipient scope, raw content, exact location, restricted link, and inappropriate channel. The message should not be “cleaned up and sent” while the incident remains unresolved.

### Inject 3 — Safeguarding and test-fixture conflict

**Release at 28:00.**

> The safeguarding lead states that the synthetic article is marked `restricted_record_class`. Engineering says three restoration conflicts were generated by the release test, but cannot yet confirm whether the public detail route returned the article. The audit event exists for the restoration request but not yet for the public-route verification.

**Expected discussion:** The record remains blocked. Participants should route case details through the confidential safeguarding path, keep public and publication actions paused, and treat the exposure status as unknown. A known test fixture explains some conflicts but does not prove that a public-boundary violation did not occur.

### Inject 4 — Management pressure and recovery evidence

**Release at 44:00.**

> A programme director asks for a message stating that the issue is “only a false alarm” and asks the team to restore the article so field teams can see it. Engineering later provides a bounded test result showing the public list, ticker, and detail route returned no matching record. The audit ledger shows the restoration request was rejected before mutation. Privacy confirms that no real personal data was involved in the synthetic fixture.

**Expected discussion:** Participants may now classify the event as a bounded observability or test-routing issue only if the incident commander and an independent reviewer accept the evidence. The article must not be restored directly to public visibility. Any future restoration returns to private review and requires a separate editorial publication decision.

---

## 8. Required decision points

| Decision | Required answer | Evidence expected |
|---|---|---|
| Send the urgent draft? | No | Failed sender, recipient, data-minimization, safeguarding, and link checks |
| Silence `DDM-RESTORE-001` immediately? | No | Exposure and audit status are unresolved |
| Is the event already a false positive? | No, not yet | Test-fixture correlation alone is insufficient |
| Should restoration continue? | No | Restricted record and missing public verification require fail-closed handling |
| Where do case details go? | Confidential privacy/safeguarding route | Restricted incident reference only in broad channels |
| Can management receive an update? | Yes, bounded and status-based | Incident ID, scope, containment, owner, next update |
| Can the article be restored directly to public? | No | Restoration must target private review |
| When may the incident close? | After independent evidence review and reconciliation | Public checks, audit evidence, classification, corrective action |

---

## 9. Expected communication outputs

Participants must produce four short outputs during the exercise.

### Acknowledgement message

> `[SEV-1/SEV-2] Potential HMSI public-boundary incident detected at [UTC time]. Restoration and publication are paused while engineering verifies public routes, application state, and audit evidence. Do not share content or personal information in this channel. Next update: [UTC time]. Incident commander: [role].`

### Stop-send decision

> `Do not send the current draft. It uses an unapproved sender, a broad recipient group, raw content, an exact location, and a restricted review link. Safeguarding and privacy details must remain in the confidential route. Re-review is required after the incident is classified.`

### Management update

> `The issue is contained and remains under review. Restoration and publication are paused. Engineering is validating the public boundary and audit trail; privacy and safeguarding owners are reviewing the restricted classification. We will not describe the alert as a false positive until independent verification is complete.`

### Conditional resolution update

> `The event was reviewed as a bounded synthetic observability issue after public-route checks, audit reconciliation, and independent review confirmed no public exposure or state mutation. Monitor routing will be corrected under change control. The affected article remains subject to normal private editorial review and separate publication authorization.`

---

## 10. Evaluator scorecard

Score each control as **2 = demonstrated**, **1 = partial**, or **0 = missed**. A score of 0 on a critical control is a stop-ship training finding.

| Control | Score | Evidence/notes |
|---|:---:|---|
| Roles and incident commander established within 5 minutes |  |  |
| Alert acknowledged without premature silence |  |  |
| Incident severity treated as unknown/critical until disproven |  |  |
| Unsafe template stopped before sending |  |  |
| Sender, recipient, channel, and link checks completed |  |  |
| Raw personal and safeguarding data kept out of broad channels |  |  |
| Confidential safeguarding route used |  |  |
| Privacy owner involved when restricted content appeared |  |  |
| Restoration/publication activity paused |  |  |
| Public list, ticker, and detail routes checked |  |  |
| Audit evidence checked before classification |  |  |
| Test-fixture explanation not treated as proof of no exposure |  |  |
| Management update separated confirmed facts from unknowns |  |  |
| No direct archived-to-published restoration proposed |  |  |
| Monitor silence, if proposed, was scoped, owned, and time-boxed |  |  |
| Decision log maintained with UTC timestamps and evidence references |  |  |
| Recovery required independent review |  |  |
| Corrective action, owner, and due date recorded |  |  |

### Scoring interpretation

A total score of 30 or more indicates that the team demonstrated the core process, subject to review of critical controls. A score between 20 and 29 indicates material improvement work is required before the next live deployment. A score below 20, or any score of 0 on public-boundary containment, safeguarding routing, privacy handling, or no-send enforcement, requires a repeat exercise before production activation.

---

## 11. Stop-ship findings

The facilitator must record a stop-ship finding if participants send or approve the unsafe draft; publish or restore the restricted record; silence the critical monitor before checking exposure; copy raw article or safeguarding content into a broad channel; bypass privacy or safeguarding review; classify the event as a false positive without public-route and audit evidence; or resume operations while reconciliation remains incomplete.

A stop-ship finding does not mean the team failed permanently. It identifies a control that must be retrained, automated, or clarified before live use.

---

## 12. After-action review

The review should begin with the question, “What decision most reduced risk?” Participants then discuss where the checklist was easy to apply, where time pressure created ambiguity, whether the incident commander had enough authority, whether the confidential route was known, whether the monitor message contained the right bounded evidence, and whether any role or handoff was unclear.

| Improvement action | Owner | Due date | Acceptance evidence |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

The after-action report should include the exercise date, participants, score, stop-ship findings, decisions, evidence gaps, monitor or template changes, training actions, and next rehearsal date. Do not attach raw synthetic case detail if it creates confusion with real records.

---

## 13. Facilitator close

End the exercise with the following statement:

> **The goal is not to move fastest from alert to publication. The goal is to move fastest to a safe, evidenced decision. When public visibility, audit integrity, privacy, or safeguarding is uncertain, HMSI pauses, protects, escalates, and verifies.**
