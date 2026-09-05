# HMSI Communication Template Privacy and Safeguarding Audit Checklist
## Rapid Operations Review

**Audience:** HMSI operations, communications, editorial, privacy, safeguarding, security, and administrative teams  
**Use for:** Email, SMS, WhatsApp, portal notifications, Slack messages, incident updates, donor acknowledgements, worker notices, and public-facing templates  
**Review objective:** Confirm that a template can be used without exposing unnecessary personal information, confidential safeguarding details, security-sensitive information, or an unapproved communication route

> **Stop-send rule:** If any critical gate fails or the reviewer cannot establish the intended recipient, channel, purpose, or safeguarding boundary, do not send the message. Escalate before release.

---

## 1. Rapid review record

| Field | Entry |
|---|---|
| Template name and version |  |
| Event or purpose |  |
| Channel |  |
| Intended audience |  |
| Sender identity |  |
| Reviewer |  |
| Privacy reviewer, if required |  |
| Safeguarding reviewer, if required |  |
| Review date and UTC time |  |
| Related change, incident, or ticket |  |
| Decision | Approve / Approve with conditions / Revise / Stop-send |

---

## 2. Five-minute stop-send screen

Complete this screen before reviewing wording in detail.

| Critical question | Yes | No | Action if No |
|---|:---:|:---:|---|
| Is the sender an approved HMSI identity for this message type? | [ ] | [ ] | Stop and confirm sender authorization |
| Is the recipient group known, necessary, and correctly scoped? | [ ] | [ ] | Stop and verify the recipient list |
| Is the channel approved for the information category? | [ ] | [ ] | Stop and route through the approved channel |
| Does the message avoid safeguarding or confidential case detail? | [ ] | [ ] | Stop and use the confidential route |
| Does the message avoid unnecessary personal information? | [ ] | [ ] | Minimize or redact before sending |
| Are links, attachments, and deep links safe and access-controlled? | [ ] | [ ] | Stop and verify destination and authorization |
| Is the template version current and approved? | [ ] | [ ] | Stop and locate the current approved version |
| Is the action reversible or containable if misdirected? | [ ] | [ ] | Obtain additional approval before sending |

If any answer is **No**, the template is not ready for release.

---

## 3. Purpose and audience checks

The reviewer should be able to state, in one sentence, why the message exists and who needs it. The message must contain only the information needed for that purpose. Do not send broad operational announcements when a restricted message to a named role is sufficient.

| Check | Complete |
|---|:---:|
| The business or safeguarding purpose is documented | [ ] |
| The audience is limited to people who need the message | [ ] |
| The template does not rely on hidden or assumed consent | [ ] |
| The message does not combine unrelated purposes or datasets | [ ] |
| The template identifies when a separate confidential route must be used | [ ] |
| The message is understandable without revealing extra personal context | [ ] |

**Stop-send examples:** A volunteer-wide email includes a named person’s performance issue; an incident message includes a case narrative; a contributor notice includes another contributor’s contact information; a public update contains an internal review status.

---

## 4. Personal-data minimization

Inspect the subject, preheader, body, footer, merge fields, attachments, URLs, tracking parameters, reply-to address, and template metadata. Check both the visible message and the values that the system may insert at send time.

| Data element | Allowed treatment |
|---|---|
| Name | Use only when necessary for the recipient’s individual action; avoid in broad messages |
| Email address or phone number | Use for routing, never expose another recipient’s address or number |
| HMSI ID | Include only when needed for secure account identification; do not use as a public identifier |
| Assignment or task details | Include only for the assigned recipient or approved operational group |
| Donation details | Include only the verified receipt or acknowledgement data required for the donor |
| Location | Use the least precise location needed; avoid exact coordinates in ordinary messages |
| Feedback or survey content | Use aggregate patterns in broad communications; keep raw responses restricted |
| Free-text notes | Exclude unless reviewed; never insert raw safeguarding or case notes |
| Authentication links | Use time-limited, single-purpose, approved links; never include tokens in visible logs |

### Personal-data checklist

| Check | Complete |
|---|:---:|
| No unnecessary names, IDs, phone numbers, or email addresses appear | [ ] |
| No recipient list is exposed through `To` or `Cc` when `Bcc` or individual delivery is required | [ ] |
| Merge fields have fallback behavior that does not disclose data | [ ] |
| Empty or malformed fields do not reveal internal values or template syntax | [ ] |
| Tracking parameters do not contain names, emails, IDs, or case references | [ ] |
| The message does not reveal role eligibility, account existence, or private status to an unintended recipient | [ ] |
| Attachments are necessary, access-controlled, and reviewed | [ ] |

---

## 5. Safeguarding and confidential-routing checks

Safeguarding information must remain separate from ordinary communications. If a message concerns abuse, exploitation, violence, threats, a vulnerable person, a protection concern, or a confidential referral, the reviewer must confirm that the approved safeguarding route is used.

| Question | Complete |
|---|:---:|
| Does the message avoid identifying a protected person unnecessarily? | [ ] |
| Does it avoid describing the incident in a broad channel? | [ ] |
| Does it avoid asking recipients to reply with confidential details? | [ ] |
| Does it direct the recipient to the approved confidential route? | [ ] |
| Are safeguarding recipients limited to designated roles? | [ ] |
| Are attachments and links stored in the approved restricted location? | [ ] |
| Has the safeguarding lead reviewed the template where required? | [ ] |

**Stop-send conditions:** The message includes a protection narrative, exact location of a vulnerable person, allegation details, an image of a protected person, or a request to discuss a case in ordinary email, Slack, WhatsApp, or a public form.

Recommended routing language is: “Please use the designated confidential safeguarding route for case details. Do not reply with sensitive information in this channel.”

---

## 6. Sender, recipient, and channel validation

A compliant message can still cause harm if it is sent from the wrong identity or to the wrong audience. Confirm the sender identity, reply-to address, recipient source, suppression list, and delivery channel.

| Check | Complete |
|---|:---:|
| Sender address is an approved HMSI identity for the event | [ ] |
| Reply-to address routes to an approved monitored mailbox | [ ] |
| Recipient source is documented and current | [ ] |
| Test recipients are synthetic or internal and clearly labelled | [ ] |
| Opt-out or suppression requirements are respected where applicable | [ ] |
| Internal-only content cannot be routed to public or external recipients | [ ] |
| The channel is appropriate for the data classification | [ ] |
| The template does not silently add broad recipients through a default list | [ ] |
| Delivery failure and bounce handling do not expose personal information | [ ] |

---

## 7. Links, attachments, and action buttons

Every link should be opened or inspected in a safe test context. Confirm that it reaches the intended HMSI route, uses HTTPS, does not contain sensitive query parameters, and applies authorization at the destination.

| Check | Complete |
|---|:---:|
| Link destination is an approved HMSI route or reviewed provider | [ ] |
| Link uses HTTPS | [ ] |
| URL does not include raw email, phone, case details, or unnecessary IDs | [ ] |
| One-time or reset links are time-limited and single-purpose | [ ] |
| Deep links require the recipient’s authenticated session where appropriate | [ ] |
| A recipient cannot use the link to view another person’s record | [ ] |
| Attachments use the approved storage and access policy | [ ] |
| Heavy media links do not expose unrestricted personal folders | [ ] |
| Expired or unauthorized links show a safe error state | [ ] |

Do not paste live reset tokens, service credentials, or private media URLs into test notes, screenshots, Slack, or email.

---

## 8. Wording and incident-language review

The template should distinguish confirmed facts from assumptions. It should avoid blame, speculation, unnecessary urgency, and promises that the organisation cannot support. For incidents, use bounded descriptions until the investigation is complete.

| Wording check | Complete |
|---|:---:|
| Claims are limited to confirmed facts | [ ] |
| Unknowns are clearly labelled as under review | [ ] |
| The message does not call an alert a false positive before verification | [ ] |
| The message does not promise deletion when content was only archived or restricted | [ ] |
| The message does not disclose internal architecture or security controls | [ ] |
| The message does not include unsupported legal conclusions | [ ] |
| The tone is respectful and does not blame an individual | [ ] |
| Urgency language is proportionate and does not pressure recipients to bypass safeguards | [ ] |
| “Dear Mr. President,” is used at the opening of automated internal alerts intended for the president | [ ] |

---

## 9. Template-specific checks

| Template type | Additional checks |
|---|---|
| Password reset | Link is time-limited; no password or token is included in logs; sender is the approved authentication identity; account existence is not disclosed |
| Worker welcome or assignment | Recipient is the assigned worker; HMSI ID and task data are correct; access link is role-limited; no other workers are exposed |
| Admin or presidential alert | Event summary is bounded; sensitive records are referenced by opaque audit ID; the body opens with the approved professional greeting where required |
| Donation acknowledgement | Amount and reference are from a verified transaction; no card data appears; donor details are limited to the recipient; sender identity is approved |
| Revision request | Feedback is specific and respectful; no other contributor’s data is included; safeguarding concerns use the confidential route |
| Public news announcement | Article is explicitly `published`; no draft, approved-only, archived, or restricted content is referenced; images and links are approved |
| Incident update | Severity and status are accurate; recipients are restricted; technical and personal details are minimized |
| Volunteer or recruitment notice | Role information is accurate; no private applicant information is included; links lead to the approved public or portal route |

---

## 10. Approval and release decision

The reviewer should select one of the following outcomes.

| Decision | Meaning |
|---|---|
| **Approved** | Template passes all required checks and may be used within its defined scope |
| **Approved with conditions** | Template may be used only with documented restrictions, such as a named recipient group or manual review |
| **Revise** | Template has correctable issues and must not be sent until updated and re-reviewed |
| **Stop-send** | Template presents material privacy, safeguarding, security, authorization, or routing risk |

Critical templates should receive independent review from privacy, safeguarding, security, or editorial owners as appropriate. The person who requests an emergency message should not be the only person approving a high-risk template.

---

## 11. Evidence to retain

Retain the template version, reviewer decision, date, scope, required approvals, test-render evidence, link-validation result, recipient-scope confirmation, and any exception record. Store evidence in the approved internal system. Do not retain unnecessary copies of personal data or confidential safeguarding content.

For a failed review, record the bounded reason code, such as `unapproved_sender`, `recipient_scope_unclear`, `safeguarding_route_missing`, `unnecessary_personal_data`, `unsafe_link`, `unsupported_claim`, or `sensitive_attachment`.

---

## 12. Periodic review triggers

Re-review a template when the sender identity changes, the recipient source changes, a new merge field is introduced, the channel changes, a link or provider changes, the privacy or safeguarding policy changes, an incident occurs, or the template has not been reviewed within the approved review period.

Templates associated with password resets, safeguarding, incident response, donor data, or public publication should receive more frequent review than low-risk general announcements.

---

## 13. Final sign-off

| Sign-off | Name/role | Date and UTC time | Signature or approval reference |
|---|---|---|---|
| Operations reviewer |  |  |  |
| Communications/editorial reviewer |  |  |  |
| Privacy reviewer, if required |  |  |  |
| Safeguarding reviewer, if required |  |  |  |
| Security reviewer, if required |  |  |  |
| Accountable owner |  |  |  |

> **Final reminder:** If the intended recipient, channel, public/private status, or safeguarding route is uncertain, do not send. Pause the workflow and escalate with the minimum information needed to obtain a safe decision.
