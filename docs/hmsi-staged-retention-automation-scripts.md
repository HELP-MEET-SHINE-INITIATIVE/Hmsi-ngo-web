# HMSI Staged Retention Automation Scripts and CRM Workflow Rules

**Status:** Production-oriented reference implementation. The CRM adapter must be implemented against the selected CRM’s authenticated API or native workflow engine before activation.

> **Safety notice:** This document contains destructive-operation logic. It must remain in dry-run mode until HMSI approves the retention schedule, legal-hold process, downstream deletion semantics, privacy review, and recovery procedure. A qualified privacy adviser should confirm the legal and regulatory requirements before production deletion is enabled.

## 1. Required state machine

The CRM must use explicit states rather than a single “delete after date” rule. Every transition is controlled, idempotent, and recorded.

```text
active
  └─ retention_review_at <= now
       ├─ valid hold / unresolved request / incident / correction → hold or exception
       ├─ restricted record class → restricted_schedule
       ├─ safe to remove direct identifiers → anonymise_due → anonymised
       └─ approved for full disposal → delete_due → deleted
```

The normal analytics lifecycle must not automatically control safeguarding, security, health, identity-document, or confidential support records. Those records use a separate restricted schedule.

## 2. Configuration values

Use environment variables or the CRM’s secret/configuration store. Do not hardcode credentials, webhook secrets, CRM URLs, or production identifiers.

```text
RETENTION_MODE=dry_run
RETENTION_TIMEZONE=UTC
RETENTION_BATCH_SIZE=100
RETENTION_MAX_BATCHES_PER_RUN=10
RETENTION_MIN_REVIEW_AGE_DAYS=0
RETENTION_REQUIRE_APPROVAL=true
RETENTION_APPROVAL_REFERENCE=
RETENTION_ALLOW_RECORD_CLASSES=raw_feedback_payload,crm_source_export,normalized_feedback,aggregate_read_model
RETENTION_BLOCK_RESTRICTED_CLASSES=true
RETENTION_REQUIRE_EXPORT_RECONCILIATION=true
RETENTION_REQUIRE_AUDIT_WRITE=true
RETENTION_RETRY_LIMIT=3
RETENTION_LOCK_TTL_SECONDS=900
```

`RETENTION_MODE` accepts only `dry_run`, `review_only`, or `execute`. The default and deployment-safe value is `dry_run`. `execute` must fail closed unless `RETENTION_REQUIRE_APPROVAL=true` has been satisfied with a non-empty approval reference.

## 3. Adapter contract

The scheduler and policy engine should not contain vendor-specific CRM calls. Implement one adapter for the selected CRM and test it separately.

```ts
export type RetentionState =
  | "active"
  | "review_due"
  | "hold"
  | "anonymise_due"
  | "delete_due"
  | "deleted"
  | "anonymised"
  | "exception";

export type RecordClass =
  | "raw_feedback_payload"
  | "crm_source_export"
  | "normalized_feedback"
  | "aggregate_read_model"
  | "audit_metadata"
  | "restricted_support"
  | "safeguarding"
  | "security_incident";

export interface RetentionRecord {
  id: string;
  recordClass: RecordClass;
  retentionState: RetentionState;
  retentionReviewAt?: string;
  disposalDueAt?: string;
  retentionHold: boolean;
  retentionHoldReason?: string;
  retentionHoldOwner?: string;
  retentionHoldReviewAt?: string;
  privacySuppressed: boolean;
  suppressionReason?: string;
  aggregateExportEligible: boolean;
  lastSuccessfulReconciliationAt?: string;
  lastExportRunId?: string;
  unresolvedRightsRequest: boolean;
  openIncident: boolean;
  pendingCorrection: boolean;
  lastDisposalEventRef?: string;
  updatedAt: string;
}

export interface AuditEvent {
  eventType: string;
  batchId: string;
  recordClass?: RecordClass;
  recordCountBand?: "0" | "1-4" | "5-9" | "10-24" | "25+";
  recordHash?: string;
  runId?: string;
  result: "planned" | "completed" | "skipped" | "failed";
  reasonCode?: string;
  actor: "system" | "privacy_lead" | "crm_admin";
  occurredAt: string;
  errorClass?: string;
}

export interface RetentionAdapter {
  acquireRunLock(lockName: string, ttlSeconds: number): Promise<boolean>;
  releaseRunLock(lockName: string): Promise<void>;
  findCandidates(input: {
    now: string;
    states: RetentionState[];
    recordClasses: RecordClass[];
    limit: number;
  }): Promise<RetentionRecord[]>;
  hasTrustedReconciliation(record: RetentionRecord): Promise<boolean>;
  hasOpenRightsRequest(record: RetentionRecord): Promise<boolean>;
  hasActiveHold(record: RetentionRecord, now: string): Promise<boolean>;
  markReviewDue(recordId: string, batchId: string): Promise<void>;
  markHold(recordId: string, batchId: string, reasonCode: string): Promise<void>;
  markException(recordId: string, batchId: string, reasonCode: string): Promise<void>;
  markAnonymiseDue(recordId: string, batchId: string): Promise<void>;
  anonymise(recordId: string, batchId: string): Promise<{ removedFields: string[] }>;
  delete(recordId: string, batchId: string): Promise<void>;
  writeAudit(event: AuditEvent): Promise<void>;
}
```

The adapter must use a service account with the minimum read/write scope. The `delete` method must not be available to ordinary CRM users. It should invoke the provider’s documented deletion or purge mechanism and return only bounded metadata to the caller.

## 4. Common helper functions

```ts
export function countBand(count: number): AuditEvent["recordCountBand"] {
  if (count === 0) return "0";
  if (count < 5) return "1-4";
  if (count < 10) return "5-9";
  if (count < 25) return "10-24";
  return "25+";
}

export function isPast(value: string | undefined, now: Date): boolean {
  return Boolean(value && new Date(value).getTime() <= now.getTime());
}

export function isRestricted(recordClass: RecordClass): boolean {
  return ["restricted_support", "safeguarding", "security_incident"].includes(recordClass);
}

export function isApprovedForExecution(config: RetentionConfig): boolean {
  return config.mode === "execute" &&
    (!config.requireApproval || Boolean(config.approvalReference));
}

export interface RetentionConfig {
  mode: "dry_run" | "review_only" | "execute";
  batchSize: number;
  maxBatches: number;
  lockTtlSeconds: number;
  retryLimit: number;
  requireApproval: boolean;
  approvalReference?: string;
  requireExportReconciliation: boolean;
  allowRecordClasses: Set<RecordClass>;
}
```

## 5. Staged retention job

The following reference implementation is intentionally fail-closed. It does not delete anything in `dry_run` or `review_only` mode. It also refuses to process restricted classes, records with active holds, unresolved rights requests, open incidents, pending corrections, failed reconciliation, or unapproved record classes.

```ts
import { randomUUID, createHash } from "node:crypto";

export async function runRetentionJob(
  adapter: RetentionAdapter,
  config: RetentionConfig,
  clock = () => new Date(),
): Promise<{ batchId: string; planned: number; completed: number; skipped: number; failed: number }> {
  const batchId = `retention-${clock().toISOString().replace(/[^0-9]/g, "")}-${randomUUID()}`;
  const lockName = "hmsi-retention-automation";
  const now = clock();
  const nowIso = now.toISOString();

  if (!Number.isInteger(config.batchSize) || config.batchSize < 1 || config.batchSize > 500) {
    throw new Error("Invalid RETENTION_BATCH_SIZE; expected an integer from 1 to 500");
  }
  if (!Number.isInteger(config.maxBatches) || config.maxBatches < 1 || config.maxBatches > 100) {
    throw new Error("Invalid RETENTION_MAX_BATCHES_PER_RUN; expected an integer from 1 to 100");
  }
  if (config.mode === "execute" && config.requireApproval && !config.approvalReference) {
    throw new Error("Refusing execute mode without RETENTION_APPROVAL_REFERENCE");
  }

  const locked = await adapter.acquireRunLock(lockName, config.lockTtlSeconds);
  if (!locked) throw new Error("A retention run is already active");

  let planned = 0;
  let completed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    await adapter.writeAudit({
      eventType: "retention_run_started",
      batchId,
      result: "planned",
      actor: "system",
      occurredAt: nowIso,
    });

    for (let batchNumber = 0; batchNumber < config.maxBatches; batchNumber += 1) {
      const records = await adapter.findCandidates({
        now: nowIso,
        states: ["active", "review_due", "anonymise_due", "delete_due", "exception"],
        recordClasses: [...config.allowRecordClasses],
        limit: config.batchSize,
      });
      if (records.length === 0) break;

      for (const record of records) {
        planned += 1;
        const recordHash = createHash("sha256").update(record.id).digest("hex").slice(0, 16);
        try {
          const result = await processRecord(adapter, record, config, batchId, now, recordHash);
          if (result === "completed") completed += 1;
          else skipped += 1;
        } catch (error) {
          failed += 1;
          await adapter.writeAudit({
            eventType: "retention_record_failed",
            batchId,
            recordClass: record.recordClass,
            recordHash,
            result: "failed",
            reasonCode: "unhandled_processing_error",
            errorClass: error instanceof Error ? error.name : "unknown",
            actor: "system",
            occurredAt: clock().toISOString(),
          });
        }
      }
    }

    await adapter.writeAudit({
      eventType: "retention_run_completed",
      batchId,
      recordCountBand: countBand(planned),
      result: failed > 0 ? "failed" : "completed",
      reasonCode: `planned=${planned};completed=${completed};skipped=${skipped};failed=${failed}`,
      actor: "system",
      occurredAt: clock().toISOString(),
    });
    return { batchId, planned, completed, skipped, failed };
  } finally {
    await adapter.releaseRunLock(lockName);
  }
}
```

## 6. Record-processing gates

```ts
async function processRecord(
  adapter: RetentionAdapter,
  record: RetentionRecord,
  config: RetentionConfig,
  batchId: string,
  now: Date,
  recordHash: string,
): Promise<"completed" | "skipped"> {
  const nowIso = now.toISOString();

  if (!config.allowRecordClasses.has(record.recordClass)) {
    await adapter.writeAudit({
      eventType: "retention_record_skipped",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "skipped",
      reasonCode: "record_class_not_allowlisted",
      actor: "system",
      occurredAt: nowIso,
    });
    return "skipped";
  }

  if (isRestricted(record.recordClass)) {
    await adapter.writeAudit({
      eventType: "restricted_schedule_excluded",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "skipped",
      reasonCode: "restricted_record_class",
      actor: "system",
      occurredAt: nowIso,
    });
    return "skipped";
  }

  if (record.retentionHold || await adapter.hasActiveHold(record, nowIso)) {
    await adapter.markHold(record.id, batchId, "active_hold");
    await adapter.writeAudit({
      eventType: "hold_skipped",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "skipped",
      reasonCode: "active_hold",
      actor: "system",
      occurredAt: nowIso,
    });
    return "skipped";
  }

  if (await adapter.hasOpenRightsRequest(record)) {
    await adapter.markException(record.id, batchId, "open_rights_request");
    await adapter.writeAudit({
      eventType: "retention_exception_created",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "skipped",
      reasonCode: "open_rights_request",
      actor: "system",
      occurredAt: nowIso,
    });
    return "skipped";
  }

  if (record.openIncident || record.pendingCorrection) {
    await adapter.markException(record.id, batchId, record.openIncident ? "open_incident" : "pending_correction");
    await adapter.writeAudit({
      eventType: "retention_exception_created",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "skipped",
      reasonCode: record.openIncident ? "open_incident" : "pending_correction",
      actor: "system",
      occurredAt: nowIso,
    });
    return "skipped";
  }

  if (config.requireExportReconciliation && !await adapter.hasTrustedReconciliation(record)) {
    await adapter.markException(record.id, batchId, "reconciliation_not_confirmed");
    await adapter.writeAudit({
      eventType: "retention_exception_created",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "skipped",
      reasonCode: "reconciliation_not_confirmed",
      actor: "system",
      occurredAt: nowIso,
    });
    return "skipped";
  }

  if (!isPast(record.retentionReviewAt, now)) {
    return "skipped";
  }

  if (record.retentionState === "active" || record.retentionState === "review_due" || record.retentionState === "exception") {
    await adapter.markReviewDue(record.id, batchId);
    await adapter.writeAudit({
      eventType: "retention_review_ready",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "planned",
      reasonCode: "review_gates_passed",
      actor: "system",
      occurredAt: nowIso,
    });
    return "skipped";
  }

  if (record.retentionState === "anonymise_due") {
    if (!isApprovedForExecution(config)) {
      await adapter.writeAudit({
        eventType: "anonymisation_planned",
        batchId,
        recordClass: record.recordClass,
        recordHash,
        result: "planned",
        reasonCode: "execution_not_approved",
        actor: "system",
        occurredAt: nowIso,
      });
      return "skipped";
    }
    const result = await adapter.anonymise(record.id, batchId);
    await adapter.writeAudit({
      eventType: "anonymisation_completed",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "completed",
      reasonCode: `removed_fields=${result.removedFields.length}`,
      actor: "system",
      occurredAt: nowIso,
    });
    return "completed";
  }

  if (record.retentionState === "delete_due") {
    if (!isApprovedForExecution(config)) {
      await adapter.writeAudit({
        eventType: "deletion_planned",
        batchId,
        recordClass: record.recordClass,
        recordHash,
        result: "planned",
        reasonCode: "execution_not_approved",
        actor: "system",
        occurredAt: nowIso,
      });
      return "skipped";
    }
    await adapter.delete(record.id, batchId);
    await adapter.writeAudit({
      eventType: "deletion_completed",
      batchId,
      recordClass: record.recordClass,
      recordHash,
      result: "completed",
      actor: "system",
      occurredAt: nowIso,
    });
    return "completed";
  }

  return "skipped";
}
```

## 7. Separate approval workflow

The daily job should normally move eligible records to `review_due`; it should not directly delete them. A separate privacy approval workflow reviews the batch and either moves records to `anonymise_due` or `delete_due`, or records an exception.

### CRM workflow: `RET-01 — Mark retention review due`

| Trigger | Conditions | Actions |
|---|---|---|
| Hourly or daily schedule | `retention_review_at <= current UTC time`; `retention_state = active`; record class is allowlisted | Set `retention_state = review_due`; create a bounded review event; assign the record class owner; do not delete or anonymise |

### CRM workflow: `RET-02 — Move valid hold to hold state`

| Trigger | Conditions | Actions |
|---|---|---|
| On record update and daily schedule | `retention_hold = true` or an active hold exists | Set `retention_state = hold`; require reason, owner, and review date; create `hold_created` or `hold_skipped` audit event |

### CRM workflow: `RET-03 — Escalate overdue hold review`

| Trigger | Conditions | Actions |
|---|---|---|
| Daily schedule | `retention_state = hold`; `retention_hold_review_at < now` | Create a privacy-lead task; notify the hold owner; preserve the hold; do not delete automatically; create `hold_review_overdue` audit event |

### CRM workflow: `RET-04 — Exclude restricted records`

| Trigger | Conditions | Actions |
|---|---|---|
| On record creation/update | `record_class` is `restricted_support`, `safeguarding`, or `security_incident` | Set `aggregate_export_eligible = false`; set `privacy_suppressed = true`; route to the restricted schedule; create `restricted_schedule_excluded` audit event |

### CRM workflow: `RET-05 — Apply source suppression`

| Trigger | Conditions | Actions |
|---|---|---|
| On feedback update or before export | Confidential route, unresolved identity, sensitive content, quality failure, or manual privacy review | Set `privacy_suppressed = true`; set controlled `suppression_reason`; exclude from ordinary exports; create `suppression_applied` audit event |

### CRM workflow: `RET-06 — Reconciliation gate`

| Trigger | Conditions | Actions |
|---|---|---|
| After export/reconciliation job | No successful reconciliation for the record’s source period, checksum mismatch, or partial export | Set `aggregate_export_eligible = false`; set `retention_state = exception`; assign pipeline-owner task; retain prior trusted aggregate run |

### CRM workflow: `RET-07 — Rights and incident gate`

| Trigger | Conditions | Actions |
|---|---|---|
| On rights request or incident creation | Open rights request, open incident, or pending correction exists | Set `retention_state = exception`; block anonymisation/deletion; assign privacy/incident owner; create bounded audit event |

### CRM workflow: `RET-08 — Privacy approval decision`

| Trigger | Conditions | Actions |
|---|---|---|
| Named privacy lead action | `retention_state = review_due`; all gates pass; approved batch and record class | Set `retention_state = anonymise_due` or `delete_due`; store approval reference and reviewer; create `retention_approved` audit event |

### CRM workflow: `RET-09 — Anonymise eligible record`

| Trigger | Conditions | Actions |
|---|---|---|
| Scheduled execution worker | `retention_state = anonymise_due`; no hold, rights request, incident, correction, or restricted class; execution mode approved | Remove direct identifiers and source links; retain only approved aggregate fields; set `retention_state = anonymised`; create disposal reference |

### CRM workflow: `RET-10 — Delete eligible record`

| Trigger | Conditions | Actions |
|---|---|---|
| Scheduled execution worker | `retention_state = delete_due`; same gates pass; explicit approval exists; batch limit not exceeded | Delete through approved API; verify result; write audit metadata outside the deleted record; retry only transient errors |

## 8. Retry and recovery rules

Retries must be limited and classified. A transient provider timeout may be retried; an authorization failure, schema mismatch, hold conflict, or unknown deletion result must stop the record and create an exception.

```ts
type ErrorClass =
  | "transient_network"
  | "provider_rate_limit"
  | "provider_unavailable"
  | "authorization"
  | "validation"
  | "hold_conflict"
  | "unknown_deletion_result"
  | "audit_write_failure";

export function shouldRetry(errorClass: ErrorClass, attempt: number, retryLimit: number): boolean {
  if (attempt >= retryLimit) return false;
  return ["transient_network", "provider_rate_limit", "provider_unavailable"].includes(errorClass);
}
```

If the CRM deletion call times out after submission, do not repeat blindly. Mark the record `exception` with `unknown_deletion_result`, reconcile against the CRM by immutable record reference, and have an administrator resolve the outcome. The audit write is a release gate: if the system cannot record a successful deletion event, it must alert and stop further destructive batches.

Recovery is record-class dependent. Anonymisation may be reversible only from a protected backup under an approved process; hard deletion may not be recoverable from the CRM. Therefore, the pre-execution process must confirm that the approved retention schedule does not require a recoverable archive and that downstream copies, staging files, exports, and backups have a documented expiry process.

## 9. SQL-like candidate queries

If the CRM is backed by a relational database, use parameterised queries or stored procedures. Do not interpolate user-supplied filters. The following illustrates the selection logic; adapt names and permissions to the actual schema.

```sql
SELECT
  id,
  record_class,
  retention_state,
  retention_review_at,
  disposal_due_at,
  retention_hold,
  privacy_suppressed,
  aggregate_export_eligible,
  last_successful_reconciliation_at,
  unresolved_rights_request,
  open_incident,
  pending_correction,
  updated_at
FROM crm_retention_records
WHERE retention_state IN ('active', 'review_due', 'anonymise_due', 'delete_due', 'exception')
  AND retention_review_at <= :now_utc
  AND record_class IN (:approved_record_classes)
ORDER BY retention_review_at ASC, id ASC
LIMIT :batch_size;
```

The query must be executed by a restricted service role. A separate database transaction or stored procedure should re-check holds, rights requests, incidents, and corrections immediately before anonymisation or deletion to prevent a race between candidate selection and execution.

## 10. Required monitoring and alerts

Configure alerts for concurrent-run lock failures, execution mode changes, missing approval references, batch-size violations, repeated provider failures, audit-write failures, unknown deletion results, unexpected suppression-rate changes, overdue holds, failed reconciliation, and any attempt to process a restricted record class.

A safe alert contains the batch ID, record class, bounded count or hash, error class, owner, and next action. It must not contain names, email addresses, raw free text, access tokens, CRM URLs containing identifiers, or deletion payloads.

## 11. Synthetic acceptance tests

Run these tests in a test workspace before production activation:

| Test | Expected result |
|---|---|
| Default configuration starts a run | Job uses dry-run mode and makes no destructive CRM call. |
| Execute mode without approval reference | Job fails before candidate processing. |
| Batch size above maximum | Configuration validation fails. |
| Duplicate scheduler invocation | Second invocation cannot acquire the run lock. |
| Active hold | Record moves or remains in `hold`; no deletion call occurs. |
| Overdue hold review | Privacy task is created; hold remains active. |
| Open rights request | Record becomes `exception`; no anonymisation or deletion occurs. |
| Open incident or pending correction | Record becomes `exception`; no destructive call occurs. |
| Restricted record class | Record is excluded and suppressed; no ordinary retention action occurs. |
| Failed reconciliation | Record becomes `exception`; prior trusted aggregate remains unaffected. |
| Suppressed record | Record is absent from aggregate export and remains absent after rerun. |
| Review-due record | Record is marked `review_due`; no deletion occurs. |
| Approved anonymisation | Only allowlisted direct identifiers/source links are removed; aggregate fields remain. |
| Approved deletion | CRM deletion is called once; completion audit event is written. |
| Deletion timeout | Record becomes `exception`; no blind retry; reconciliation task is created. |
| Audit store unavailable | Destructive action is blocked or halted according to the fail-closed adapter policy. |
| Retryable network error | Bounded retry occurs; retry count is logged without sensitive data. |
| Permanent authorization error | No retry; owner receives an actionable failure. |
| Malformed provider record | Record is quarantined or held; no partial deletion occurs. |

## 12. Activation sequence

Keep all workflows disabled in the production CRM until the privacy lead approves the schedule and the service account has been tested. Deploy the schema and fields first, then enable `RET-01` through `RET-07` in review-only mode. Run at least one complete synthetic cycle and inspect audit events, views, suppression behavior, and export output.

Next, enable the separate approval workflow. Require a named reviewer and approval reference for every batch that transitions records to `anonymise_due` or `delete_due`. Run one bounded production batch in `dry_run`, compare the candidate list with the approved review list, and obtain a second-person verification for the first execution.

Only then set `RETENTION_MODE=execute`, retain the batch limit, monitor the audit and provider results, and pause immediately if any unknown deletion result, audit-write failure, restricted-class match, or unexpected count occurs. Increase batch size only after the first runs are reconciled and signed off.

## 13. CRM-specific implementation mapping

The exact CRM syntax still depends on the selected product. Map the reference components as follows:

| Reference component | Typical CRM equivalent |
|---|---|
| Stable fields | Custom fields or columns |
| Controlled values | Picklists, enumerations, validation rules |
| `RET-01` to `RET-10` | Native workflows, scheduled automations, serverless jobs, or integration-platform flows |
| `RetentionAdapter` | Authenticated CRM API client or stored procedure wrapper |
| Run lock | Redis/DB lock, CRM automation mutex, or scheduler singleton |
| Audit ledger | Immutable audit object, protected database table, or dedicated log store |
| Restricted schedule | Separate object, workspace, permission set, or case-management system |
| Aggregate export view | Named report/view with field allowlist and service-account access |
| Privacy approval | Approval object/workflow with named reviewer and reference |

Do not treat a CRM’s “archive” button as equivalent to deletion or anonymisation until the provider’s retention, backup, search, export, API, and subprocessor behavior has been verified.

## References

[1]: ./hmsi-data-governance-volunteer-privacy-compliance-policy.md "HMSI Data Governance and Volunteer Privacy Compliance Policy"

[2]: ./hmsi-crm-retention-suppression-configuration-runbook.md "HMSI CRM Retention and Suppression Configuration Runbook"

[3]: ./hmsi-typeform-crm-retention-data-pipeline-specification.md "HMSI Typeform and CRM Retention Data Pipeline Specification"

[4]: https://ndpc.gov.ng/resources/ "Nigeria Data Protection Commission — Resources"

[5]: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf "Nigeria Data Protection Act (NDP Act) 2023 — General Application and Implementation Directive (GAID) 2025"
