# HMSI RBAC Matrix for Retention Overrides and Suppression Exceptions

**Purpose:** Define the role-based access control model required to authorize, constrain, review, and audit retention overrides and privacy-suppression exceptions in the HMSI CRM and Typeform/CRM retention pipeline.

**Status:** Implementation-ready, CRM-agnostic control specification  
**Default principle:** Deny by default; grant the minimum permission required for an approved purpose.

> **Important:** This is a technical governance specification, not formal legal advice. HMSI should confirm role appointments, privacy responsibilities, retention schedules, incident authorities, and regulatory obligations with its qualified privacy adviser before production activation.

## 1. Control objectives

The RBAC model must prevent an operational user from unilaterally changing a retention date, clearing a privacy suppression, releasing a legal or operational hold, approving anonymisation, and executing deletion. Those actions must be separated across roles, require explicit reasons, and generate immutable audit evidence.

The authorization decision must be enforced on the server side or in the CRM’s native permission engine. Hiding a button or field in the interface is not an authorization control. Every API, workflow, import, bulk action, scheduled job, export, and administrative override must repeat the relevant authorization and scope checks.

The model uses four dimensions:

| Dimension | Control question |
|---|---|
| Role | Is the actor allowed to attempt this action? |
| Scope | Is the actor allowed to act on this record class, team, programme, or environment? |
| Purpose | Is the declared reason compatible with the action? |
| Approval | Is an independent approval required and present? |

## 2. Roles

Use named accounts for people and separate non-interactive identities for automation. Do not use a shared “admin” login for privacy overrides.

| Role | Primary responsibility | Normal data scope |
|---|---|---|
| Volunteer coordinator | Day-to-day volunteer coordination and operational follow-up | Assigned operational records only |
| Team lead | Scoped team support and aggregate review | Assigned team records and approved aggregate views |
| Programme director | Programme-level oversight and decisions | Aggregate views; identifiable records only for an approved operational purpose |
| Privacy lead / DPO | Privacy governance, suppression decisions, rights gates, holds, and retention approvals | Privacy metadata, restricted audit evidence, and controlled source access |
| Safeguarding lead | Confidential safeguarding and restricted support routing | Restricted-route records only |
| Security lead | Security incidents, privileged-access review, and integrity investigations | Security/audit records and approved incident scope |
| CRM administrator | Configuration, permission maintenance, and technical support | Configuration and support scope; no routine privacy decisions |
| Retention operator | Runs approved review and disposal batches | Service-controlled retention metadata; no unilateral approval |
| Audit/compliance reviewer | Independent evidence review and reporting | Append-only audit ledger and aggregate compliance reports |
| Pipeline service account | Imports, reconciliation, suppression propagation, and aggregate staging | Approved source fields and staging objects only |
| Emergency responder | Time-limited incident response | Explicit incident scope and expiry |

The Privacy Lead/DPO, Security Lead, and CRM Administrator may be the same person only where HMSI documents the conflict, applies compensating two-person approval, and ensures that no individual can both approve and execute a destructive action without independent review.

## 3. Permission catalogue

Use stable permission names in the application, CRM, and audit events.

### 3.1 Read and reporting permissions

| Permission | Description |
|---|---|
| `retention.read_scoped` | Read retention metadata for records within assigned scope |
| `retention.read_global` | Read global retention metadata without raw narratives |
| `suppression.read_scoped` | View suppression state and controlled reason within scope |
| `suppression.read_restricted` | View restricted suppression evidence and exception references |
| `audit.read_summary` | View bounded run and compliance summaries |
| `audit.read_restricted` | View restricted audit evidence with purpose code |
| `audit.read_integrity` | Review event digests and audit-chain integrity |
| `export.read_aggregate` | Read approved aggregate exports |
| `export.read_identifiable` | Read identifiable exports; exceptional and separately approved |
| `restricted.read` | View restricted support/safeguarding routing metadata |

### 3.2 Review and workflow permissions

| Permission | Description |
|---|---|
| `retention.create_review` | Create a non-destructive retention review task |
| `retention.assign_review` | Assign a review to an accountable owner |
| `retention.set_exception` | Record a non-destructive retention exception |
| `retention.review_approve` | Approve movement to `anonymise_due` or `delete_due` |
| `retention.hold_create` | Create a legal or operational hold |
| `retention.hold_update` | Change hold reason, scope, owner, or review date |
| `retention.hold_release` | Release a hold after independent review |
| `retention.override_date` | Change `retention_review_at` or `disposal_due_at` |
| `retention.override_state` | Request or apply an exceptional state transition |
| `retention.reconcile` | Reconcile provider/CRM state after execution uncertainty |

### 3.3 Suppression permissions

| Permission | Description |
|---|---|
| `suppression.apply` | Apply a controlled suppression reason |
| `suppression.reaffirm` | Confirm that an existing suppression remains necessary |
| `suppression.exception_create` | Create an ambiguous or unresolved suppression exception |
| `suppression.exception_review` | Review evidence and recommend an outcome |
| `suppression.release_approve` | Approve removal of suppression |
| `suppression.release_execute` | Apply an approved suppression removal |
| `suppression.rule_propose` | Propose a threshold, reason-code, or rule change |
| `suppression.rule_approve` | Approve a rule change after privacy review |
| `suppression.export_block` | Block an unsafe export or dashboard publication |

### 3.4 Destructive and administrative permissions

| Permission | Description |
|---|---|
| `retention.anonymise_execute` | Execute approved anonymisation through the service adapter |
| `retention.delete_execute` | Execute approved deletion through the service adapter |
| `retention.batch_pause` | Pause a retention run or batch |
| `retention.batch_resume` | Resume a paused batch after required review |
| `audit.write_system` | Append system audit events; no update/delete |
| `audit.configuration_change` | Change audit configuration or schema version |
| `rbac.assign` | Assign or remove roles |
| `rbac.break_glass` | Request time-limited emergency access |
| `config.retention_change` | Change schedule, allowlist, mode, batch, or retry configuration |

## 4. Core RBAC matrix

Legend: **A** = allowed within scope; **R** = request/recommend only; **V** = view only; **2P** = allowed only with independent second-person approval; **S** = service-account only; **E** = emergency, time-limited, and incident-bound; **—** = denied.

| Action | Coordinator | Team lead | Programme director | Privacy lead/DPO | Safeguarding lead | Security lead | CRM admin | Retention operator | Audit reviewer | Pipeline service |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View scoped operational retention metadata | A | A | V | A | V | V | V | V | V | S |
| View global retention summary | — | V | A | A | — | V | V | V | A | S |
| Create review task | A | A | A | A | — | — | — | S | — | S |
| Assign review owner | — | A | A | A | — | — | — | S | — | S |
| Set `exception` state | R | R | R | A | R | A for incident scope | — | S | — | S |
| Create hold | R | R | R | A | A for safeguarding scope | A for security scope | — | — | — | S |
| Update hold metadata | — | — | R | A | A for safeguarding scope | A for security scope | — | — | — | S |
| Release hold | — | — | — | 2P | A for safeguarding scope, 2P | A for security scope, 2P | — | — | V | — |
| Change retention date | — | R | R | A with reason | — | A for incident scope | — | S by approved rule | — | S by approved rule |
| Approve anonymisation | — | — | R | 2P | — | 2P for incident scope | — | — | V | — |
| Approve deletion | — | — | R | 2P | — | 2P for incident scope | — | — | V | — |
| Execute anonymisation | — | — | — | — | — | — | — | S, approved batch | — | S |
| Execute deletion | — | — | — | — | — | — | — | S, approved batch | — | S |
| Reconcile unknown provider result | — | — | R | A | — | A for incident scope | A technical result | S | V | S |
| Apply suppression | R | R | R | A | A for restricted scope | A for incident scope | — | S by rule | — | S |
| Create suppression exception | R | R | R | A | A for restricted scope | A for incident scope | — | S | — | S |
| Review suppression exception | — | R | R | A | A for restricted scope | A for incident scope | — | — | V | — |
| Approve suppression release | — | — | — | 2P | 2P for restricted scope | 2P for incident scope | — | — | V | — |
| Execute approved suppression release | — | — | — | — | — | — | — | S | — | S |
| Block unsafe export | — | R | R | A | A for restricted scope | A for security scope | A technical block | S | V | S |
| Change suppression rule | — | R | R | 2P | R for restricted scope | R for security impact | — | — | V | — |
| Pause retention batch | — | R | R | A | — | A for incident scope | A technical pause | S | V | S |
| Resume retention batch | — | — | R | 2P | — | 2P for incident scope | A technical resume | S after approval | V | S |
| Change retention configuration | — | R | R | 2P | — | 2P for security impact | A technical implementation | — | V | — |
| Read restricted audit evidence | — | — | — | A | A for own scope | A for own scope | — | — | 2P/purpose-bound | — |
| Assign roles | — | — | — | R | — | 2P for privileged roles | A with approval | — | V | — |

The matrix must be implemented as both coarse roles and action-level policy checks. Where a CRM cannot support the required separation, use a server-side authorization service or separate approval and execution identities.

## 5. Retention override workflow

A retention override changes a review date, disposal date, state, record class, hold, or other value that could delay, accelerate, or redirect retention. It must not be an informal edit.

### 5.1 Permitted override reasons

Use controlled reason codes:

```text
late_reconciliation
pending_correction
rights_request
legal_hold
operational_hold
open_incident
restricted_schedule
approved_extension
approved_early_disposal
provider_recovery
data_quality_review
```

### 5.2 Required override sequence

1. The requester submits an override request with the object reference hash, current value, requested value, reason code, purpose code, affected record class, and proposed expiry/review date.
2. The policy engine checks the requester’s role, scope, record class, and conflict-of-interest status.
3. The system creates `retention_override_requested` and assigns an independent reviewer.
4. The reviewer validates the reason, downstream impact, hold/request status, and minimum necessary duration.
5. Approval creates `retention_override_approved` with the reviewer identity and approval reference. Rejection creates `retention_override_rejected`.
6. A service or specifically authorized administrator applies the change. The application re-checks current state immediately before mutation.
7. The system emits `retention_override_applied` or `retention_override_failed` and schedules a review or expiry event.

A requester must not approve their own override. A programme director may request an operational extension but may not approve a deletion override. A privacy lead may approve only where the action is within the privacy remit and an independent second approver is present for destructive or high-risk changes.

### 5.3 Override fields

```ts
export interface RetentionOverrideRequest {
  requestId: string;
  objectClass: string;
  objectRefHash: string;
  currentState: string;
  requestedState?: string;
  currentDate?: string;
  requestedDate?: string;
  reasonCode: string;
  purposeCode: string;
  requesterActorHash: string;
  requesterRole: string;
  reviewerActorHash?: string;
  approvalRefHash?: string;
  conflictCheckPassed: boolean;
  requestedAtUtc: string;
  expiresAtUtc?: string;
  status: "requested" | "approved" | "rejected" | "applied" | "expired" | "cancelled";
}
```

## 6. Suppression-exception workflow

A suppression exception is created when the system cannot safely determine whether data may be used in aggregate reporting, or when an authorized person requests a review of an applied suppression. It must never expose the underlying sensitive narrative in ordinary CRM views or audit logs.

### 6.1 Suppression outcomes

A reviewer may select only one of these outcomes:

| Outcome | Meaning |
|---|---|
| `retain_suppression` | Continue excluding the record or cohort |
| `recode_and_retain` | Correct a controlled category, then keep suppression until re-evaluated |
| `route_confidentially` | Move the issue to a restricted privacy/safeguarding route |
| `release_after_review` | Remove suppression after documented privacy review |
| `escalate_uncertain` | Keep suppression and escalate for specialist decision |

### 6.2 Required exception sequence

1. The source, export, or dashboard layer applies suppression and emits `suppression_applied`.
2. An ambiguous case creates `suppression_exception_created` with a reason code and owner role.
3. The assigned reviewer sees only the minimum coded evidence required for the decision.
4. The reviewer selects an approved outcome and records a purpose, rule version, and evidence reference hash.
5. A release decision requires an independent second approver when it could expose a small cell, sensitive category, confidential route, or identifiable result.
6. The service layer applies the outcome and emits `suppression_exception_resolved`.
7. Every subsequent export and dashboard request re-evaluates suppression server-side rather than trusting a client-provided flag.

### 6.3 Suppression action matrix

| Suppression action | Requester | Reviewer | Approver | Executor |
|---|---|---|---|---|
| Apply automatic rule | Pipeline service | Privacy lead reviews rule periodically | Privacy lead for rule version | Pipeline service |
| Apply manual suppression | Team lead or programme director may request | Privacy lead/DPO | Not required for low-risk existing rule; otherwise 2P | Pipeline service |
| Create exception | Scoped operational role | Privacy lead/DPO | Not applicable; exception remains protective | Pipeline service |
| Retain suppression | Privacy lead/DPO | Privacy lead/DPO | Second approver for high-risk scope | Pipeline service |
| Release small-cell suppression | Privacy lead/DPO | Independent privacy reviewer | 2P | Pipeline service |
| Release confidential-route suppression | Safeguarding/privacy lead | Independent privacy reviewer | 2P | Restricted service |
| Change rule threshold | Privacy lead proposes | Security/data reviewer | 2P with documented version | CRM admin/service |
| Block export | Privacy/security lead or service | Privacy lead reviews | Not required to block | Pipeline service |

## 7. Service-account and API enforcement

The application must derive role, scope, actor, and authorization context from the authenticated server session or trusted scheduler identity. It must ignore client-supplied values for `actor`, `role`, `approvalRef`, `recordClass`, `previousState`, and `nextState`.

A destructive endpoint should follow this pattern:

```ts
function authorizeDisposal(input: {
  actor: AuthContext;
  record: RetentionRecord;
  approval: ApprovalRecord | null;
  config: RetentionConfig;
}): void {
  if (input.actor.actorType !== "service") {
    throw new Error("destructive operation requires the retention service identity");
  }
  if (!input.approval || input.approval.status !== "approved") {
    throw new Error("valid independent approval is required");
  }
  if (input.record.retentionHold || input.record.unresolvedRightsRequest || input.record.openIncident || input.record.pendingCorrection) {
    throw new Error("record is protected by a disposal gate");
  }
  if (input.record.privacySuppressed && input.record.recordClass !== "aggregate_read_model") {
    throw new Error("suppressed record requires privacy review before disposal");
  }
  if (!input.config.allowRecordClasses.has(input.record.recordClass)) {
    throw new Error("record class is not allowlisted");
  }
}
```

The final preflight check must occur in the same transaction or provider operation boundary as the mutation where possible. If the CRM cannot provide a transaction, use a compare-and-set version field so a concurrent hold or correction causes the operation to fail safely.

## 8. Break-glass access

Break-glass access is for a time-critical security, safeguarding, or operational incident only. It is not a convenience role and cannot be used to bypass approval for deletion.

Break-glass access requires an incident reference, named requester, named approver, reason code, exact scope, start time, expiry time, and automatic revocation. The emergency responder may view or pause affected processing but may not permanently delete records unless the ordinary independent approval chain is completed. Every use creates a high-severity security audit event and triggers retrospective review within one business day or the period approved by HMSI policy.

## 9. Audit requirements for every privileged action

Every override, exception, approval, release, execution, rejection, and denied attempt must create an audit event containing:

| Field | Requirement |
|---|---|
| `event_id` | Unique server-generated ID |
| `event_type` | Versioned allowlisted name |
| `occurred_at_utc` / `recorded_at_utc` | Separate UTC timestamps |
| `run_id` / `batch_id` | Required for automated work |
| `object_class` | Controlled record class |
| `object_ref_hash` | Keyed hash; never direct identifier |
| `previous_state` / `next_state` | Required for state transitions |
| `reason_code` | Controlled reason; no free-form narrative |
| `rule_version` | Version of policy or suppression rule |
| `actor_type` / `actor_ref_hash` | Human, service, workflow, or scheduler |
| `authorization_role` | Effective role used for decision |
| `purpose_code` | Approved business/privacy purpose |
| `approval_ref_hash` | Required for high-risk actions |
| `result` | Accepted, completed, skipped, rejected, failed, or unknown |
| `error_class` | Bounded failure category where applicable |
| `event_digest` | Tamper-evident integrity value |

Denied actions must be logged without revealing restricted record content. Do not log the full request body, access token, CRM record URL, free-text explanation, or personal data.

## 10. Role lifecycle and access reviews

Provision roles through an approved joiner–mover–leaver process. Access must be removed promptly when a person leaves HMSI, changes team, loses the relevant purpose, or is placed under an access restriction.

Conduct privileged-role reviews at least quarterly and after every incident, major configuration change, or role departure. The review must compare assigned roles with actual actions, identify dormant accounts, verify break-glass expiry, confirm service-account scopes, and record remediation.

Use just-in-time elevation for privacy approval, rule changes, and break-glass actions wherever the CRM supports it. Separate development, test, staging, and production identities and ensure that test users cannot reach production data or destructive endpoints.

## 11. Mandatory negative tests

| Test | Expected result |
|---|---|
| Team lead attempts to approve own retention override | Denied and audited |
| Programme director attempts to approve deletion | Denied or converted to request-only action |
| CRM administrator directly clears suppression Boolean | Denied; workflow approval required |
| Client submits a forged `approvalRef` | Server ignores/rejects it |
| Service account attempts restricted safeguarding disposal | Denied and critical alert emitted |
| Retention operator attempts direct deletion outside approved batch | Denied |
| Approval exists but record gains a hold before execution | Final preflight blocks operation |
| Expired approval reference used | Denied |
| Break-glass role attempts permanent deletion | Denied unless ordinary approval chain exists |
| Ordinary user reads restricted audit event | Denied without disclosing sensitive content |
| User changes team scope but keeps old token | Scope is re-evaluated and old access removed |
| Suppression release lacks second approver for high-risk cell | Denied |
| Pipeline service receives client-supplied actor role | Client value is ignored; trusted identity used |

## 12. Implementation checklist

| Item | Owner | Status |
|---|---|:---:|
| Confirm CRM supports field-, record-, API-, export-, and workflow-level permissions | CRM administrator | [ ] |
| Create stable role and permission registry | Security lead | [ ] |
| Map CRM roles to the matrix | CRM administrator / DPO | [ ] |
| Implement server-side policy checks for every override and exception endpoint | Engineering | [ ] |
| Create two-person approval workflow for destructive and high-risk suppression releases | DPO / Security lead | [ ] |
| Separate retention service identity from approval identity | Engineering | [ ] |
| Add append-only privileged-action audit events | Engineering | [ ] |
| Configure break-glass process and automatic expiry | Security lead | [ ] |
| Execute negative authorization tests with synthetic fixtures | Test coordinator | [ ] |
| Review role assignments and service scopes before staging | DPO / Security lead | [ ] |
| Obtain privacy, security, and CRM administration sign-off | Named approvers | [ ] |

## References

[1]: ./hmsi-data-governance-volunteer-privacy-compliance-policy.md "HMSI Data Governance and Volunteer Privacy Compliance Policy"

[2]: ./hmsi-retention-audit-logging-specification.md "HMSI Retention Audit Logging Specification"

[3]: ./hmsi-staged-retention-automation-scripts.md "HMSI Staged Retention Automation Scripts and Workflow Rules"

[4]: ./hmsi-staged-retention-acceptance-test-checklist.md "HMSI Staged Retention State Machine Acceptance Test Checklist"

[5]: ./hmsi-crm-retention-suppression-configuration-runbook.md "HMSI CRM Retention and Suppression Configuration Runbook"

[6]: https://ndpc.gov.ng/resources/ "Nigeria Data Protection Commission — Resources"

[7]: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf "Nigeria Data Protection Act 2023 — General Application and Implementation Directive 2025"
