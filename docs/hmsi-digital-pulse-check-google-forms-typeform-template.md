# HMSI Digital Pulse-Check Form Template
## Google Forms and Typeform Specification

**Form name:** HMSI First-Month Volunteer Pulse Check  
**Purpose:** Collect a short, voluntary check-in on clarity, capacity, connection, confidence, and safety/respect during the first month of participation.  
**Recommended cadence:** Day 3–5, Day 14 or after the first contribution, Day 28, and an optional event-based check after a significant blocker or concern.  
**Estimated completion time:** 3–5 minutes.  
**Status:** Reusable design specification; no external form account or live response destination has been connected.

> **Important boundary:** This template is a digital collection design, not a live configured Google Form or Typeform. Before publishing, HMSI must confirm the form owner, storage location, access controls, confidential reporting route, retention period, and approved notification recipients.

---

## 1. Recommended Platform Options

| Approach | Best fit | Strengths | Trade-offs | Setup requirement |
|---|---|---|---|---|
| **Google Forms + Google Sheets** | Low-cost internal rollout and simple cohort collection | Fast manual setup, familiar interface, straightforward spreadsheet review | Branching and workflow automation are more limited; access and sheet permissions require careful configuration | HMSI Google Workspace owner, approved response sheet, restricted editors |
| **Typeform** | More guided respondent experience and richer branching | Strong conversational flow, polished completion experience, flexible logic | Paid features may be needed for advanced logic or integrations; response export and access need governance | HMSI Typeform workspace, approved destination, webhook/integration owner |
| **HMSI portal form** | Long-term integration with role, task, and support records | Server-side authorization, direct trigger routing, unified audit trail | Requires application implementation, testing, maintenance, and secure data design | Product owner, schema/API work, privacy review, deployment process |

For a first rollout, use the platform already approved by HMSI and keep automated actions limited to safe routing, acknowledgement, and owner assignment. Do not send sensitive case details to general email, chat, spreadsheets, or third-party automation tools.

---

## 2. Form Settings

| Setting | Recommended configuration |
|---|---|
| **Title** | HMSI First-Month Volunteer Pulse Check |
| **Description** | Thank volunteers, explain the purpose, state that participation is voluntary, and link to the confidential reporting route. |
| **Progress indicator** | On, if supported. Use four short sections. |
| **Email collection** | Off by default. Offer an optional follow-up contact field instead. |
| **Name collection** | Off by default. Ask for a name only when the volunteer explicitly requests follow-up and the platform is approved for that data. |
| **Limit to one response** | Use only when it does not require identifiable sign-in or compromise anonymous feedback. |
| **Edit after submission** | Off unless the owner can preserve an audit trail and the change does not affect trigger handling. |
| **Response receipt** | Optional; do not include sensitive answers in email receipts. |
| **File upload** | Off. Do not collect documents, screenshots, medical details, or case evidence in this pulse check. |
| **Response destination** | Restricted, approved owner-controlled workspace only. Never use a public sheet or shared link. |
| **Notification** | Notify an operational owner only for routine follow-up. Safety and confidential signals must route through the designated secure process. |
| **Retention** | Set according to HMSI’s approved privacy and retention policy; record the decision before launch. |

---

## 3. Form Flow

### Section 1 — Welcome and context

**Introductory copy:**

> Thank you for sharing how your first month with HMSI is going. This short check helps us improve onboarding, support, task clarity, and safe participation. Honest feedback is welcome. You may skip questions, request follow-up, or choose to pause your participation. This is not a performance score or attendance tracker.

> Please do not include passwords, access tokens, private beneficiary information, medical details, full safeguarding disclosures, or sensitive case information. Use the designated confidential HMSI route for urgent safety, safeguarding, privacy, security, harassment, or wellbeing concerns.

**Question 1 — Checkpoint**  
*Type:* Single choice; required for routing.

- Day 3–5 orientation
- Day 14 or first contribution
- Day 28 continuation
- Event-based support check

**Question 2 — Role or pathway**  
*Type:* Single choice; optional.

- Community Outreach
- Community Publisher
- Humanitarian Activist
- Independent Field Reporter
- Digital Advocate
- Other approved pathway
- Prefer not to say

**Question 3 — Participation mode**  
*Type:* Single choice; optional.

- Remote
- Field or community-based
- Mixed
- Not yet started
- Prefer not to say

### Section 2 — Five pulse-check questions

Use the same scale for every item.

**Response scale:**

| Value | Label |
|---:|---|
| 1 | Not at all / strongly disagree |
| 2 | A little / disagree |
| 3 | Partly / unsure |
| 4 | Mostly / agree |
| 5 | Completely / strongly agree |
| N/A | Not applicable yet |

**Question 4 — Clarity**  
*Type:* Opinion scale or multiple choice grid; required unless N/A.

> I understand what HMSI is asking me to do at this stage.

**Question 5 — Capacity**  
*Type:* Opinion scale or multiple choice grid; required unless N/A.

> I can participate within my available time, skills, location, and capacity.

**Question 6 — Connection**  
*Type:* Opinion scale or multiple choice grid; required unless N/A.

> I know who to contact and can get help when I need it.

**Question 7 — Confidence**  
*Type:* Opinion scale or multiple choice grid; required unless N/A.

> I feel confident about the next task or contribution step.

**Question 8 — Safety and respect**  
*Type:* Opinion scale or multiple choice grid; required unless N/A.

> I feel safe, respected, and able to pause or raise a concern.

**Implementation note:** In Google Forms, use a linear scale from 1 to 5 plus a separate N/A option if the required scale cannot support N/A. In Typeform, use a Rating or Opinion Scale question and include N/A as an explicit choice. Do not silently convert N/A to zero.

### Section 3 — Immediate experience and support

**Question 9 — Current blocker**  
*Type:* Multiple selection; optional.

> Which issue, if any, is currently making participation harder?

- I am unsure about my role or approval boundaries.
- I cannot access the correct portal workspace, room, or task.
- The task instructions or expected outcome are unclear.
- I do not know how to submit approved proof or a Google Drive link.
- I am waiting for a response or decision.
- The task does not fit my current time, skills, location, or capacity.
- I need clearer safety, consent, privacy, or reporting guidance.
- I feel excluded, pressured, unsafe, or uncomfortable.
- I have no current blocker.
- Other non-sensitive issue.

**Question 10 — Most useful next step**  
*Type:* Long text; optional.

> What is the most useful next step HMSI could provide? Please do not include sensitive case details.

**Question 11 — What is working well?**  
*Type:* Long text; optional.

> What is one thing that is working well in your HMSI experience?

**Question 12 — Participation preference**  
*Type:* Single choice; optional.

- No change needed.
- I would like a smaller or different task.
- I would like a short pause.
- I would like to discuss my options.
- Prefer not to say.

### Section 4 — Follow-up and safe routing

**Question 13 — Follow-up preference**  
*Type:* Single choice; optional.

- No follow-up needed.
- Yes, a team member may contact me about routine support.
- I prefer confidential contact.
- I need help finding the appropriate confidential route.

**Question 14 — Optional follow-up contact**  
*Type:* Short text; optional and shown only when Question 13 requests follow-up.

> If you would like routine follow-up, provide your preferred contact method. Do not provide passwords, tokens, or sensitive case details.

**Question 15 — Confidential concern flag**  
*Type:* Single choice; required for routing.

> Did anything occur that requires confidential follow-up?

- No.
- Yes, I have already used the appropriate confidential route.
- Yes, I need help finding the appropriate confidential route.
- Prefer not to say.

**Question 16 — Safe summary**  
*Type:* Short text; optional and shown only when Question 15 is not “No”.

> Provide only a safe, non-sensitive summary and a preferred contact route. Do not describe private case details here.

**Completion message:**

> Thank you for helping HMSI improve how we welcome, support, and work alongside volunteers. A routine follow-up will be sent only if you requested one. For urgent safety, safeguarding, privacy, security, harassment, or wellbeing concerns, use the designated confidential HMSI route rather than this general form.

---

## 4. Branching and Trigger Logic

Use branching to keep the respondent experience short while routing routine support responsibly. Branching should not reveal hidden categories or imply a conclusion about the volunteer.

| Condition | Form behavior | Safe operational action |
|---|---|---|
| Any of Questions 4–7 scores 1 or 2 | Continue to blocker/support section; show a neutral message such as “Thank you. We’ll use this to improve support.” | Create an aggregate or routine support review item. If follow-up was requested, assign an authorized owner. |
| Question 8 scores 1 or 2 | Skip ordinary follow-up automation; show confidential-route guidance and the completion page. | Restrict access and use the designated safeguarding, privacy, security, or wellbeing process. Do not copy the answer into a general dashboard. |
| Question 9 includes role or approval uncertainty | Show a non-sensitive prompt asking what guidance is needed. | Assign an authorized role/contact; pause the task if the boundary is uncertain. |
| Question 9 includes portal or task access issue | Show optional routine follow-up contact field. | Create a bounded support item with route, timestamp, and owner; do not request credentials. |
| Question 9 includes capacity or pause request | Show the participation-preference question. | Confirm the volunteer’s choice and adjust, reassign, or pause work without penalty. |
| Question 9 includes safety, privacy, or reporting guidance | Show confidential-route guidance. | Route confidentially; do not use general email or a shared spreadsheet. |
| Question 13 requests routine follow-up | Show optional contact field. | Notify only the approved operational owner, with the minimum necessary information. |
| Question 13 requests confidential contact | Show the designated secure contact instructions. | Use the authorized confidential process; do not send the response to a general team inbox. |
| Question 15 is not “No” | Show safe-summary instructions and stop ordinary automated routing. | Create only a route/status signal in the general review; maintain case details in the confidential process. |
| Response is incomplete | Allow the volunteer to submit if optional fields are blank. | Do not repeatedly chase incomplete responses or infer a negative result. |

---

## 5. Platform-Specific Build Notes

### Google Forms setup

Create four sections matching the flow above. Use a linear scale or multiple-choice grid for Questions 4–8, but provide a clear N/A option. Use “Go to section based on answer” only for the confidential concern and follow-up branches. Link responses to a restricted Google Sheet owned by HMSI, not to an individual’s personal account. Limit editors to approved reviewers and disable public sharing.

Use a separate, restricted notification method for routine follow-up. Do not use a formula or Apps Script to email raw answers to broad distribution lists. If Apps Script is later added, require a documented owner, secret handling, test fixture, idempotency rule, error log, and rollback path.

### Typeform setup

Use a Welcome Screen, a short checkpoint section, five Opinion Scale questions, a Multiple Choice question for blockers, and a Branching/Logic Jump for follow-up. Use a separate Ending for confidential-route guidance. Configure integrations only after the destination, recipient, retention, and access policy are approved. If a webhook is later added, verify the platform’s current webhook and signature behavior before implementation.

Keep the public completion screen free of private details. Do not place an access token, reset link, case identifier, or sensitive answer inside a confirmation URL or notification subject.

---

## 6. Safe Automation Specification

The minimum useful automation is deterministic and bounded:

1. Store the response in the approved restricted destination.
2. Calculate only the defined low-signal flags and completion metadata.
3. Separate routine support flags from confidential safety/trust flags.
4. Create one routine follow-up item per response when follow-up is requested.
5. Deduplicate using a platform response ID or approved event ID.
6. Notify only the assigned operational owner for routine issues.
7. Route confidential concerns to the approved confidential process without copying raw responses into ordinary channels.
8. Record delivery or processing status without storing passwords, tokens, or unnecessary personal data.
9. Provide a manual review queue for uncertain or failed routing.
10. Reconcile failed events and close the loop with the volunteer when appropriate.

**Suggested internal status values:**

| Status | Meaning |
|---|---|
| `received` | Response stored in the approved destination. |
| `routine_review` | A non-confidential support signal requires owner review. |
| `confidential_routed` | A safety/trust concern was routed to the designated process. |
| `follow_up_requested` | Volunteer requested ordinary contact. |
| `owner_assigned` | Authorized owner accepted the routine action. |
| `resolved` | The action was completed and verified. |
| `monitoring` | More evidence is needed; no conclusion is made. |
| `failed_review` | Processing failed or the response requires manual handling. |

---

## 7. Data Dictionary for Export or Integration

| Field | Type | Required | Allowed values / guidance |
|---|---|---:|---|
| `response_id` | String | Yes | Platform-generated unique response ID; do not expose publicly. |
| `checkpoint` | Enum | Yes | `day_3_5`, `day_14`, `day_28`, `event_based`. |
| `pathway` | Enum | No | Approved HMSI pathway or `prefer_not_to_say`. |
| `participation_mode` | Enum | No | `remote`, `field`, `mixed`, `not_started`, `prefer_not_to_say`. |
| `clarity_score` | Integer/enum | No | `1`–`5` or `na`; do not convert `na` to `0`. |
| `capacity_score` | Integer/enum | No | `1`–`5` or `na`. |
| `connection_score` | Integer/enum | No | `1`–`5` or `na`. |
| `confidence_score` | Integer/enum | No | `1`–`5` or `na`. |
| `safety_respect_score` | Integer/enum | No | `1`–`5` or `na`; access is restricted. |
| `blocker_categories` | Array | No | Approved non-sensitive categories only. |
| `participation_preference` | Enum | No | `no_change`, `smaller_or_different_task`, `short_pause`, `discuss_options`, `prefer_not_to_say`. |
| `follow_up_preference` | Enum | No | `none`, `routine`, `confidential`, `help_finding_route`. |
| `contact_method` | String | No | Collect only when routine follow-up is requested and approved. |
| `confidential_flag` | Boolean/status | Yes | Store route/status with restricted access; do not expose narrative. |
| `safe_summary` | String | No | Only non-sensitive summary; prefer separate restricted handling. |
| `submitted_at` | UTC timestamp | Yes | Platform-generated timestamp. |
| `processing_status` | Enum | Yes | Use the internal status values above. |
| `owner_id` | String | No | Authorized routine owner only. |
| `resolved_at` | UTC timestamp | No | Set after verified resolution. |

---

## 8. Team-Lead Review View

The routine review view should show aggregate counts and minimal operational context, not a raw answer dump.

| Review item | Current period | Prior period | Action / owner |
|---|---:|---:|---|
| Responses received | [N] | [N] | [Context] |
| Response coverage | [N/N = %] | [N/N = %] | [Limitation] |
| Low clarity signals | [N] | [N] | [Owner/action] |
| Low capacity signals | [N] | [N] | [Owner/action] |
| Low connection signals | [N] | [N] | [Owner/action] |
| Low confidence signals | [N] | [N] | [Owner/action] |
| Open routine support items | [N] | [N] | [Oldest age/owner] |
| Pause or reduced-participation requests | [N] | [N] | [Non-punitive context] |
| Confidential route status | [Handled separately] | [Handled separately] | [Authorized lead only] |
| Processing failures | [N] | [N] | [Manual review owner] |

Do not report small cohorts, distinctive comments, or individual scores in executive or team-wide materials. If there is insufficient response coverage, label the result **insufficient evidence** and avoid setting a retention target from it.

---

## 9. Launch Checklist

### Before publishing

- [ ] HMSI owner and platform account confirmed.
- [ ] Approved restricted response destination confirmed.
- [ ] Confidential safeguarding, privacy, security, harassment, and wellbeing routes confirmed.
- [ ] Five question wording approved without changing the scale or meaning.
- [ ] N/A handling tested and kept distinct from zero.
- [ ] Branching tested with safe fixtures for routine, pause, and confidential paths.
- [ ] No file uploads, passwords, tokens, private beneficiary data, or sensitive case details requested.
- [ ] Follow-up contact is optional and shown only when requested.
- [ ] Reminder language is neutral and non-pressuring.
- [ ] Retention, access, export, and deletion rules approved.
- [ ] Manual fallback and failed-processing review owner confirmed.

### After launch

- [ ] Send the form at the approved checkpoint.
- [ ] Monitor response processing without exposing raw answers.
- [ ] Review routine triggers within the approved service level.
- [ ] Route confidential concerns immediately through the approved process.
- [ ] Record aggregate themes and action owners.
- [ ] Reconcile failed or duplicate events.
- [ ] Send a privacy-preserving “what we heard and what we are changing” update.
- [ ] Review the form after the first month and adjust only through an approved version change.

---

## 10. Final Completion Message

> Thank you for helping HMSI improve how we welcome, support, and work alongside volunteers. **Help Meet** means walking alongside people. **Shine** means helping potential and contribution become visible. **Initiative** means turning that commitment into organized, accountable, and safe action.
