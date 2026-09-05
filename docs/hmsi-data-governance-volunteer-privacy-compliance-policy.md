# HMSI Data Governance and Volunteer Privacy Compliance Policy

**Document owner:** Help Meet Shine Initiative (HMSI) leadership and designated Data Protection Officer or privacy lead  
**Version:** 1.0 draft  
**Status:** Final draft — legal, privacy, safeguarding, and leadership approval required before production use  
**Effective date:** [To be completed after approval]  
**Review cycle:** At least annually and whenever there is a material change to law, processing purpose, supplier, platform, or risk profile  
**Related document:** [HMSI Typeform and CRM Retention Data Pipeline Specification](./hmsi-typeform-crm-retention-data-pipeline-specification.md)

> **Legal notice:** I am an AI, not a lawyer — what follows is a working policy draft, not formal legal advice; a qualified Nigerian privacy lawyer or competent Data Protection Compliance Organisation should review it before HMSI relies on or publishes it.

## 1. Purpose and policy statement

The Help Meet Shine Initiative (“HMSI”, “we”, “us”, or “the organisation”) collects and uses personal information to coordinate volunteers, support safe participation, manage communications, evaluate volunteer experience, administer programmes, and demonstrate responsible stewardship of resources. This policy establishes the governance rules required to handle that information fairly, transparently, securely, and proportionately.

HMSI’s operating principle is **patterns, not people**. Volunteer feedback and retention analytics must improve programmes and support pathways without becoming a hidden performance-ranking system. Individual responses must not be used to punish, retaliate against, deny opportunities, infer wellbeing or suitability, or make safeguarding determinations through an automated score. Confidential safeguarding, privacy, security, harassment, retaliation, and serious wellbeing concerns must use separate restricted routing and must not be copied into ordinary dashboard aggregates.

This policy is designed to accompany the Typeform and CRM retention data pipeline. It governs the complete lifecycle of relevant information, from collection and intake through processing, access, reporting, correction, archival, deletion, and audit. It is intended to operationalise the Nigeria Data Protection Act, 2023 and applicable Nigeria Data Protection Commission (“NDPC”) guidance, including the current General Application and Implementation Directive (“GAID”) [1] [2]. It does not replace a formal legal assessment of HMSI’s status, obligations, registration category, international-transfer position, or contractual arrangements.

## 2. Scope

This policy applies to HMSI employees, officers, volunteers, team leads, programme staff, contractors, consultants, interns, administrators, data protection personnel, and service providers who access or process volunteer or programme information on HMSI’s behalf. It covers information processed in HMSI websites, portals, forms, Typeform, CRM exports, email systems, Supabase or other databases, object storage, analytics dashboards, spreadsheets, reports, support channels, and approved third-party platforms.

It covers prospective, current, paused, former, and returning volunteers, workers, members, community publishers, humanitarian activists, independent field reporters, staff, donors where their information enters the same operational systems, and people mentioned in volunteer submissions. It also covers derived information such as cohort-level retention rates, support-response timing, coded themes, action status, data-quality states, and suppression decisions.

The policy does not authorise collection of information merely because a system can store it. A processing activity must have an approved purpose, owner, minimum field set, access scope, retention rule, and documented route for responding to requests or incidents before it is enabled in production.

## 3. Governance objectives

HMSI shall maintain governance controls that make processing understandable, limited, secure, and accountable. The organisation will pursue the following objectives:

| Objective | HMSI requirement | Evidence of operation |
|---|---|---|
| Lawful and fair processing | Document the purpose, expected people, lawful basis or other applicable justification, notice, and risk assessment before launch. | Approved processing record and privacy notice version |
| Purpose limitation | Use data only for the purpose communicated and approved, unless a compatible and documented purpose is authorised. | Data inventory, change record, access review |
| Data minimisation | Collect the smallest amount of information needed for the service or analysis. | Field-level data dictionary and form review |
| Accuracy | Preserve missingness, permit correction, and avoid silently treating unknown values as zero or “no concern”. | Correction log and quality reports |
| Confidentiality | Restrict sensitive information to authorised personnel and separate confidential routes from ordinary reporting. | Role matrix, audit log, access tests |
| Integrity and availability | Protect records against tampering, accidental loss, replay, partial publication, and unauthorised deletion. | Checksums, immutable audit events, backups or recovery evidence |
| Transparency and participation | Give volunteers clear information and accessible routes to ask questions, exercise rights, or raise concerns. | Privacy notice, request register, support records |
| Accountability | Assign owners, record decisions, test controls, and remediate exceptions. | Governance register, training records, review minutes |

## 4. Roles and accountability

HMSI leadership remains accountable for approving purposes, resources, risk tolerance, suppliers, retention schedules, and material exceptions. The designated Data Protection Officer or privacy lead coordinates privacy governance, maintains the processing inventory, advises on risk assessments, oversees rights requests, supports incident response, and coordinates engagement with the NDPC where required. The role must have a reporting path to leadership and sufficient independence to raise concerns.

System owners are responsible for the business purpose, approved field list, access scope, data-quality expectations, retention period, and operational runbook for their system. The pipeline owner is responsible for Typeform intake, CRM ingestion, mapping versions, deduplication, aggregate publication, suppression controls, and pipeline monitoring. Programme and team leads may view only the scoped aggregates or task information needed for their role; they are not entitled to browse raw responses.

Security and platform administrators implement technical safeguards, manage secrets and credentials, review logs, maintain dependency and configuration hygiene, and support access removal. The safeguarding lead or confidential-case owner receives safeguarding and serious-risk referrals through the separate route. Communications and fundraising owners must ensure that outreach, donor, and volunteer messages use approved templates and do not disclose unnecessary personal information.

Processors and other suppliers may process HMSI information only under an approved written arrangement, documented instructions, appropriate security controls, confidentiality duties, subprocessor transparency, incident cooperation, return/deletion provisions, and audit or assurance rights proportionate to the risk. No individual may export, copy, or upload HMSI personal information to an unapproved service.

| Decision or activity | Accountable role | Required consultation or evidence |
|---|---|---|
| New collection form or field | System owner and privacy lead | Purpose, field minimisation, notice, risk review |
| New Typeform or CRM connector | Pipeline owner and privacy lead | Source contract, secret management, security test |
| Dashboard publication | Pipeline owner and programme owner | Suppression, quality, freshness, run ID |
| Confidential referral | Safeguarding or incident lead | Restricted case record; no ordinary dashboard copy |
| Access approval | System owner | Role, scope, duration, purpose code |
| Deletion or retention exception | Data owner and privacy lead | Legal hold or documented operational reason |
| Supplier onboarding | Leadership, procurement, security, privacy lead | Due diligence and written terms |
| Personal-data incident | Incident lead and privacy lead | Containment, assessment, notification decision, lessons learned |

## 5. Data classification and handling rules

HMSI shall classify information before it is placed in an operational system. Classification determines who may access it, where it may be stored, whether it may be included in analytics, how it may be transmitted, and how long it may be retained.

| Classification | Examples | Handling rule |
|---|---|---|
| Public | Published HMSI programme information and approved public news | May be published after editorial approval; do not include personal contact details without a separate approved purpose. |
| Internal operational | Role, team pathway, task status, attendance or activity status, support acknowledgement timestamps | Access only to authorised operational users; aggregate before leadership reporting. |
| Confidential personal | Email, phone, HMSI ID, free-text feedback, individual support request, application details, identity-linked CRM record | Least-privilege access; no raw export to ordinary dashboards; encrypt in transit and at rest where supported. |
| Restricted safeguarding or security | Allegations, disclosures, case narratives, precise sensitive locations, health or disability details, identity documents, credentials, security incidents | Separate system or restricted namespace; named-role access; no ordinary retention dashboard, email, or team channel copy. |

A classification may be raised when context makes a field more sensitive than its apparent content. For example, a location that is harmless in a general programme report may be restricted when combined with a safeguarding disclosure or a vulnerable person’s identity. When classification is uncertain, the higher protection level applies until the privacy or safeguarding lead decides otherwise.

## 6. Lawful, fair, and transparent processing

Before collecting volunteer information, HMSI must identify and document the specific purpose, expected data subjects, field set, recipients, retention period, security controls, and applicable lawful basis or other permitted justification. The privacy notice must explain the processing in clear language, including whether a response is optional, what happens if a person declines to answer, how confidentiality works, and how to contact HMSI.

Consent, where used, must be specific, informed, freely given, and capable of withdrawal without unfair consequences. A request for support must not be hidden inside an analytics consent. Participation in a pulse check must not be represented as mandatory unless there is a clearly documented and lawful operational reason. HMSI must not imply that a volunteer will be disadvantaged for declining feedback or requesting help.

HMSI shall not use legitimate interest, organisational need, programme necessity, or another basis as a generic permission for unrelated secondary uses. A new use, new audience, new supplier, or new identifying field requires a documented change assessment. Where the proposed use creates a high risk to volunteers or other people, HMSI shall complete a privacy impact assessment or equivalent documented risk review before launch.

## 7. Collection and data minimisation

Forms and CRM exports must use a versioned data dictionary with stable field identifiers. The Typeform and CRM pipeline may collect only approved fields required for volunteer support, operational coordination, reconciliation, or aggregate measurement. Direct identifiers should be tokenised or hashed for internal joins where the reporting purpose does not require the identifier. Email addresses must not be used as dashboard keys.

Free text should be optional and accompanied by a clear instruction not to include passwords, identity documents, medical details, allegations, exact sensitive locations, or information about another person unless the designated confidential route is used. When a response contains restricted content unexpectedly, the recipient must stop ordinary processing, limit access, and route the matter to the privacy or safeguarding lead without repeating the narrative in ordinary logs.

CRM exports must not include passwords, access tokens, private beneficiary details, case notes, medical details, confidential disclosures, or unnecessary contact fields. Unexpected columns, duplicate headers, incompatible types, or prohibited content cause the export to be quarantined rather than partially ingested.

## 8. Pipeline governance and privacy-preserving analytics

The Typeform and CRM pipeline shall use an event-first plus reconciliation model. Typeform webhooks must be verified over the exact raw request body before parsing, with an allowlisted form ID, body-size limit, replay/idempotency control, and restricted quarantine. CRM files require an approved delivery channel, checksum, export ID, schema version, restricted intake location, and validation before processing.

The normalized layer must contain only approved operational fields. The dashboard read model must contain aggregate values, denominators, suppression state, evidence quality, freshness, and action references. It must not contain raw free text, direct identifiers, unrestricted links to source responses, or hidden individual scores.

HMSI shall apply privacy controls before aggregation and again before each dashboard read, export, email, or API response. The recommended default minimum cohort size is five. This is a policy setting, not a guarantee of anonymity; the privacy lead may require a higher threshold where cross-filtering, small geography, rare pathways, timing, or auxiliary knowledge could enable re-identification. The dashboard must show “not enough data”, “suppressed for privacy”, or “data unavailable” rather than zero when a measure cannot safely be shown.

| Analytics control | Required behavior |
|---|---|
| Small-cell suppression | Suppress small groups and prevent subtraction or cross-filter inference. |
| Time-window protection | Combine or delay narrow periods when one event could identify a person. |
| Free-text exclusion | Publish reviewed coded themes only; never expose raw comments. |
| Confidential-route separation | Keep restricted process status separate from ordinary performance and retention views. |
| Denominator integrity | Do not publish rates when the numerator, denominator, or eligibility definition is missing or suppressed. |
| Non-retaliation | Do not use individual feedback to rank, punish, deny opportunities, or infer wellbeing or commitment. |
| Version traceability | Store source run, mapping version, coding version, quality state, and suppression state. |
| Export minimisation | Apply the same suppression and field minimisation to CSV, API, email, and reports. |

Automated or assisted classification may generate a coded theme and confidence or evidence state only when its dictionary, review process, limitations, and error handling are approved. It must not make safeguarding, wellbeing, performance, suitability, or disciplinary judgments. Human review is required for uncertain or sensitive classifications.

## 9. Access control and identity security

Access is granted by role, scope, purpose, and duration. The backend, not the user interface, must enforce authorisation. Client-supplied team, role, or user identifiers are not proof of access. Team leads may see only their approved aggregate scope. Programme directors may see approved cross-team aggregates. Restricted specialists may see only the confidential process status needed to perform their duties, without receiving unnecessary narratives.

Administrative access must use named accounts, strong authentication where available, individual accountability, and a documented approval. Shared accounts are prohibited. Service accounts must be limited to their integration purpose, stored through approved secret management, rotated according to risk, and excluded from ordinary logs. Secrets, tokens, full webhook payloads, raw free text, and unnecessary direct identifiers must never appear in application logs or diagnostic responses.

Access must be removed promptly when a person changes role, leaves HMSI, loses a need to know, or a supplier relationship ends. At least quarterly, system owners must review privileged access, restricted-route access, service accounts, export permissions, and dormant accounts. Review results and remediation actions belong in the audit ledger.

## 10. Storage, transmission, and records integrity

Raw Typeform payloads and CRM files must be stored in a restricted quarantine area with encryption, access logging, checksum or equivalent integrity evidence, and a retention rule. Normalized data, read models, and audit records must use separate access boundaries. Object storage links must be private by default and time-limited when temporary access is necessary.

HMSI shall use HTTPS or an equivalent protected channel for transmissions. Files must be validated for type, size, encoding, delimiter, duplicate headers, formula-injection strings, and unexpected columns. Spreadsheet exports must be treated as untrusted input. They must not be opened or re-published in a way that executes formulas or macros.

The audit ledger should be append-only or otherwise tamper-evident. It records event IDs, source references or hashes, run IDs, timestamps in UTC, outcomes, rule versions, approvers, and bounded error classes. It must not become a shadow database of volunteer narratives. Corrections are recorded as versioned events linked to the original event; the original record is not silently overwritten.

## 11. Retention, archival, and deletion

HMSI shall maintain a retention schedule based on purpose, sensitivity, operational need, legal or contractual requirements, audit value, and risk. Retention is not indefinite by default. At the end of the approved period, records must be securely deleted, irreversibly anonymised, or placed under a documented legal or operational hold.

The exact periods below are proposed policy defaults and require approval against HMSI’s actual legal, grant, safeguarding, employment, and accounting requirements. A shorter period applies where it satisfies the purpose. A longer period requires written justification and privacy review.

| Record class | Proposed default | Disposal or review action |
|---|---:|---|
| Raw Typeform payloads | 90 days after successful normalization and reconciliation | Secure deletion, unless a documented hold applies |
| CRM source exports | 90 days after accepted replacement and reconciliation | Secure deletion; retain checksum and outcome metadata |
| Normalized volunteer feedback | 12 months after the reporting period | Delete or transform into non-identifying aggregate evidence |
| Aggregate dashboard read models | 24 months after publication | Review continued usefulness; retain only aggregate fields needed for trend evidence |
| Audit ledger | 24 months minimum, subject to legal and assurance review | Retain bounded metadata; do not retain raw narratives |
| Support-routing records | As defined by the confidential support/safeguarding schedule | Restricted review and controlled deletion |
| Access and security logs | 12 months minimum, subject to incident or audit hold | Delete or archive in a restricted log store |
| Privacy requests and decisions | 24 months after closure, subject to legal review | Retain request metadata and decision evidence, not unnecessary source data |

Deletion jobs must be idempotent, logged, access-controlled, and tested with synthetic fixtures before production. A deletion request does not override a valid legal hold, safeguarding need, security investigation, or statutory recordkeeping obligation; any limitation must be explained to the requester and recorded by the privacy lead. Backups and replicas must have a documented expiry or overwrite process.

## 12. Volunteer privacy rights and request handling

HMSI shall provide an accessible contact route for volunteers and other data subjects to ask what information is held about them, request correction, ask about the purpose or recipients, object or withdraw where applicable, request deletion or restriction where applicable, or raise a concern about unfair treatment. Requests should not require a person to know HMSI’s internal system names.

The privacy lead shall verify identity proportionately, log the request, define its scope, search approved systems, consult relevant owners, protect third-party information, and respond within the applicable legal or policy timeframe. Identity verification must not require more data than necessary. If a request cannot be completed, HMSI must explain the reason, the scope of the limitation, and the available escalation route.

Volunteer feedback must not be treated as a waiver of privacy. A person may ask for support without consenting to publication of their narrative. Where an aggregate metric could reveal an individual’s response, HMSI should suppress, combine, delay, or remove the metric rather than attempt to obtain permission as a substitute for sound design.

## 13. Safeguarding, sensitive information, and confidential routing

Safeguarding and serious-risk information requires a separate handling path. This includes allegations, abuse or exploitation disclosures, serious threats, retaliation concerns, health or disability details, precise sensitive locations, identity documents, credentials, and information that could put a volunteer or beneficiary at risk. The ordinary Typeform/CRM retention dashboard is not a safeguarding case-management system.

Forms and staff guidance must direct people to the approved confidential channel when they need to report a safeguarding, security, harassment, retaliation, or serious wellbeing concern. The receiving system must limit access to named roles, record a minimal referral status and service-level signal, and keep the narrative in the restricted case system. Team leads must not copy confidential narratives into email, chat rooms, spreadsheets, dashboards, or task descriptions.

Where a routine support request is safely classified for aggregate use, only the coded category and bounded service-level signal may enter the aggregate pipeline. Uncertain cases are held for privacy or safeguarding review and are excluded from ordinary metrics until safely classified.

## 14. Volunteer communications and transparency

HMSI communications must use approved sender identities and templates, avoid unnecessary personal information, and provide a clear reason for the message. Internal alerts and reports intended for the president must follow HMSI’s approved executive format and must not include raw volunteer narratives or direct identifiers unless the recipient has an authorised need to know and the privacy lead approves the disclosure.

Transactional messages should link to the minimum necessary destination, avoid putting sensitive information in URLs, and never include passwords, tokens, or full confidential case details. One-time links must expire, be single-use where possible, and be logged without exposing the token. SMS, WhatsApp, email, and third-party messaging channels must be assessed for confidentiality and consent before use for personal or sensitive information.

## 15. Third-party suppliers and international processing

Before HMSI enables Typeform, CRM, Supabase, Resend, payment, analytics, file-storage, messaging, or other providers for personal information, the owner and privacy lead must document the provider’s role, processing purpose, categories of data, location, security measures, subprocessor position, breach cooperation, deletion/return terms, and cross-border transfer safeguards where relevant.

Supplier credentials must be stored in approved secret management. Provider dashboards must use named accounts and least privilege. HMSI must not rely only on a provider’s marketing statement; the review should consider the actual contract, configuration, data residency, retention settings, access model, webhook security, export controls, and termination process. A provider change requires a new impact review when it changes risk or purpose.

## 16. Incident and personal-data breach response

Anyone who suspects unauthorised access, disclosure, loss, alteration, malware, credential exposure, misdelivery, replay abuse, accidental publication, or an unsafe export must report it immediately through HMSI’s incident channel. Staff must not delete evidence, investigate beyond their authority, or forward sensitive content broadly.

The incident lead shall contain the event, preserve evidence, revoke or rotate exposed credentials, identify affected systems and data classes, assess risk to people, coordinate technical and safeguarding response, and document decisions. The privacy lead determines whether notification to affected people, the NDPC, a supplier, funder, or another authority is required under the applicable law and facts. The policy must not promise a fixed deadline without legal confirmation; the response runbook should instead require prompt assessment against current statutory and regulatory requirements.

| Response stage | Minimum record |
|---|---|
| Detection | Time, reporter, system, initial event class |
| Containment | Actions taken, accounts or links disabled, evidence preserved |
| Assessment | Data categories, people affected or potentially affected, harm and likelihood analysis |
| Decision | Notification and escalation rationale, approver, deadlines or dependencies |
| Recovery | Restoration, validation, monitoring, user support |
| Learning | Root cause, corrective actions, owner, due date, retest evidence |

## 17. Monitoring, audit, and assurance

HMSI shall monitor both security and privacy signals. Pipeline monitoring must include webhook acceptance and signature failures, reconciliation gaps, CRM freshness, schema drift, duplicate rates, normalization failures, aggregation runtime, dashboard freshness, suppression-rate changes, access-review completion, export activity, and failed deletion jobs.

Alerts must contain a run ID or event reference, source, period, severity, owner, and next action. Logs should contain structured metadata but never raw secrets, access tokens, full free-text responses, or unnecessary personal data. The privacy lead and system owners shall review material alerts and record closure or risk acceptance.

At least annually, and before material production changes, HMSI should test representative controls using synthetic fixtures or isolated accounts. Testing must include webhook signature failure and replay, CRM schema drift, suppression and cross-filter inference, role-based access, stale-data fallback, correction and restatement, export minimisation, deletion idempotency, rights-request search, confidential-route separation, accessibility, and incident escalation. Real volunteer records must not be used to test failure, deletion, replay, or suppression paths unless a formally approved test necessity and risk control exists.

## 18. Training and acceptable use

People with access to HMSI information must complete privacy, security, safeguarding, phishing, secure communications, incident reporting, and acceptable-use training before access is granted and at least annually thereafter. Training must explain that volunteer feedback is for support and programme improvement, not retaliation or hidden ranking.

Users must not download more information than necessary, keep local copies beyond the task, use personal accounts or unapproved AI tools for HMSI information, share credentials, paste confidential narratives into ordinary channels, or use screenshots as informal records. Suspected mistakes must be reported promptly; self-reporting is preferred to concealment and supports faster containment.

## 19. Exceptions, non-compliance, and enforcement

An exception must be temporary, specific, risk-assessed, approved by the system owner and privacy lead, assigned an expiry date, and accompanied by compensating controls. Permanent workarounds are not exceptions; they require a policy or system change.

Failure to follow this policy may result in access suspension, corrective training, supplier remediation, disciplinary action consistent with applicable arrangements, incident escalation, or referral to leadership. Enforcement must be fair and must not deter volunteers from raising privacy, safeguarding, or support concerns in good faith.

## 20. Implementation and approval checklist

| Control area | Completion evidence | Owner | Status |
|---|---|---|:---:|
| Governance | Appoint privacy lead/DPO and approve system owners | HMSI leadership | [ ] |
| Data inventory | Record Typeform, CRM, portal, email, storage, analytics, and confidential routes | Privacy lead | [ ] |
| Privacy notice | Publish volunteer-facing notice and support/confidential-route instructions | Privacy lead and communications | [ ] |
| Data dictionary | Approve field list, mappings, classifications, and form version | Pipeline owner | [ ] |
| Retention | Approve periods, legal holds, backup expiry, and deletion runbook | Leadership and privacy lead | [ ] |
| Access | Implement role scope, named accounts, privileged review, and offboarding | Security/platform owner | [ ] |
| Intake security | Test Typeform signature, replay, body limits, CRM checksum, and quarantine | Pipeline owner | [ ] |
| Privacy gate | Test suppression, cross-filter protection, export minimisation, and confidential separation | Privacy lead and QA | [ ] |
| Supplier review | Complete processor and transfer assessment with written terms | Procurement and privacy lead | [ ] |
| Rights workflow | Publish contact route and test search, correction, restriction, and deletion handling | Privacy lead | [ ] |
| Incident readiness | Approve contact tree, evidence handling, notification assessment, and exercises | Incident lead | [ ] |
| Training | Train administrators, team leads, volunteers with data access, and suppliers as applicable | People/programme owner | [ ] |
| Pilot | Use synthetic fixtures or isolated test accounts; record run ID and approval | Pipeline owner | [ ] |
| Production approval | Leadership and privacy lead approve launch after evidence review | HMSI leadership | [ ] |

## 21. Review questions for HMSI approval

Before adoption, HMSI leadership should confirm who acts as controller, processor, or joint controller for each processing activity; which current NDPC registration or notification obligations apply; the approved privacy notice and rights contact; the minimum cohort threshold; the restricted-route service level; the retention periods; the official reporting timezone; the roles authorised to view confidential process status; the accepted Typeform form version; the approved CRM export owner; and the safeguards for any cross-border processing.

The document should also be reconciled with HMSI’s safeguarding policy, information-security policy, records-management policy, volunteer code of conduct, incident-response plan, supplier agreements, and any grant or donor reporting obligations. Production connectors must remain disabled until these decisions are documented, the required secrets are provisioned through approved secret management, and the synthetic acceptance tests pass.

## References

[1]: https://ndpc.gov.ng/resources/ "Nigeria Data Protection Commission — Resources"

[2]: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf "Nigeria Data Protection Act (NDP Act) 2023 — General Application and Implementation Directive (GAID) 2025"

[3]: https://www.typeform.com/developers/webhooks/ "Typeform Developers — Webhooks API"

[4]: https://www.typeform.com/developers/webhooks/secure-your-webhooks/ "Typeform Developers — Secure your webhooks"

[5]: https://www.typeform.com/developers/responses/ "Typeform Developers — Responses API"
