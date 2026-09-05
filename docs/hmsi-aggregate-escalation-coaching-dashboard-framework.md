# HMSI Aggregate Escalation and Coaching Dashboard Framework
## Cross-Team View for Volunteer Support Quality

**Purpose:** Provide program directors and authorized team leads with a safe, aggregate view of escalation trends and peer-coaching themes across volunteer teams. The dashboard is intended to improve support processes, not rank volunteers or team leads.

**Status:** Framework template; all values are placeholders until verified data is connected.  
**Recommended cadence:** Weekly operational review, monthly program review, and quarterly leadership summary.  
**Primary audiences:** Program directors, authorized safeguarding/privacy/security leads, and designated team leads with scoped access.

> **Privacy principle:** The dashboard should show patterns, not people. Suppress small cohorts, avoid distinctive quotations, separate confidential cases from routine metrics, and do not expose volunteer names, individual scores, sensitive narratives, private beneficiary information, medical details, passwords, or access tokens.

---

## 1. Dashboard Questions

The dashboard should help leadership answer five questions:

1. Are volunteer support conversations being conducted consistently and respectfully across teams?
2. Which routine barriers—clarity, capacity, connection, confidence, portal access, or task instructions—are recurring?
3. Are team leads distinguishing routine support from confidential escalation appropriately?
4. Which process or system changes would reduce avoidable friction?
5. Are agreed actions being owned, completed, and verified without creating punitive pressure?

The dashboard should not answer whether a named volunteer is committed, productive, safe, or suitable. Those judgments are outside this framework and must not be inferred from pulse responses or coaching observations.

---

## 2. Access and Reporting Layers

| View | Audience | Granularity | Allowed content |
|---|---|---|---|
| Team-lead operational view | Scoped team leads | Team or process aggregate | Current routine support themes, open actions, response timeliness, and safe workflow signals |
| Program-director view | Program directors | Cross-team aggregate | Trends, comparisons that meet cohort thresholds, improvement themes, escalation process status, and decisions needed |
| Restricted safeguarding/privacy view | Authorized specialist roles | Case system, not general dashboard | Confidential routing status and service-level monitoring without exposing case narratives to ordinary users |
| Quarterly leadership summary | Executive leadership | Aggregate period and trend | Strategic themes, action completion, risk posture, and resource decisions |

Every view should display the reporting period, data freshness, denominator where applicable, suppression state, and evidence limitations.

---

## 3. Core Metric Dictionary

| Metric | Definition | Formula or rule | Cadence | Interpretation guardrail |
|---|---|---|---|---|
| Pulse response coverage | Share of eligible volunteers who submitted a pulse response during the period | Responses received ÷ eligible invitations × 100 | Weekly/monthly | Low coverage limits representativeness; do not treat non-response as dissatisfaction |
| Routine support request rate | Share of responses that requested ordinary support | Routine support requests ÷ responses with a valid classification × 100 | Weekly | Use only with a clear denominator and stable question wording |
| Confidential-route signal count | Number of responses routed to the restricted process | Count of restricted route referrals | Weekly | Show status only; never show narrative, identity, or allegation detail in the general dashboard |
| Median support acknowledgement time | Median time from routine request receipt to acknowledgement | Median of acknowledgement timestamp minus request timestamp | Weekly | Report median and volume together; do not hide long-tail delays |
| Action completion rate | Share of accepted improvement actions verified complete by the target date | Verified complete actions ÷ accepted due actions × 100 | Monthly | “Complete” requires evidence, not a verbal promise |
| Repeated theme rate | Frequency of a coded theme across valid observations | Theme-coded observations ÷ valid observations × 100 | Monthly | Theme coding must be documented and reviewed for consistency |
| Coaching behavior adherence | Share of observed conversations meeting a defined behavior criterion | Observations marked observed ÷ applicable observations × 100 | Monthly | This is process learning, not an individual performance score |
| Escalation routing timeliness | Share of required confidential referrals acknowledged within the approved service level | Timely restricted-route acknowledgements ÷ required referrals × 100 | Weekly/monthly | Access restricted to authorized specialists; general dashboard shows only aggregate status |
| Portal/access friction rate | Share of routine cases involving approved access or room problems | Access-related routine cases ÷ classified routine cases × 100 | Weekly | Do not expose account identifiers or credentials |
| Volunteer choice preservation | Share of observed conversations where pause, decline, or adjustment choice was respected | Applicable observations meeting criterion ÷ applicable observations × 100 | Monthly | Use behavioral evidence; do not infer intent |
| Evidence sufficiency rate | Share of reported themes with enough evidence for program action | Actionable themes with documented evidence ÷ reported themes × 100 | Monthly | Mark small or mixed evidence as insufficient rather than forcing a conclusion |

For all rates, store the numerator, denominator, period, coding version, and suppression state. Never display a percentage without enough context to interpret it.

---

## 4. Cohort and Suppression Rules

The dashboard must enforce privacy rules before rendering charts, tables, exports, or filters.

| Rule | Required behavior |
|---|---|
| Minimum cohort size | Do not show team, pathway, location, or role-segment results when the cohort is below the approved minimum. Recommended default: suppress cohorts below 5; confirm HMSI policy before launch. |
| Small-cell protection | Suppress or combine categories that could reveal one person through subtraction or comparison. |
| No individual view | Do not provide drill-down from aggregate results to a volunteer, team lead, conversation, or distinctive comment. |
| Time-window protection | Avoid narrow time windows when they would reveal a single event or participant. Combine periods where necessary. |
| Restricted escalation data | General users see counts/status bands only; detailed cases remain in the authorized confidential system. |
| Export protection | Apply the same suppression rules to CSV, PDF, email, and API responses. |
| Free-text protection | Do not publish raw comments. Use reviewed, de-identified themes only. |
| Missing-data disclosure | Show “not enough data” rather than zero when data is absent or suppressed. |
| Re-identification review | An authorized reviewer checks each cross-team comparison before circulation. |

A suppression banner should read: **“Some values are hidden or combined to protect volunteer privacy and prevent identification.”**

---

## 5. Recommended Dashboard Views

### View A — Executive Signal Strip

Show a small set of aggregate status tiles for the selected period:

| Tile | Display |
|---|---|
| Response coverage | [Placeholder: percentage or “not enough data”] |
| Routine support acknowledgement | [Placeholder: median time and volume] |
| Open improvement actions | [Placeholder: count by status] |
| Verified action completion | [Placeholder: percentage] |
| Confidential route status | [“Restricted detail; service-level monitoring available to authorized leads”] |
|

The strip should include a visible **data freshness timestamp** and a note that values are not volunteer performance scores.

### View B — Escalation Trend Timeline

Use a line or column chart across weekly periods showing aggregate counts or rates for routine support requests, pause requests, access issues, and restricted-route referrals. Display suppressed or insufficient periods as a labeled gap, not as zero.

**Required annotations:** reporting period, denominator, data freshness, coding version, and any major workflow change that could affect comparability.

### View C — Team Comparison Heatmap

Use a privacy-safe matrix with rows for teams and columns for process themes such as clarity, capacity, access, connection, and closure. Use qualitative bands—**emerging**, **watch**, **stable**, or **insufficient evidence**—instead of precise values when cohorts are small.

The comparison is for resource allocation and process learning. It must not rank teams publicly or attach a performance label to a team lead.

### View D — Coaching Themes

Show the share or qualitative status of observed behaviors:

| Theme | Current signal | Direction | Program implication |
|---|---|---|---|
| Consent and choice | [Placeholder] | Improving / stable / declining / insufficient | [Action] |
| Listening and reflection | [Placeholder] | [Direction] | [Action] |
| Privacy and data minimization | [Placeholder] | [Direction] | [Action] |
| Routine/confidential classification | [Placeholder] | [Direction] | [Action] |
| Non-retaliation language | [Placeholder] | [Direction] | [Action] |
| Action ownership and closure | [Placeholder] | [Direction] | [Action] |

### View E — Action Register

Display only actions authorized for the viewer.

| Action | Source theme | Owner | Due date | Status | Verification evidence | Escalation state |
|---|---|---|---|---|---|---|
| [Action] | [Theme] | [Role] | [Date] | Proposed / open / in progress / complete | [Evidence] | None / watch / escalated |

### View F — Data Quality and Governance

Show whether the dashboard is safe to interpret:

| Check | Status |
|---|---|
| Response coverage adequate for current comparisons | [Pass / warning / insufficient] |
| Coding definitions unchanged or versioned | [Pass / warning] |
| Suppression rules applied to all views and exports | [Pass / warning] |
| Confidential-route details excluded from general view | [Pass / warning] |
| All “complete” actions have verification evidence | [Pass / warning] |
| Data refresh completed on schedule | [Pass / warning] |

---

## 6. Filters and Interaction Rules

Recommended filters are **reporting period**, **team**, **program pathway**, **conversation type**, **theme**, **support status**, and **action status**. Filters should be additive and privacy-aware: selecting a narrow team or period must trigger suppression rather than expose a small cell.

The dashboard should provide a clear **Reset filters** control, retain the selected reporting period in the page title, and show a result count only when the count itself is not identifying. Sorting should be stable and should not create a ranking of team leads or volunteers.

Drill-through should stop at the aggregate theme or action level. It must not link to individual pulse responses, raw free-text comments, private conversation records, or confidential case systems for ordinary dashboard users.

---

## 7. Escalation Logic for Dashboard Alerts

Alerts should be tied to process conditions and approved thresholds, not personal judgments.

| Alert level | Example trigger | Dashboard display | Required response |
|---|---|---|---|
| Informational | A theme appears once or evidence is insufficient | Neutral note | Monitor and collect safe additional evidence |
| Watch | A routine barrier recurs or acknowledgement time approaches the service limit | Amber “watch” status | Assign an owner, inspect the workflow, and review at the next meeting |
| Action required | A verified process threshold is crossed or an action is overdue | Red “action required” status | Program owner creates or updates a corrective action with a due date |
| Restricted | Confidential-route volume or service-level issue requires authorized review | Restricted status band only | Authorized safeguarding/privacy lead reviews separately |
| System fallback | Dashboard data is stale, unavailable, or inconsistent | “Data unavailable—do not interpret” | Use the approved manual fallback and reconcile after restoration |

The alert engine must be idempotent. Repeated refreshes must not create duplicate alerts, duplicate notifications, or duplicate action records.

---

## 8. Review Cadence and Governance

### Weekly operational review

Team leads review current routine barriers, action ageing, response timeliness, and data-quality warnings. The review should produce no more than three concrete actions. Confidential matters are handled outside this meeting by authorized roles.

### Monthly program review

Program directors compare stable aggregate themes across teams, validate whether actions produced improvement, review suppressed or insufficient periods, and decide whether a task template, onboarding resource, portal flow, or communication should change.

### Quarterly leadership review

Leadership reviews trends, resource requirements, action completion, and risk posture. The quarterly summary should include a limitations statement and should never claim that the dashboard proves volunteer satisfaction, retention, or safety by itself.

### Governance owner

| Responsibility | Owner |
|---|---|
| Metric definitions and coding version | [Program data owner] |
| Privacy and suppression approval | [Privacy or safeguarding owner] |
| Dashboard access control | [System administrator] |
| Action register stewardship | [Program operations owner] |
| Quarterly sign-off | [Program director] |

---

## 9. Implementation Checklist

| Stage | Checklist item | Status |
|---|---|:---:|
| Definition | Approve the metric dictionary, coding definitions, and reporting cadence. | [ ] |
| Privacy | Confirm the minimum cohort size, small-cell rules, free-text handling, and export controls. | [ ] |
| Access | Map each user role to the correct dashboard view and restrict confidential information. | [ ] |
| Data | Confirm source fields, timestamp standards, data freshness, and missing-data behavior. | [ ] |
| Build | Implement aggregate views, suppression, filters, status bands, and safe empty states. | [ ] |
| Testing | Test ordinary, small-cohort, missing-data, stale-data, and restricted-route cases. | [ ] |
| Security | Verify that API responses enforce the same authorization and suppression as the UI. | [ ] |
| Operations | Assign owners, service levels, manual fallback, and reconciliation steps. | [ ] |
| Training | Brief team leads that the dashboard supports process improvement and is not a performance scorecard. | [ ] |
| Launch | Complete privacy review, director sign-off, and a limited pilot before broad access. | [ ] |

---

## 10. Leadership Readout Template

**Reporting period:** [ ]  
**Data freshness:** [ ]  
**Evidence status:** Verified / partial / insufficient  
**Top process strength:** [ ]  
**Top recurring barrier:** [ ]  
**Most important action:** [ ]  
**Decision requested:** [ ]  
**Restricted matters:** Handled separately by authorized roles  
**Next review:** [ ]

> **Suggested readout:** “This dashboard shows aggregate process signals from the approved volunteer-support workflow. It helps us identify where onboarding, task design, access, communication, or support ownership should improve. It does not rank volunteers or team leads, and suppressed values must not be reverse-engineered.”

---

## 11. Example Data Dictionary Fields

| Field | Type | Required | Privacy note |
|---|---|:---:|---|
| reporting_period_start | UTC timestamp/date | Yes | Use period-level data only in the dashboard |
| reporting_period_end | UTC timestamp/date | Yes | Do not use narrow windows that reveal a single event |
| team_group | Controlled category | Yes | Suppress small groups |
| pathway_group | Controlled category | No | Suppress small pathways |
| signal_category | Controlled category | Yes | Use approved coded themes |
| support_classification | Routine / confidential / uncertain | Yes | Confidential detail remains restricted |
| observation_count | Integer | Yes | Suppress small cells |
| valid_denominator | Integer | When rate used | Always show with a rate internally |
| status_band | Controlled category | Yes | Use qualitative bands for small cohorts |
| action_id | Internal reference | No | Do not link ordinary users to sensitive records |
| data_freshness_at | UTC timestamp | Yes | Show on every dashboard view |
| suppression_state | Boolean/category | Yes | Apply to charts, tables, exports, and APIs |
| evidence_quality | Verified / partial / insufficient | Yes | Prevent overconfident interpretation |

---

## 12. Final Safety and Quality Standard

The dashboard is ready for use only when an authorized reviewer can answer **yes** to all of the following: the displayed metrics have approved definitions; every rate has a clear denominator; small cohorts are suppressed; confidential matters are separated; missing data is not presented as zero; actions have owners and verification; and the dashboard cannot be used to identify or punish an individual volunteer or team lead.

HMSI’s values remain the operating standard: **Help Meet** means using the information to walk alongside people; **Shine** means making safe contribution and learning visible; **Initiative** means converting evidence into accountable, proportionate action.
