# HMSI CRM Retention and Suppression Configuration Runbook

**Purpose:** Translate the HMSI Data Governance and Volunteer Privacy Compliance Policy and the Typeform/CRM Retention Data Pipeline Specification into concrete CRM configuration steps.

**Status:** Implementation-ready, CRM-agnostic runbook. Product-specific labels and automation syntax must be mapped to the selected CRM before production activation.

> **Important:** This runbook is a technical implementation guide, not formal legal advice. Confirm the retention schedule, applicable rights process, controller/processor position, transfer arrangements, and any NDPC obligations with HMSI’s qualified privacy adviser before enabling production deletion or external exports.

## 1. Control model to implement

The CRM must be treated as an operational source system, not as the public analytics dashboard. It may hold identifiable volunteer records needed for coordination, support, eligibility, and reconciliation. The dashboard pipeline must receive only approved, privacy-safe fields and must not query unrestricted CRM records directly.

The default design has four layers:

| Layer | CRM or connected-system purpose | Permitted content |
|---|---|---|
| Operational record | Coordinate a volunteer or worker relationship | Approved identity, role, pathway, status, support metadata, and task references |
| Restricted support record | Manage an individual support request | Minimal routing status and timestamps; narratives remain in the confidential system |
| Retention-control metadata | Decide review, archive, anonymisation, and deletion eligibility | Dates, holds, suppression flags, reason codes, owner, and audit references |
| Aggregate export | Feed the retention dashboard | Coded categories, bounded timestamps, cohort fields, numerators, denominators, and quality states; no direct identifiers or raw free text |

The CRM must never use volunteer feedback as a hidden score. Individual responses must not automatically rank, punish, exclude, or deny opportunities. Suppression is a privacy protection, not a performance status.

## 2. Create the minimum field set

Create fields with stable internal names, descriptions, allowed values, sensitivity classifications, and owners. Do not create free-form fields where a controlled value or timestamp is sufficient.

### 2.1 Person and relationship fields

| Display label | Stable field name | Type | Required | Classification | Configuration |
|---|---|---|:---:|---|---|
| HMSI person reference | `hmsi_person_ref` | Text or UUID | Yes | Confidential | Non-guessable internal identifier; never expose in aggregate exports |
| Volunteer pathway | `pathway_group` | Controlled choice | Yes | Internal | Allowlist approved pathways; unmapped values go to review |
| Team group | `team_group` | Controlled choice | Conditional | Internal | Use broad groups; avoid precise location unless operationally necessary |
| Role | `role_group` | Controlled choice | Yes | Internal | Worker, volunteer, member, publisher, activist, reporter, staff, or approved equivalent |
| Participation status | `participation_status` | Controlled choice | Yes | Internal | Prospective, active, paused, former, withdrawn, or under review |
| Active period start | `active_period_start` | Date | Conditional | Internal | Used for eligibility denominators only |
| Active period end | `active_period_end` | Date | Conditional | Internal | Required when participation ends or is paused indefinitely |
| Last operational contact | `last_operational_contact_at` | UTC timestamp | No | Internal | Used for lifecycle review, not as a commitment score |

### 2.2 Feedback and support fields

Store feedback as a separate object or related record instead of adding every response to the person record. This limits access and supports retention by record class.

| Display label | Stable field name | Type | Classification | Configuration |
|---|---|---|---|---|
| Feedback record reference | `feedback_ref` | UUID | Confidential | Non-guessable and separate from public IDs |
| Source response reference | `source_response_ref` | Token or hash | Confidential | Store only if approved for reconciliation; never export to dashboard |
| Form version | `form_version` | Controlled text | Internal | Required for trend comparability |
| Submitted at | `submitted_at` | UTC timestamp | Confidential | Preserve source time separately from receipt and processing time |
| Support classification | `support_classification` | Controlled choice | Confidential | `routine_support`, `pause_request`, `access_issue`, `messaging_concern`, `confidential_route`, `uncertain`, `none` |
| Follow-up requested | `follow_up_requested` | Boolean | Confidential | Drives support routing only; not a performance signal |
| Acknowledged at | `support_acknowledged_at` | UTC timestamp | Confidential | Used for bounded service-level metrics |
| Coded coaching theme | `coaching_theme` | Controlled choice | Confidential | Populate only through approved coding or reviewed human classification |
| Free-text present | `free_text_present` | Boolean | Confidential | Do not store raw narrative in the ordinary CRM object unless specifically approved |
| Restricted-route status | `restricted_route_status` | Controlled choice | Restricted | `not_referred`, `referred`, `acknowledged`, `closed`, `restricted_review` |

If raw free text must be temporarily received, place it in a restricted object or quarantine store with a short retention period. Configure the ordinary CRM user interface, exports, API views, and notifications not to display it.

### 2.3 Retention and privacy-control fields

These fields are essential for deterministic automation. They must be system-managed wherever possible so ordinary users cannot alter them casually.

| Display label | Stable field name | Type | Purpose |
|---|---|---|---|
| Record class | `record_class` | Controlled choice | Identifies person, feedback, support, export, audit, or other retention class |
| Retention review date | `retention_review_at` | UTC timestamp | First date on which the record is eligible for review |
| Planned disposal date | `disposal_due_at` | UTC timestamp | Date for deletion or anonymisation if no hold applies |
| Retention state | `retention_state` | Controlled choice | `active`, `review_due`, `hold`, `anonymise_due`, `delete_due`, `deleted`, `anonymised`, `exception` |
| Legal or operational hold | `retention_hold` | Boolean | Prevents automated disposal while true |
| Hold reason | `retention_hold_reason` | Controlled choice/text | Minimum explanation; do not copy case narratives |
| Hold owner | `retention_hold_owner` | User/reference | Named accountable owner |
| Hold expiry/review | `retention_hold_review_at` | UTC timestamp | Prevents indefinite holds without review |
| Privacy suppression | `privacy_suppressed` | Boolean | Prevents use in aggregate/export output when identity or sensitivity risk exists |
| Suppression reason | `suppression_reason` | Controlled choice | `small_cell`, `confidential_route`, `unresolved_identity`, `sensitive_content`, `quality_failure`, `manual_privacy_review` |
| Suppression reviewed at | `suppression_reviewed_at` | UTC timestamp | Reassessment evidence |
| Suppression reviewer | `suppression_reviewer` | User/reference | Named reviewer |
| Export eligibility | `aggregate_export_eligible` | Boolean | Derived by controlled automation; never manually overridden without audit |
| Last export run | `last_export_run_id` | Text | Traceability to the aggregate pipeline |
| Deletion/anonymisation event | `disposal_event_ref` | Text/UUID | Link to immutable audit evidence |

### 2.4 Do not add these fields to ordinary CRM records

The CRM configuration must reject or quarantine passwords, access tokens, identity-document images, payment-card data, confidential safeguarding narratives, medical details, precise sensitive locations, allegations, and unrestricted beneficiary case notes. If operationally necessary, these belong in a separately authorised system with named-role access and its own retention schedule.

## 3. Configure controlled values and validation rules

Create allowlists for every field used in joins, filters, automation, or reporting. A new value must not silently enter production analytics. Unknown values should set `data_quality_state = review_required` and route to the data owner.

Apply the following validation rules:

| Rule | Expected CRM behavior |
|---|---|
| Stable references | Reject duplicate `hmsi_person_ref`, `feedback_ref`, `source_response_ref`, or `export_id` within their scope. |
| Required timestamps | Require UTC-compatible values for source receipt, submission, and retention dates where applicable. |
| Future timestamps | Reject impossible future dates beyond the approved clock-skew tolerance; flag late or corrected events rather than overwriting them. |
| Controlled status | Reject free-text alternatives to `participation_status`, `support_classification`, `retention_state`, and `action_status`. |
| Missingness | Preserve null or unknown; never convert missing values to zero, “none”, or “no concern”. |
| Free-text warning | Display a warning instructing users not to enter confidential or sensitive narratives in ordinary fields. |
| Reference integrity | A feedback record may link to an approved person token, but dashboard exports must not include the token. |
| Retention consistency | `retention_state = hold` requires `retention_hold = true`, a reason, owner, and review date. |
| Disposal consistency | `retention_state = deleted` or `anonymised` requires a disposal event reference and UTC completion timestamp. |
| Suppression consistency | `privacy_suppressed = true` requires a controlled suppression reason and reviewer or approved system rule. |

## 4. Create CRM views and permission sets

Use separate views and permission sets rather than relying only on hidden fields. Field visibility, record scope, export permissions, API permissions, and administrative privileges must be configured independently.

| Role | Allowed view | Prohibited capability |
|---|---|---|
| Volunteer coordinator | Assigned operational records and necessary role/status fields | Raw feedback narratives, restricted cases, global export, retention override |
| Team lead | Scoped team records and approved aggregate signals | Other teams’ identifiable records, confidential narratives, unrestricted CSV/API export |
| Programme director | Cross-team aggregate read model and action status | Browsing individual responses or direct identifiers without approved purpose |
| Privacy lead/DPO | Privacy metadata, request records, holds, audit evidence, and controlled source access | Unnecessary operational editing of volunteer records |
| Safeguarding lead | Named restricted-route cases and minimal operational referral status | Ordinary dashboard analytics and broad volunteer exports |
| Pipeline service account | Approved source fields, retention metadata, and export staging only | Interactive login, unrestricted CRM browsing, user management |
| CRM administrator | Configuration and support access | Using admin access for routine volunteer browsing; all support access must be logged |

Configure these technical controls:

1. Disable bulk export for ordinary users and restrict export to named roles.
2. Disable API access for roles that do not need it.
3. Separate production and test workspaces, credentials, and datasets.
4. Require named user accounts and strong authentication where available.
5. Set session timeout and reauthentication controls appropriate to the sensitivity of the system.
6. Log record reads, searches, exports, field changes, permission changes, deletion attempts, and retention-hold changes.
7. Review privileged and restricted access at least quarterly and on every role change or departure.
8. Remove access promptly when a user leaves HMSI or no longer has a need to know.

## 5. Build the retention automation

The CRM automation should be a staged process. Do not configure a single immediate-delete workflow. The safe sequence is **review → hold check → suppression check → anonymisation or deletion → audit verification**.

### 5.1 Record-class schedule

Use the following proposed defaults from the HMSI policy as configuration starting points. These are not final legal requirements and must be approved before production use.

| Record class | Review/disposal rule | Recommended CRM automation |
|---|---|---|
| Raw feedback payload | 90 days after successful normalization and reconciliation | Mark `delete_due`; verify no hold; delete/quarantine object; retain bounded audit metadata |
| CRM source export | 90 days after accepted replacement and reconciliation | Delete file and staging rows after checksum reconciliation |
| Normalized feedback | 12 months after reporting period | Anonymise or delete direct links; retain only approved aggregates |
| Aggregate read model | 24 months after publication | Review continued usefulness; remove unnecessary dimensional detail |
| Audit metadata | 24 months minimum, subject to review | Keep event class, run ID, timestamps, outcome, and bounded counts; exclude narratives |
| Support or safeguarding record | Separate approved schedule | Never inherit the ordinary analytics schedule automatically |

### 5.2 Daily retention-review job

Run the job in the CRM’s native automation engine, approved integration platform, or controlled server-side worker. It must be idempotent and produce an audit event for every batch, not necessarily one verbose log row per person.

Pseudocode:

```text
for each record where retention_state in (active, review_due, anonymise_due, delete_due):
    if retention_hold = true:
        set retention_state = hold
        create audit event: hold_skipped
        continue

    if retention_hold_review_at is past due and hold owner has not renewed it:
        create privacy task for hold owner
        do not delete automatically
        continue

    if record_class is restricted_support or safeguarding:
        route to restricted schedule
        create audit event: restricted_schedule_excluded
        continue

    if retention_state is review_due:
        verify last successful reconciliation and export run
        verify no unresolved rights request, legal hold, incident, or correction
        if checks pass:
            set retention_state = anonymise_due or delete_due according to record class
        else:
            set retention_state = exception
            create owner task

    if retention_state is anonymise_due:
        remove direct identifiers and source links
        retain only fields approved for aggregate evidence
        set retention_state = anonymised
        create disposal event reference

    if retention_state is delete_due:
        confirm downstream deletion requirements and audit-hold status
        delete the record or invoke the approved purge mechanism
        set deletion metadata in the audit ledger, not in the deleted record
```

The job must never delete records solely because they are inactive, have not replied, or have a low activity count. Inactivity may trigger a support or re-engagement workflow, but it is not a disposal decision by itself.

### 5.3 Legal and operational holds

Create a hold workflow that is more restrictive than ordinary editing. A hold requires a named owner, reason code, start time, review date, scope, and approving role. The CRM must prevent automated disposal while a valid hold exists. The job should create a reminder before the hold review date and escalate overdue holds; it must not silently extend holds forever.

Examples of potential hold categories include an open privacy request, active safeguarding or security investigation, unresolved data correction, grant or audit requirement, litigation or legal advice, or an approved incident review. The CRM should store the category and reference, not sensitive legal or safeguarding narratives.

## 6. Configure suppression at three separate points

Suppression must not depend on a dashboard filter alone. Apply it at source export, aggregate computation, and dashboard/API response.

### 6.1 Source-record suppression

Set `privacy_suppressed = true` when a record has confidential-route content, unresolved identity linkage, sensitive content, a small or identifying cohort, a quality failure, or an approved manual privacy review. Configure all standard exports and integration views to exclude suppressed records by default.

Use an explicit “privacy review” queue for exceptions. A user must not be able to remove suppression merely to make a metric populate. Removal requires an approved reviewer, reason, timestamp, and audit event.

### 6.2 Aggregate-export suppression

Create a dedicated export view containing only approved fields:

```text
reporting_period
team_group
pathway_group
signal_category
support_classification_code
coaching_theme_code
valid_observation_count
eligible_denominator_count
acknowledgement_time_band
evidence_quality
suppression_state
source_run_id
```

Exclude names, email addresses, phone numbers, HMSI IDs, response IDs, raw comments, exact timestamps where they could identify an event, precise locations, case references, and unrestricted CRM URLs.

The export view should include a row only when the record is active for the reporting period, `aggregate_export_eligible = true`, `privacy_suppressed = false`, and all required quality checks pass. The downstream pipeline must apply cell suppression again because CRM-level eligibility cannot detect every cross-filter inference risk.

### 6.3 Dashboard and API suppression

The CRM should not be the dashboard’s authorisation layer. The aggregation service must derive the viewer’s scope from their authenticated role and apply suppression server-side. A client-supplied team name, role, or filter must never grant access.

Return a suppression state such as `visible`, `suppressed`, `insufficient_data`, or `unavailable`. Never return zero when the real state is unknown or intentionally suppressed.

## 7. Configure export and integration controls

Create one named “Retention Aggregate Export” integration rather than allowing each user to build a custom export. The integration must use a service account with read-only access to the approved export view and write-only access to the restricted intake or staging destination where feasible.

Each export must include:

| Metadata | Requirement |
|---|---|
| `export_id` | Globally unique, non-guessable identifier |
| `source_system` | CRM name and environment |
| `schema_version` | Version of the approved export contract |
| `exported_at` | UTC timestamp |
| `row_count_band` | Bounded count such as 0, 1–4, 5–9, 10–24, 25+ rather than unnecessary exact detail in logs |
| `checksum` | File or payload integrity value |
| `mapping_version` | Version of the CRM-to-HMSI mapping |
| `privacy_rule_version` | Version of suppression rules used |

Require checksum validation, schema validation, duplicate-export detection, and quarantine on failure. A failed or partial export must not update the dashboard denominator or replace the previous trusted run.

Configure webhook/API integrations with:

1. HTTPS endpoints only.
2. Secret storage outside source code and ordinary logs.
3. Signature verification where the provider supports it.
4. Rate limits, body-size limits, request timeouts, and replay/idempotency controls.
5. Provider allowlists for event types and object IDs.
6. No raw payload copying into chat, email, or broad operational logs.
7. Automatic revocation or rotation when a credential is exposed or a supplier relationship ends.

## 8. Configure audit events

The CRM audit trail and the pipeline audit ledger should complement one another. The CRM records the source-system action; the pipeline records ingestion, transformation, suppression, and publication outcomes.

At minimum, capture these event classes:

| Event | Required fields |
|---|---|
| `record_created` | Record class, actor/service, timestamp, source reference hash |
| `record_updated` | Changed field classes, actor/service, timestamp, reason code |
| `export_started` | Export ID, schema version, actor/service, timestamp |
| `export_completed` | Export ID, checksum, bounded row count, result |
| `export_quarantined` | Export ID, error class, owner, timestamp |
| `suppression_applied` | Rule version, reason code, actor/service, timestamp |
| `suppression_removed` | Reviewer, reason, approval reference, timestamp |
| `hold_created` | Hold category, owner, review date, approver |
| `hold_reviewed` | Outcome, reviewer, next review date |
| `retention_reviewed` | Record class, batch/run ID, outcome |
| `anonymisation_completed` | Batch ID, fields removed, disposal reference |
| `deletion_completed` | Batch ID, count band, disposal reference, downstream result |
| `access_reviewed` | Role, scope, reviewer, timestamp, outcome |
| `rights_request_received` | Request type, requester reference, received time, owner |
| `rights_request_completed` | Outcome, systems searched, completion time, limitation reason if any |

Audit records should be immutable or append-only, time-stamped in UTC, access-restricted, and retained under the approved schedule. Do not put names, email addresses, raw comments, tokens, passwords, or case narratives into audit messages.

## 9. Build the operational queues

Configure the following queues or saved views with named owners:

| Queue | Entry condition | Owner | Required action |
|---|---|---|---|
| Data-quality review | Unknown value, missing required field, invalid date, duplicate reference | Data steward | Correct or reject; create mapping version if needed |
| Privacy review | Sensitive content, unresolved identity, possible re-identification | Privacy lead | Suppress, classify, or route confidentially |
| Retention review | `retention_review_at <= now` and no completed review | System owner | Confirm reconciliation, hold, anonymisation, or deletion path |
| Hold review | Hold review date due or overdue | Hold owner/privacy lead | Renew with reason or release after validation |
| Rights request | Volunteer asks to access, correct, restrict, object, or delete | Privacy lead | Verify, search, respond, and record outcome |
| Export exception | Checksum, schema, freshness, or row-count anomaly | Pipeline owner | Quarantine and correct; do not publish partial data |
| Restricted referral | `support_classification = confidential_route` or uncertain sensitive case | Safeguarding/privacy lead | Move narrative to restricted route; retain minimal status only |

Every queue should show only the minimum fields required to complete the action. Do not give team leads access to a privacy queue merely because they own a team.

## 10. Validation and test plan

Use synthetic records or isolated test accounts. Do not use real volunteer records for deletion, replay, suppression, or access-boundary testing.

| Test | Expected result |
|---|---|
| Record reaches review date | CRM creates a review item; no deletion occurs immediately. |
| Valid hold exists | Record moves to `hold`; deletion/anonymisation is skipped and an audit event is created. |
| Hold expires without review | Owner receives an escalation; record remains protected. |
| Restricted support record is due | Ordinary analytics deletion job excludes it and sends it to the restricted schedule. |
| Suppressed record enters export | Record is excluded from the aggregate export. |
| Suppression removal attempted by team lead | Action is denied and logged. |
| Unknown pathway value arrives | Record is quarantined or placed in data-quality review; no silent mapping occurs. |
| Duplicate CRM export arrives | It is detected by export ID and checksum; no duplicate dashboard event is created. |
| Partial export is delivered | Export is quarantined; previous trusted dashboard run remains active. |
| Small cohort is exported | Downstream suppression returns `suppressed` or `insufficient_data`, not a value. |
| Client changes team filter | Backend retains the authenticated user’s approved scope. |
| User leaves HMSI | Access is removed and subsequent CRM/API access is denied. |
| Rights request arrives | Request is logged, identity is verified proportionately, and relevant systems are searched. |
| Deletion completes | Source object and approved downstream copies are handled; bounded audit evidence remains. |
| Logs inspected | No secrets, tokens, raw free text, or unnecessary direct identifiers appear. |

## 11. Production cutover sequence

First, document the CRM product, environment, data owner, processor relationship, export capability, API limits, retention features, audit-log availability, and deletion semantics. Next, create the field dictionary, controlled values, roles, permission sets, views, queues, and automation in a non-production workspace. Load synthetic fixtures and run the full test matrix.

After privacy and leadership approval, enable read-only aggregate export before enabling any deletion job. Compare the export against expected fields, row-count bands, suppression behavior, and checksums. Run at least one complete reconciliation and aggregation cycle without publishing sensitive data. Keep the last trusted dashboard run available if the new run fails quality gates.

Enable retention review and hold workflows next. Observe them through a review-only period. Only after the review path, rights workflow, audit evidence, backup expiry, and recovery procedures are validated should HMSI enable anonymisation or deletion. Start with a bounded batch, require an owner approval, and inspect the audit result before increasing volume.

Finally, schedule recurring access reviews, privacy-rule reviews, data-dictionary reviews, supplier reviews, and deletion-job validation. Record the first production export ID, mapping version, suppression-rule version, and approval decision.

## 12. Open CRM-specific decisions

The following values cannot be safely hardcoded until the CRM and HMSI’s approved governance decisions are known:

| Decision | Required input |
|---|---|
| CRM product and edition | Product name, environment, retention and API capabilities |
| Record ownership model | Team, role, geography, programme, or named-owner scope |
| Exact retention periods | Approved schedule for each record class |
| Deletion semantics | Hard delete, reversible archive, anonymisation, backup expiry, and downstream purge behavior |
| Legal holds | Categories, approvers, review cadence, and release authority |
| Suppression threshold | Minimum cohort size and cross-filter protection rules |
| Restricted-route system | System of record, named roles, and service-level expectations |
| Export channel | Storage location, encryption, checksum, service account, and transfer safeguards |
| Rights contact | Official HMSI privacy contact and escalation route |
| Monitoring owner | On-call responsibility and alert destinations |

## 13. References

[1]: ./hmsi-data-governance-volunteer-privacy-compliance-policy.md "HMSI Data Governance and Volunteer Privacy Compliance Policy"

[2]: ./hmsi-typeform-crm-retention-data-pipeline-specification.md "HMSI Typeform and CRM Retention Data Pipeline Specification"

[3]: https://ndpc.gov.ng/resources/ "Nigeria Data Protection Commission — Resources"

[4]: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf "Nigeria Data Protection Act (NDP Act) 2023 — General Application and Implementation Directive (GAID) 2025"
