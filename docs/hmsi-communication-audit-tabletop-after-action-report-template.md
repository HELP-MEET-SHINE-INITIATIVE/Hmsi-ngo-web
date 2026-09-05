# HMSI Communication-Audit Tabletop Exercise
## After-Action Report Template

**Document status:** Working template  
**Exercise name:** `[Name]`  
**Exercise date:** `[YYYY-MM-DD]`  
**Exercise time:** `[Start–end time, UTC]`  
**Exercise owner:** `[Role/name]`  
**Incident scenario:** `[Short synthetic scenario description]`  
**Version:** `[Version]`  
**Classification:** `[Internal / Restricted / Confidential]`

> **Purpose:** Capture what the team decided, what evidence it used, which controls worked or failed, what gaps were identified, and what corrective actions must be completed before the next live deployment or exercise.

> **Data boundary:** This report must use synthetic or bounded references only. Do not include real volunteer, donor, safeguarding, authentication, or incident data. Store sensitive exercise evidence in the approved restricted system and reference it by an opaque evidence ID.

---

## 1. Executive summary

### 1.1 Exercise purpose

`Describe the capability tested and why the exercise was conducted.`

### 1.2 Scenario summary

`Summarize the simulated public-boundary or communication-template incident without including sensitive content.`

### 1.3 Overall outcome

`Summarize whether the team met the objectives, whether a stop-ship finding occurred, and whether additional rehearsal is required.`

| Measure | Result |
|---|---|
| Exercise objectives met | `[Yes / Partial / No]` |
| Final exercise classification | `[Contained synthetic issue / Unresolved / Stop-ship finding]` |
| Critical controls passed | `[Number or summary]` |
| Critical controls missed | `[Number or summary]` |
| Stop-ship findings | `[None / List finding IDs]` |
| Corrective actions opened | `[Count]` |
| Next rehearsal required | `[Yes / No]` |

### 1.4 Executive conclusion

`Write two to four sentences stating the most important lesson for management and the operational readiness decision.`

---

## 2. Scope, objectives, and assumptions

| Item | Details |
|---|---|
| Exercise scope | `[Communication-template audit / public-boundary incident / full response]` |
| Systems represented | `[Datadog / newsroom / public routes / audit ledger / messaging channels]` |
| Systems excluded | `[List]` |
| Synthetic-data boundary | `[Describe fixture rules]` |
| Time-pressure assumption | `[For example, 60-minute exercise]` |
| Public or external communications simulated | `[Yes / No]` |
| Live mutations permitted | `No` |

### Objectives

| Objective ID | Objective | Met? | Evidence reference |
|---|---|:---:|---|
| OBJ-01 | Stop an unsafe communication before sending | `[ ]` |  |
| OBJ-02 | Apply privacy and safeguarding checks under time pressure | `[ ]` |  |
| OBJ-03 | Escalate a suspected public-boundary incident correctly | `[ ]` |  |
| OBJ-04 | Preserve bounded evidence without exposing sensitive payloads | `[ ]` |  |
| OBJ-05 | Distinguish a known test signal from an unresolved control failure | `[ ]` |  |
| OBJ-06 | Require private review before any restoration or publication decision | `[ ]` |  |
| OBJ-07 | Produce accurate internal and management updates | `[ ]` |  |

---

## 3. Participants and responsibilities

| Participant | Actual role/name | Exercise role | Attendance | Notes |
|---|---|---|:---:|---|
| Incident commander |  | Decision owner | [ ] |  |
| Operations lead |  | Template and send/no-send control | [ ] |  |
| Engineering lead |  | Route, state, audit, and deployment verification | [ ] |  |
| Privacy lead |  | Personal-data assessment | [ ] |  |
| Safeguarding lead |  | Confidential-route decision | [ ] |  |
| Security lead |  | Authorization and sender review | [ ] |  |
| Editorial lead |  | Article status and publication decision | [ ] |  |
| Communications lead |  | Stakeholder message drafting | [ ] |  |
| Facilitator |  | Injects and timekeeping | [ ] |  |
| Evaluator |  | Evidence and scoring | [ ] |  |

If a required role was absent, record the named delegate and whether the absence created a decision or escalation gap.

---

## 4. Exercise timeline and decision log

Record decisions using UTC time and bounded references. Do not copy raw message bodies, personal information, or safeguarding narratives into this report.

| UTC time | Inject or event | Decision/action | Decision owner | Evidence ID | Result or consequence |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

### Decision review questions

| Question | Finding |
|---|---|
| Was the first alert acknowledged without premature silence? |  |
| Was the event treated as real or unknown until disproven? |  |
| Was the unsafe message stopped before send? |  |
| Were privacy and safeguarding routes separated from ordinary channels? |  |
| Were public routes and audit evidence checked? |  |
| Was management pressure handled without bypassing controls? |  |
| Was restoration kept private and separate from publication? |  |
| Was recovery based on independent evidence? |  |

---

## 5. Communication-template audit results

### 5.1 Template inventory

| Template ID | Template type | Version | Sender | Channel | Intended audience | Review result |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  | `[Approve / Conditions / Revise / Stop-send]` |
|  |  |  |  |  |  | `[Approve / Conditions / Revise / Stop-send]` |
|  |  |  |  |  |  | `[Approve / Conditions / Revise / Stop-send]` |

### 5.2 Rapid-check results

| Check | Pass | Partial | Fail | Evidence/notes |
|---|:---:|:---:|:---:|---|
| Approved sender identity | [ ] | [ ] | [ ] |  |
| Correct recipient scope | [ ] | [ ] | [ ] |  |
| Appropriate channel | [ ] | [ ] | [ ] |  |
| Purpose limitation | [ ] | [ ] | [ ] |  |
| Personal-data minimization | [ ] | [ ] | [ ] |  |
| Safeguarding route | [ ] | [ ] | [ ] |  |
| Link and attachment safety | [ ] | [ ] | [ ] |  |
| Incident wording accuracy | [ ] | [ ] | [ ] |  |
| Public/private boundary | [ ] | [ ] | [ ] |  |
| Current template version | [ ] | [ ] | [ ] |  |
| Approval and sign-off | [ ] | [ ] | [ ] |  |

### 5.3 Stop-send findings

| Finding ID | Trigger | Decision | Owner | Immediate control | Resolved during exercise? |
|---|---|---|---|---|:---:|
|  |  | `[Stop / Revise / Escalate]` |  |  | [ ] |
|  |  | `[Stop / Revise / Escalate]` |  |  | [ ] |

---

## 6. Control performance assessment

Score each control as **2 — demonstrated**, **1 — partial**, or **0 — missed**. Add evidence IDs rather than sensitive content.

| Control ID | Control | Score | Evidence ID | Gap or observation |
|---|---|:---:|---|---|
| CTRL-01 | Incident commander established promptly |  |  |  |
| CTRL-02 | Critical alert acknowledged without unsafe silence |  |  |  |
| CTRL-03 | Restoration and publication paused when uncertainty existed |  |  |  |
| CTRL-04 | Unsafe communication stopped before sending |  |  |  |
| CTRL-05 | Sender, recipient, and channel were verified |  |  |  |
| CTRL-06 | Personal data was minimized and not broadly disclosed |  |  |  |
| CTRL-07 | Safeguarding details used the confidential route |  |  |  |
| CTRL-08 | Public list, ticker, and detail routes were checked |  |  |  |
| CTRL-09 | Audit evidence was checked before classification |  |  |  |
| CTRL-10 | Known test activity was not treated as proof of safety |  |  |  |
| CTRL-11 | Management update separated facts from unknowns |  |  |  |
| CTRL-12 | Archived content was not restored directly to public status |  |  |  |
| CTRL-13 | Any monitor silence was scoped, owned, and time-boxed |  |  |  |
| CTRL-14 | Recovery required independent review |  |  |  |
| CTRL-15 | Corrective actions had owners and due dates |  |  |  |

### Score summary

| Category | Maximum | Achieved | Interpretation |
|---|---:|---:|---|
| Incident command and escalation |  |  |  |
| Privacy and safeguarding |  |  |  |
| Communication-template audit |  |  |  |
| Technical/public-boundary controls |  |  |  |
| Evidence and governance |  |  |  |
| **Total** |  |  |  |

A missed public-boundary, safeguarding, privacy, unsafe-send, or direct archive-to-public control is a critical finding regardless of total score.

---

## 7. Control gaps and lessons learned

### 7.1 What worked well

`Describe the controls, handoffs, decisions, tools, or communication patterns that performed well.`

| Strength ID | Observation | Why it mattered | Preserve or scale? |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

### 7.2 Control gaps

| Gap ID | Control area | Observed gap | Risk | Severity | Root-cause hypothesis | Evidence ID |
|---|---|---|---|---|---|---|
| GAP-001 |  |  |  | `[Critical/High/Medium/Low]` |  |  |
| GAP-002 |  |  |  | `[Critical/High/Medium/Low]` |  |  |
| GAP-003 |  |  |  | `[Critical/High/Medium/Low]` |  |  |

### 7.3 Lessons learned

| Lesson ID | Lesson | Supporting decision or evidence | Recommended change |
|---|---|---|---|
| LES-001 |  |  |  |
| LES-002 |  |  |  |
| LES-003 |  |  |  |

---

## 8. Privacy and safeguarding review

Complete this section even when the exercise uses synthetic data. The purpose is to confirm that the team applied the correct boundary.

| Question | Finding | Reviewer | Evidence ID |
|---|---|---|---|
| Was any real personal data used? | `[No / Yes — escalate]` |  |  |
| Was any safeguarding detail placed in an ordinary channel? | `[No / Yes — escalate]` |  |  |
| Were confidential details referenced only by opaque ID? | `[Yes / No]` |  |  |
| Were links and attachments restricted correctly? | `[Yes / Partial / No]` |  |  |
| Was any public exposure simulated or observed? | `[No / Yes — incident review]` |  |  |
| Was the decision log free of sensitive payloads? | `[Yes / Partial / No]` |  |  |
| Is further privacy or safeguarding review required? | `[No / Yes]` |  |  |

### Restricted follow-up reference

`If further review is required, record only the restricted evidence ID, owner, and due date. Do not copy case details into this report.`

---

## 9. Corrective-action register

Every action must be specific, measurable, assigned, and testable. Actions that change production permissions, monitoring, communication routes, or public queries require normal change control.

| Action ID | Finding/source | Corrective action | Owner | Priority | Due date | Acceptance test | Status |
|---|---|---|---|---|---|---|---|
| ACT-001 |  |  |  | `[P1/P2/P3]` |  |  | `[Open/In progress/Blocked/Closed]` |
| ACT-002 |  |  |  | `[P1/P2/P3]` |  |  | `[Open/In progress/Blocked/Closed]` |
| ACT-003 |  |  |  | `[P1/P2/P3]` |  |  | `[Open/In progress/Blocked/Closed]` |
| ACT-004 |  |  |  | `[P1/P2/P3]` |  |  | `[Open/In progress/Blocked/Closed]` |

### Suggested action categories

| Category | Example acceptance evidence |
|---|---|
| Template | Versioned template diff, privacy review, test render |
| Routing | Approved sender/recipient test, delivery log, suppression check |
| Safeguarding | Confidential-route test and safeguarding-owner approval |
| Application | Public-list/ticker/detail regression test |
| Monitoring | Synthetic Datadog alert, scrubber test, routing confirmation |
| Access control | Negative authorization test and permission review |
| Training | Attendance record and repeat tabletop score |
| Documentation | Updated runbook, owner, and change reference |

---

## 10. Recovery and readiness decision

Select one outcome and provide the evidence reference.

| Decision | Select | Conditions |
|---|:---:|---|
| Ready for next controlled exercise | [ ] | No critical gaps remain open |
| Ready with conditions | [ ] | Conditions and owners documented below |
| Not ready; repeat exercise required | [ ] | A critical control was missed or evidence was insufficient |
| Stop-ship for live deployment | [ ] | Public-boundary, privacy, safeguarding, or unsafe-send control failed |

### Conditions for readiness

`List the specific actions that must be completed before the next stage.`

### Repeat-exercise requirement

`State which injects or controls must be rehearsed again and the target date.`

---

## 11. Communications and management decisions

| Decision or communication | Audience | Sender/owner | UTC time | Approved by | Evidence ID |
|---|---|---|---|---|---|
| Initial incident acknowledgement | Restricted incident team |  |  |  |  |
| Containment update | Technical/governance owners |  |  |  |  |
| Management update | Management sponsor |  |  |  |  |
| Safeguarding notification, if required | Confidential route |  |  |  |  |
| Privacy notification, if required | Privacy owner |  |  |  |  |
| Resolution or exercise close | Participants/management |  |  |  |  |

---

## 12. Management sign-off

| Sign-off role | Name | Decision | Date and UTC time | Signature/approval reference |
|---|---|---|---|---|
| Exercise owner |  |  |  |  |
| Operations lead |  |  |  |  |
| Engineering lead |  |  |  |  |
| Privacy owner, if required |  |  |  |  |
| Safeguarding lead, if required |  |  |  |  |
| Security lead, if required |  |  |  |  |
| Editorial lead |  |  |  |  |
| Accountable management owner |  |  |  |  |

---

## 13. Distribution and retention

Distribute this report only to the approved audience. Store the final report and evidence references in the approved governance location. Keep any restricted safeguarding or privacy evidence outside ordinary copies of this document. Apply the approved exercise-record retention period and do not retain real personal data merely because it appeared during an exercise.

## 14. Final close statement

> **The exercise is complete when the team can show not only what it decided, but why the decision was safe, who approved it, what evidence supports it, and what will change before the next deployment.**
