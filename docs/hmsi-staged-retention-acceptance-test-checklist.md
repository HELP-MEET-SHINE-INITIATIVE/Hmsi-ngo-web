# HMSI Staged Retention State Machine
## Pre-Staging Acceptance Test Checklist

**Purpose:** Validate the staged retention review, hold, suppression, anonymisation, deletion, audit, retry, and recovery controls before deployment to staging.

**Status:** Pre-staging acceptance checklist  
**Test data:** Synthetic fixtures only  
**Required execution mode:** `dry_run` first; `review_only` after dry-run evidence is accepted  
**Destructive execution:** Not permitted during this checklist  
**Related documents:**

- [HMSI Data Governance and Volunteer Privacy Compliance Policy](./hmsi-data-governance-volunteer-privacy-compliance-policy.md)
- [HMSI CRM Retention and Suppression Configuration Runbook](./hmsi-crm-retention-suppression-configuration-runbook.md)
- [HMSI Staged Retention Automation Scripts and Workflow Rules](./hmsi-staged-retention-automation-scripts.md)

> **Release principle:** No staging deployment is accepted if the system can delete or anonymise a record without the required approval, hold check, privacy gate, audit event, and bounded execution control.

## 1. Test ownership and sign-off

Complete the checklist with named individuals. “Passed” means the expected result was observed and evidence was attached to the test record. A test may not be marked passed based solely on code inspection.

| Role | Name | Responsibility | Sign-off |
|---|---|---|---|
| Test coordinator | [Name] | Owns execution record and defect triage | [ ] |
| Pipeline owner | [Name] | Confirms scheduler, adapter, and run-lock behavior | [ ] |
| Privacy lead/DPO | [Name] | Confirms suppression, holds, rights, and retention controls | [ ] |
| CRM administrator | [Name] | Confirms fields, workflows, permissions, and audit events | [ ] |
| Security reviewer | [Name] | Confirms authorization, secrets, logging, and destructive-operation gates | [ ] |
| Programme owner | [Name] | Confirms operational usability and reporting behavior | [ ] |

## 2. Test environment and fixture preparation

The test environment must be isolated from production. Use separate CRM credentials, service accounts, storage locations, audit destinations, scheduler configuration, and notification endpoints. No real volunteer names, emails, phone numbers, IDs, feedback text, safeguarding details, or production exports may be used.

### 2.1 Environment checklist

| Check | Expected evidence | Status |
|---|---|:---:|
| Staging or test CRM workspace is isolated from production | Workspace ID, URL, and access record | [ ] |
| Test service account is separate from production | Account name and scope record | [ ] |
| All retention configuration values are loaded from test configuration | Sanitised configuration snapshot | [ ] |
| `RETENTION_MODE=dry_run` | Configuration evidence | [ ] |
| Production CRM and production storage are unreachable by test credentials | Negative connection test | [ ] |
| Notification destination is a test sink or disabled | Sink log or configuration evidence | [ ] |
| Audit destination is available and access-restricted | Test audit record | [ ] |
| Scheduler is configured to run once or on demand | Job configuration | [ ] |
| Run-lock storage is available | Lock acquisition evidence | [ ] |
| Backup/restore or fixture-reset procedure is available | Reset command or operator procedure | [ ] |
| Logs contain no secrets or raw sensitive content | Sanitised log sample | [ ] |

### 2.2 Synthetic fixture set

Create deterministic records with non-real identifiers such as `TEST-PERSON-001`. Record the fixture version and expected state before each test run.

| Fixture | Initial state | Special condition | Expected outcome |
|---|---|---|---|
| `F-001` | `active` | Review date in the past; valid reconciliation | Moves to `review_due` only |
| `F-002` | `review_due` | Active retention hold | Moves/remains `hold`; no destructive action |
| `F-003` | `review_due` | Hold review date overdue | Privacy task and escalation; no destructive action |
| `F-004` | `review_due` | Open rights request | `exception`; no destructive action |
| `F-005` | `review_due` | Open incident | `exception`; no destructive action |
| `F-006` | `review_due` | Pending correction | `exception`; no destructive action |
| `F-007` | `review_due` | Restricted-support record class | Excluded from ordinary schedule and export |
| `F-008` | `review_due` | Safeguarding record class | Excluded from ordinary schedule and export |
| `F-009` | `review_due` | Reconciliation not confirmed | `exception`; no destructive action |
| `F-010` | `review_due` | Privacy-suppressed, small-cell reason | Excluded from aggregate export |
| `F-011` | `anonymise_due` | All gates pass | Anonymisation planned in dry-run; no mutation |
| `F-012` | `delete_due` | All gates pass | Deletion planned in dry-run; no mutation |
| `F-013` | `delete_due` | Unknown provider result | `exception`; no blind retry |
| `F-014` | `delete_due` | Transient provider timeout | Bounded retry; eventual exception if limit reached |
| `F-015` | `active` | Future review date | Not selected |
| `F-016` | `active` | Unallowlisted record class | Skipped and audited |
| `F-017` | `review_due` | Duplicate candidate from repeated scheduler call | One effective transition; no duplicate disposal |
| `F-018` | `review_due` | Missing suppression reason while suppressed | Validation failure; no export |
| `F-019` | `review_due` | Missing hold owner/review date | Validation failure; no destructive action |
| `F-020` | `review_due` | Partial CRM export for source period | `exception`; prior trusted aggregate remains |

## 3. Release-gate classification

Tests marked **Critical** are stop-ship gates. Tests marked **High** must pass before staging unless the privacy lead and security reviewer approve a documented exception. Tests marked **Medium** may be accepted with a remediation owner and due date.

| Priority | Meaning | Minimum acceptance |
|---|---|---|
| Critical | Direct risk of data loss, privacy breach, unauthorized access, or untraceable processing | Zero failures and no open exception |
| High | Operational correctness or recoverability risk | Pass or formally approved exception |
| Medium | Usability, diagnostics, or documentation improvement | Pass or documented remediation |

## 4. Configuration and state-machine tests

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| CFG-01 | Critical | Start with `RETENTION_MODE=dry_run` and invoke the job | Job plans actions but calls no anonymisation or deletion method | Adapter call log | [ ] |
| CFG-02 | Critical | Set `RETENTION_MODE=execute` without an approval reference | Job fails before candidate processing | Error and audit event | [ ] |
| CFG-03 | Critical | Set an invalid batch size below 1 and above the configured maximum | Configuration validation fails | Test output | [ ] |
| CFG-04 | High | Set an invalid record class in the allowlist | Configuration fails or rejects the class; no processing occurs | Configuration error | [ ] |
| CFG-05 | Critical | Invoke two jobs concurrently | Only one acquires the run lock; the other exits without processing | Lock/audit logs | [ ] |
| CFG-06 | High | Let the lock expire during a simulated crash | Next run can recover safely without duplicating completed work | Recovery evidence | [ ] |
| STM-01 | Critical | Process `F-001` with past review date | State changes from `active` to `review_due`; no deletion | Before/after record and audit event | [ ] |
| STM-02 | Critical | Process `F-015` with future review date | Record is not selected or mutated | Candidate query result | [ ] |
| STM-03 | Critical | Process a record already marked `anonymised` | Record is not selected for a second anonymisation | Adapter call log | [ ] |
| STM-04 | Critical | Process a record already marked `deleted` or absent | No repeat deletion; bounded audit outcome | Audit event | [ ] |
| STM-05 | High | Process a record in `exception` with the exception unresolved | Record remains protected and receives an owner task | State and task evidence | [ ] |
| STM-06 | High | Process a record with an invalid transition | Transition is rejected and audited | Validation error | [ ] |

## 5. Hold, rights, incident, and correction gates

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| GATE-01 | Critical | Set `retention_hold=true` on `F-002` | State becomes/remains `hold`; no anonymisation or deletion call | State and adapter log | [ ] |
| GATE-02 | Critical | Provide a hold reason but no hold owner | Validation blocks the hold or routes it to exception | Validation event | [ ] |
| GATE-03 | Critical | Provide a hold owner but no review date | Validation blocks destructive processing | Validation event | [ ] |
| GATE-04 | Critical | Set `retention_hold_review_at` in the past on `F-003` | Task/escalation is created; the hold remains active | Task and audit evidence | [ ] |
| GATE-05 | Critical | Create an open rights request for `F-004` | Record becomes `exception`; no destructive operation occurs | State and audit event | [ ] |
| GATE-06 | Critical | Close the rights request after review | Record may re-enter review only through an explicit controlled transition | Transition audit event | [ ] |
| GATE-07 | Critical | Set `open_incident=true` on `F-005` | Record is protected and exceptioned | State and audit event | [ ] |
| GATE-08 | Critical | Set `pending_correction=true` on `F-006` | Record is protected and exceptioned | State and audit event | [ ] |
| GATE-09 | High | Attempt to clear a hold as a team lead | Action is denied and logged | Authorization log | [ ] |
| GATE-10 | High | Clear a hold through the named privacy-lead workflow | Reason, reviewer, timestamp, and decision are recorded | Audit record | [ ] |

## 6. Restricted-record and safeguarding separation tests

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| SEP-01 | Critical | Process `F-007` with `record_class=restricted_support` | Ordinary retention job excludes it and records `restricted_schedule_excluded` | Audit event | [ ] |
| SEP-02 | Critical | Process `F-008` with `record_class=safeguarding` | Ordinary retention job excludes it and does not expose narrative data | Adapter/log inspection | [ ] |
| SEP-03 | Critical | Add confidential text to a test restricted record | Text is not copied into ordinary logs, dashboard rows, emails, or task titles | Output inspection | [ ] |
| SEP-04 | Critical | Attempt to include restricted records in aggregate export | Export eligibility is false and record is absent | Export file/query evidence | [ ] |
| SEP-05 | High | Attempt to view restricted record as a team lead | Access is denied without revealing record existence beyond the minimum safe response | Authorization response | [ ] |
| SEP-06 | High | Route an uncertain support case | Case enters privacy/safeguarding review rather than being classified as `none` | Queue evidence | [ ] |

## 7. Suppression and aggregate-export tests

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| SUP-01 | Critical | Set `privacy_suppressed=true` with `small_cell` reason | Record is excluded from export and dashboard output | Export and API response | [ ] |
| SUP-02 | Critical | Set suppression without a reason | Validation blocks publication and creates a review item | Validation/audit evidence | [ ] |
| SUP-03 | Critical | Attempt to remove suppression as an ordinary administrator | Action is denied or requires privacy approval | Permission/audit evidence | [ ] |
| SUP-04 | Critical | Create a cohort of four synthetic records | Aggregate returns `suppressed` or `insufficient_data`, not a value | Dashboard/API output | [ ] |
| SUP-05 | Critical | Create five records, then apply a cross-filter that leaves one | Cross-filter result is suppressed; subtraction cannot identify the person | Filtered output | [ ] |
| SUP-06 | High | Include raw free text in a synthetic response | Raw text is absent from the aggregate export and logs | Export/log inspection | [ ] |
| SUP-07 | High | Set `aggregate_export_eligible=false` | Record is absent from the named export view | Export evidence | [ ] |
| SUP-08 | Critical | Change a client-supplied team filter to another team | Backend retains the authenticated scope and does not disclose other-team data | Authorization test | [ ] |
| SUP-09 | High | Export a period with a failed denominator | Rate is unavailable or suppressed, not zero | Aggregate output | [ ] |
| SUP-10 | High | Review a suppression removal | Reviewer, reason, timestamp, and rule version are present | Audit event | [ ] |

## 8. Reconciliation, quality, and partial-input tests

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| QLT-01 | Critical | Process `F-009` without a trusted reconciliation | Record becomes `exception`; no disposal occurs | State and audit event | [ ] |
| QLT-02 | Critical | Submit `F-020` as a partial export | Export is quarantined; dashboard remains on prior trusted run | Run status and dashboard evidence | [ ] |
| QLT-03 | High | Submit an unknown pathway value | Record enters data-quality review; no silent `none` mapping | Queue and mapping evidence | [ ] |
| QLT-04 | High | Submit duplicate export ID and checksum | Second delivery is deduplicated and does not create duplicate disposal work | Intake ledger | [ ] |
| QLT-05 | High | Submit same export ID with a different checksum | Delivery is quarantined as a conflict | Quarantine event | [ ] |
| QLT-06 | High | Submit impossible future timestamps | Record is rejected or held for review | Validation evidence | [ ] |
| QLT-07 | Medium | Submit a late-arriving correction | Correction is versioned and affected aggregate run is restated or flagged | Run and audit evidence | [ ] |

## 9. Approval and destructive-operation tests

These tests use mocks or a non-destructive adapter. The deletion method must be instrumented to prove whether it would have been called; it must not connect to a production or staging dataset containing real records.

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| DST-01 | Critical | Place `F-011` in `anonymise_due` with all gates passing and run dry-run | Anonymisation is planned; no fields change | Before/after fixture and call log | [ ] |
| DST-02 | Critical | Place `F-012` in `delete_due` with all gates passing and run dry-run | Deletion is planned; no delete call executes | Adapter call log | [ ] |
| DST-03 | Critical | Run execute mode without `RETENTION_APPROVAL_REFERENCE` | Job fails before any destructive call | Error and audit event | [ ] |
| DST-04 | Critical | Use an expired or malformed approval reference | Job rejects execution | Validation evidence | [ ] |
| DST-05 | Critical | Exceed maximum batch count | Job stops at the configured limit and emits an alert | Run summary | [ ] |
| DST-06 | Critical | Inject a new hold immediately before execution | Final transaction/gate check blocks action | Race-condition test log | [ ] |
| DST-07 | Critical | Make audit storage unavailable before a destructive operation | Operation is blocked or the run halts according to fail-closed policy | Failure evidence | [ ] |
| DST-08 | High | Verify anonymisation allowlist | Only approved direct identifiers/source links are removed; aggregate fields remain | Field diff | [ ] |
| DST-09 | High | Verify deletion result reconciliation | Successful provider deletion is confirmed before completion is recorded | Adapter/provider mock evidence | [ ] |
| DST-10 | Critical | Inject an unknown provider result | Record becomes `exception`; no blind retry or duplicate delete | State and retry log | [ ] |

## 10. Idempotency, retry, and recovery tests

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| RCV-01 | Critical | Run the same batch twice | No duplicate state transition, anonymisation, deletion, or audit-side effect | Run comparison | [ ] |
| RCV-02 | High | Inject a transient network error on attempt one | Bounded retry occurs with backoff or provider retry guidance | Retry log | [ ] |
| RCV-03 | Critical | Exceed retry limit | Record becomes `exception`; owner alert is created | State and alert | [ ] |
| RCV-04 | Critical | Inject an authorization error | No retry; operation is stopped and escalated | Error classification | [ ] |
| RCV-05 | Critical | Timeout after a simulated provider accepted deletion | System marks `unknown_deletion_result` and reconciles before any retry | Reconciliation evidence | [ ] |
| RCV-06 | High | Crash after CRM mutation but before audit write | Recovery detects incomplete audit state and halts further destructive work | Recovery report | [ ] |
| RCV-07 | High | Restore fixture snapshot after a failed test | Fixture returns to known state without touching unrelated records | Reset evidence | [ ] |
| RCV-08 | High | Resume after a non-destructive scheduler failure | Previously completed work is not repeated | Run comparison | [ ] |

## 11. Authorization, secrets, and logging tests

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| SEC-01 | Critical | Invoke retention endpoint without authentication | Request is denied | HTTP response/log | [ ] |
| SEC-02 | Critical | Invoke with ordinary CRM user credentials | Read-only or no access; no state mutation | Authorization evidence | [ ] |
| SEC-03 | Critical | Invoke deletion workflow as a team lead | Denied and audited | Authorization evidence | [ ] |
| SEC-04 | Critical | Inspect environment, logs, errors, and audit records | No passwords, tokens, webhook secrets, raw free text, or unnecessary identifiers | Sanitised samples | [ ] |
| SEC-05 | High | Rotate the test service credential | Old credential fails; new credential works only within scope | Credential test | [ ] |
| SEC-06 | High | Attempt to change allowlists or execution mode without admin approval | Configuration change is denied or requires controlled approval | Change log | [ ] |
| SEC-07 | Critical | Verify service account scopes | Account cannot browse unrestricted CRM records or manage users | Scope evidence | [ ] |
| SEC-08 | High | Review audit access | Only named privacy/security/admin roles can view audit details | Permission test | [ ] |

## 12. Observability and operational usability tests

| ID | Priority | Test procedure | Expected result | Evidence | Result |
|---|---|---|---|---|:---:|
| OBS-01 | High | Complete a dry-run batch | Summary reports batch ID, planned, skipped, failed, and completed counts | Run summary | [ ] |
| OBS-02 | Critical | Force a failed record | Alert includes batch ID, record class, error class, owner, and next action without PII | Alert payload | [ ] |
| OBS-03 | High | Force an overdue hold | Privacy task and alert are visible to the correct owner | Task/alert evidence | [ ] |
| OBS-04 | High | Force a suppression-rate anomaly | Monitoring signal is emitted for review | Metric/alert | [ ] |
| OBS-05 | High | Fail dashboard publication | Previous trusted aggregate remains visible with stale-data state | Dashboard evidence | [ ] |
| OBS-06 | Medium | Review operator instructions | An operator can understand whether to retry, pause, reconcile, or escalate | Runbook review | [ ] |
| OBS-07 | High | Inspect UTC timestamps | Source, receipt, processing, publication, and audit times are distinguishable and UTC-based | Audit sample | [ ] |

## 13. Evidence package requirements

Attach the following evidence before acceptance:

| Evidence | Required content | Attached |
|---|---|:---:|
| Test run manifest | Date, environment, code/config version, fixture version, operator | [ ] |
| Sanitised configuration | Mode, batch size, retry limit, allowlist, approval requirement; no secrets | [ ] |
| Fixture manifest | Synthetic records and expected outcomes | [ ] |
| State-transition report | Before/after states for every test record | [ ] |
| Adapter call report | Proves destructive methods were not called during dry-run | [ ] |
| Audit sample | Run-start, review, hold, suppression, exception, retry, and completion events | [ ] |
| Export sample | Aggregate-only fields and suppression outcomes | [ ] |
| Authorization report | Allowed and denied role tests | [ ] |
| Log review | Evidence that sensitive content is absent | [ ] |
| Failure/recovery report | Timeout, unknown result, audit failure, and reset outcomes | [ ] |
| Sign-off record | Test coordinator, privacy lead, security reviewer, CRM administrator | [ ] |

## 14. Stop-ship conditions

Staging deployment must be blocked if any of the following occurs:

1. A destructive CRM method executes while the mode is `dry_run` or `review_only`.
2. Execution is possible without the required approval reference.
3. A hold, open rights request, incident, pending correction, or restricted record can be anonymised or deleted.
4. A suppressed or small-cell record appears in the aggregate export or dashboard.
5. A client-supplied scope or role can bypass backend authorization.
6. The system retries an unknown deletion result blindly.
7. Audit events are missing, mutable without authorization, or contain raw sensitive content.
8. The job can process more than the configured batch or run limits.
9. A partial or failed reconciliation replaces the last trusted aggregate run.
10. Production credentials, storage, notifications, or data are reachable from the test environment.
11. The deletion/anonymisation result cannot be reconciled with the CRM or downstream copies.
12. Any critical test remains failed or lacks evidence.

## 15. Pre-staging approval decision

| Decision | Selection |
|---|:---:|
| All Critical tests passed | [ ] |
| All High tests passed or exceptions approved | [ ] |
| No production data or credentials were used | [ ] |
| Dry-run destructive-call report reviewed | [ ] |
| Privacy lead approved suppression and retention gates | [ ] |
| Security reviewer approved authorization and secret handling | [ ] |
| CRM administrator approved field/workflow mapping | [ ] |
| Recovery and fixture-reset procedure verified | [ ] |
| Approved for staging deployment | [ ] |
| Rejected — remediation required | [ ] |

**Outstanding risks or exceptions:**

> [Record issue, affected control, risk owner, remediation due date, and approval reference.]

**Test coordinator:** ____________________  **Date:** ____________________  
**Privacy lead/DPO:** ____________________  **Date:** ____________________  
**Security reviewer:** ____________________  **Date:** ____________________  
**CRM administrator:** ____________________  **Date:** ____________________

## References

[1]: ./hmsi-data-governance-volunteer-privacy-compliance-policy.md "HMSI Data Governance and Volunteer Privacy Compliance Policy"

[2]: ./hmsi-crm-retention-suppression-configuration-runbook.md "HMSI CRM Retention and Suppression Configuration Runbook"

[3]: ./hmsi-staged-retention-automation-scripts.md "HMSI Staged Retention Automation Scripts and Workflow Rules"

[4]: ./hmsi-typeform-crm-retention-data-pipeline-specification.md "HMSI Typeform and CRM Retention Data Pipeline Specification"
