# HMSI Emergency Content Restoration
## Administrator Runbook for Edge Cases and Conflict Rejections

**Audience:** Named HMSI administrators, editorial leads, safeguarding leads, privacy/data-governance owners, and technical responders  
**Applies to:** Archived news articles and other approved editorial records restored during an urgent communications need  
**Operating principle:** Restore to private review first; publish only through a separate, explicit administrator decision  
**Document owner:** HMSI Editorial and Portal Administration  
**Status:** Operational runbook draft for approval

> **Safety boundary:** An emergency does not remove the publication boundary. The emergency path may accelerate review and coordination, but it must not bypass administrator authorization, safeguarding review, privacy checks, or the audit trail.

---

## 1. Purpose and scope

This runbook explains how administrators should respond when an archived article is urgently needed for renewed editorial consideration, when a restoration request is rejected because the record has changed, or when a restoration is blocked by privacy, safeguarding, retention, or technical controls.

The runbook covers the path from an emergency restoration request through preflight, restoration to private review, fresh editorial review, optional publication, public verification, and post-event reporting. It also defines what to do when a record cannot be restored safely.

The runbook does **not** authorize direct database edits, direct publication of archived content, deletion of protected records, or bypassing confidential safeguarding and privacy routes.

---

## 2. State model

An archived article is not a public article. Restoration moves the record into a private editorial state. Publication is a later action.

| State | Meaning | Publicly visible? | Emergency administrator action |
|---|---|---:|---|
| `archived` | Retained outside active public handling | No | Eligible for preflight only |
| `draft` | Private editorial work in progress | No | Safe restoration target |
| `pending_editorial_review` | Awaiting editorial review | No | Use where the deployed workflow supports it |
| `approved` | Internally approved but not released | No | Must not be treated as public |
| `published` | Explicitly released by an authorized administrator | Yes | Requires a separate publication action |
| `rejected` | Not accepted for public release | No | Do not restore without a documented new case |
| `hold` or restricted state | Protected by privacy, safeguarding, legal, or operational controls | No | Stop and escalate |

The required emergency path is:

```text
archived
  -> preflight
  -> draft or pending_editorial_review
  -> fresh review
  -> approved, if applicable
  -> explicit administrator publication
  -> published
```

The prohibited shortcut is:

```text
archived -> published
```

---

## 3. Roles and separation of duties

Emergency restoration should use at least two people whenever practicable: one administrator or editorial operator to coordinate the restoration and a second reviewer for content, privacy, and safeguarding checks.

| Role | Responsibility | Cannot do alone |
|---|---|---|
| Restoration operator | Starts preflight, records reason, submits restoration request, verifies result | Directly publish an archived article without fresh review |
| Editorial reviewer | Reviews headline, body, source, image, category, attribution, and current relevance | Override privacy or safeguarding blockers |
| Privacy/data-governance reviewer | Assesses personal-data exposure, correction requests, retention restrictions, and suppression | Publish without editorial approval |
| Safeguarding lead | Assesses protection concerns and confidential information | Convert a safeguarding concern into public editorial content |
| Publishing administrator | Makes the final publication decision and records it | Publish when a blocking hold or unresolved exception exists |
| Technical responder | Investigates state conflicts, schema failures, audit failures, and provider errors | Approve content or waive policy gates |
| Management incident owner | Authorizes emergency prioritization and accepts residual operational risk | Bypass mandatory legal, privacy, or safeguarding restrictions |

The same person should not request, approve, and execute a high-risk restoration or publication action. Where staffing is limited, the exception must be documented and retrospectively reviewed.

---

## 4. When emergency restoration is appropriate

An emergency restoration request may be appropriate when an archived article contains time-sensitive context that management believes should be reconsidered, such as a current public-service update, an urgent programme clarification, or historical context needed for an active response.

Urgency alone is not sufficient. The administrator must identify why the article is needed now, what has changed since it was archived, who requested the restoration, and what public harm could result from delay. The request should be declined or redirected when the real need is for a new article, a corrected article, or a confidential incident response.

The emergency restoration path is not appropriate for exposing personal information, publishing unverified allegations, bypassing a correction request, reopening a safeguarding case, or recovering content solely because the public feed is empty.

---

## 5. Preflight procedure

### Step 1: Record the request

Create or locate an operational request containing the article ID, article title, requester, urgency, reason, desired audience, required time, and named restoration operator. Use a correlation ID that does not contain a person’s name, email, phone number, or other direct identifier.

### Step 2: Verify administrator identity

Confirm that the operator is authenticated as a named HMSI administrator. Do not rely on a client-supplied role, a copied approval value, or a screenshot of a permission setting. The server-side route must derive the actor from the authenticated session.

### Step 3: Confirm the source state

Read the current record and confirm that its status is exactly `archived`. If the record is already `draft`, `pending_editorial_review`, `approved`, `published`, `rejected`, or in a protected state, stop the archive-restoration procedure and use the workflow appropriate to that state.

### Step 4: Check blockers

Check the article for active privacy requests, correction requests, safeguarding flags, legal or operational holds, security incidents, unresolved source-verification issues, media-rights concerns, and restricted classifications. A blocker must be escalated; it must not be overridden because the request is urgent.

### Step 5: Check content freshness

Compare the archive timestamp, original publication timestamp, source information, location references, image, external links, and claims with current information. An archived article should be treated as stale until reassessed.

### Step 6: Obtain independent review

Assign a second reviewer. The second reviewer should confirm the scope of the restoration, identify new risks, and state whether the article should proceed to private review. The reviewer’s identity and decision must be recorded.

### Step 7: Confirm the target state

The only permitted restoration target is `draft` or the deployed private editorial-review state. If the interface or API offers `published` as a restoration target, stop and report a control defect.

---

## 6. Restoration procedure

Use the protected restoration route when available. The request must include the article ID, explicit confirmation, reason, and correlation ID. The client must not supply the actor identity, reviewer identity, publication timestamp, or arbitrary target status.

The expected successful result is:

```json
{
  "ok": true,
  "from": "archived",
  "to": "draft",
  "public": false,
  "reversible": true
}
```

After a successful restoration, confirm all of the following:

| Check | Expected result |
|---|---|
| Article status | `draft` or private review status |
| Public list | Article absent |
| Public ticker | Article absent |
| Public detail route | Article unavailable or returns the public not-found/private response |
| Archive metadata | Cleared or preserved according to the approved schema policy |
| Historical archive event | Preserved |
| Restoration event | Present with actor, reason, timestamp, and correlation ID |
| Publication metadata | Not newly set by restoration |

A restoration event should use a dedicated action such as `restored_to_private_review`. If the audit schema does not support that action, do not silently label the event as `published`; obtain the migration or approved compatibility path first.

---

## 7. Fresh editorial review and emergency publication

Restoration does not approve an article. The reviewer must re-evaluate the content as if it were a new submission. Confirm the headline, summary, body, category, attribution, image, links, dates, claims, and public audience.

If corrections are needed, save the article as draft or request revisions. If the item is unsuitable, reject or re-archive it with a reason. If it passes review, an authorized publishing administrator may use the normal `Approve & Publish` action.

Publication requires a separate explicit confirmation and must set the current approval and publication metadata. A primary image is required. The publication event must identify the administrator, article, prior state, target state, timestamp, and correlation ID.

Immediately after publication, verify the exact article URL, the public news feed, the homepage ticker, the displayed image, and the excerpt. If any public surface shows a different article or stale content, unpublish or archive through the protected workflow and open a technical incident.

---

## 8. Conflict rejection matrix

A conflict rejection is a safety result. It means the system refused to assume that the administrator’s view was still current or that the requested action was safe.

| Rejection or error | Meaning | Administrator response | Do not do |
|---|---|---|---|
| `article_must_be_archived` | The record changed state before restoration | Re-read the current state and transfer to the correct workflow | Retry blindly |
| `restore_conflict` | Concurrent update prevented the conditional change | Open the record again, compare audit events, and ask technical support if unclear | Force an overwrite |
| `explicit_confirmation_required` | Confirmation token was absent or incorrect | Restart from the protected UI and confirm the intended action | Guess or reuse another token |
| `restoration_reason_required` | The request lacks a meaningful reason | Add a concise operational reason and resubmit | Use a generic or misleading reason |
| `admin_authentication_required` | Actor is not an authorized administrator | Escalate to a named administrator | Ask a contributor to bypass the control |
| `protected_record_gate` | Hold, privacy request, incident, or correction is active | Contact the relevant privacy, safeguarding, or incident owner | Override locally |
| `restricted_record_class` | Content is restricted or confidential | Use the confidential route or approved restricted workflow | Publish a redacted copy without review |
| `primary_image_required` | Publication quality gate failed | Add and review an approved primary image | Use an unrelated fallback image |
| `audit_write_failed` | The decision cannot be reliably recorded | Stop the workflow and contact engineering | Publish without an audit event |
| `provider_timeout` or unknown result | The system cannot confirm the provider state | Reconcile using IDs and audit evidence before retrying | Repeat a destructive or public action immediately |

### Handling a stale-state rejection

When the record is no longer archived, first capture the rejection event and correlation ID. Then read the current record and recent audit events. If the record is already in private review, continue through fresh review. If it is published, verify that publication was authorized and current. If it is rejected, held, or restricted, escalate rather than restoring it.

When the current state cannot be established, treat the record as blocked. The absence of a reliable read is not evidence that restoration succeeded.

### Handling duplicate requests

If the same restoration request is delivered twice, the system should return an idempotent result and must not create a second state mutation. Confirm that there is one restoration update and one primary restoration event, with any replay represented separately. Do not interpret a replay response as a new approval or publication.

---

## 9. Edge-case procedures

### The article’s image is missing or inaccessible

Keep the article private. Ask the editorial or communications owner to provide a verified replacement or decide that the article should not be republished. Do not copy an image from an unrelated story and do not use a media link that has not been checked for access and rights.

### The article contains personal or confidential information

Stop the restoration and notify the privacy or safeguarding owner through the confidential route. Do not paste the sensitive text into Slack, email, an ordinary incident ticket, or an alert channel. The article should remain archived or restricted until the issue is resolved.

### The original source is no longer verifiable

Treat the article as stale. Request a new source check or prepare a new article with current information. Historical publication does not constitute current verification.

### A correction request is open

Do not restore or publish the article until the correction owner confirms the request is resolved or documents why a controlled review may proceed. Preserve the correction history.

### A legal, operational, or retention hold exists

Stop. The hold owner must decide whether the article can be reviewed, copied into a new controlled record, or kept restricted. The restoration operator must not release or delete held content.

### An emergency requires a public update immediately

Prepare a new, concise, current update through the normal administrator editorial route. Do not use emergency urgency to publish an unreviewed archived record. If management approves an accelerated review, record the incident or priority reference and retain the normal publication gates.

### The public feed remains empty after restoration

This is expected while the record is in `draft` or private review. Do not interpret the empty state as a failed restoration. The article becomes public only after a separate explicit publication action.

### A restored article appears publicly before publication

Treat this as a severity-one publication-boundary incident. Immediately preserve the article ID, timestamps, public URL, request correlation ID, and relevant audit events. Ask the technical responder to disable the affected route or revert the record to a private state through an approved emergency procedure. Do not conceal the event by deleting audit evidence.

---

## 10. Escalation path

| Condition | Initial owner | Escalate to | Target response |
|---|---|---|---|
| Content quality or factual uncertainty | Editorial reviewer | Editorial lead | Before publication |
| Personal-data concern | Privacy/data-governance owner | Management/privacy counsel | Before restoration or publication |
| Safeguarding concern | Safeguarding lead | Designated safeguarding management | Immediately |
| State conflict or audit failure | Technical responder | Engineering lead | Before retry |
| Unauthorized action attempt | Portal/security administrator | Security and management | Same working period; immediately if repeated |
| Public exposure of private content | Technical responder | Incident owner and management | Immediate containment |
| Unknown provider result | Retention/technical operator | Engineering lead | Reconcile before any repeat action |

Emergency escalation should use the minimum information needed to coordinate. Do not distribute article bodies, personal information, or confidential case details to broad channels.

---

## 11. Evidence and audit requirements

Every emergency restoration must leave enough evidence to reconstruct the decision without exposing unnecessary personal information. Required fields include the article ID, source state, target state, actor, independent reviewer, reason code, free-text reason where necessary, correlation ID, request time, decision time, result, rejection code if applicable, and audit-event identifiers.

The audit record should not contain passwords, session tokens, raw safeguarding narratives, full donor or volunteer records, or unnecessary copies of article bodies. Store sensitive supporting material only in the approved restricted system.

At the end of the event, the restoration operator should attach the verification result, the publication decision if one occurred, the names of responsible roles, unresolved issues, and the management owner for follow-up.

---

## 12. Post-restoration checklist

| Checklist item | Complete |
|---|:---:|
| Emergency reason and correlation ID recorded | [ ] |
| Administrator identity verified server-side | [ ] |
| Source state confirmed as `archived` | [ ] |
| Privacy, safeguarding, hold, correction, and incident checks completed | [ ] |
| Independent reviewer assigned | [ ] |
| Restoration target confirmed as private review | [ ] |
| Restoration event written successfully | [ ] |
| Public list, ticker, and detail route verified private | [ ] |
| Fresh editorial review completed | [ ] |
| Primary image verified | [ ] |
| Separate publication decision recorded, if applicable | [ ] |
| Public article URL and image verified after publication | [ ] |
| Any conflict, rejection, or exception escalated | [ ] |
| Post-event record and management follow-up completed | [ ] |

---

## 13. Administrator quick reference

> **If archived:** restore only to private review.  
> **If conflicted:** stop, re-read, and follow the current state.  
> **If held or restricted:** escalate; do not override.  
> **If audit fails:** stop; do not publish without evidence.  
> **If urgent:** accelerate review, never bypass it.  
> **If public too early:** contain immediately and preserve evidence.

The correct emergency outcome is not always publication. A safe refusal, a new current article, or a confidential escalation may be the correct result.

## 14. Required engineering follow-up

Engineering should provide a protected restore endpoint that accepts only an archived article ID, explicit confirmation, reason, and correlation ID. The endpoint should derive the actor from the authenticated session, permit only `archived → draft` or `archived → pending_editorial_review`, emit a dedicated restoration event, and use a conditional state update to reject concurrent changes.

The endpoint should include automated tests proving that an archived article cannot become public during restoration, that an unauthorized actor cannot restore it, that protected records remain blocked, that duplicate requests are idempotent, and that public queries remain published-only until a separate publication action succeeds.
