# HMSI RBAC Configuration Guide: Salesforce and HubSpot

**Purpose:** Translate the HMSI retention-override and suppression-exception RBAC matrix into concrete Salesforce and HubSpot configuration patterns.

**Status:** Platform-mapping guide; validate against the selected product edition, license tier, installed packages, API capabilities, and current vendor documentation before production activation.

> **Important:** This is an implementation guide, not formal legal advice. HMSI should obtain privacy and security sign-off before granting retention override, suppression release, anonymisation, or deletion authority.

## 1. Recommended target architecture

For both platforms, use the CRM for operational records and controlled metadata, but place high-risk retention execution behind a server-side policy service. The CRM should allow users to request, review, and approve within scope. A non-interactive retention service should be the only identity permitted to execute anonymisation or deletion after independent approval.

The minimum control chain is:

```text
Operational user request
  → scoped review
  → privacy/security approval
  → server-side preflight
  → retention service execution
  → CRM/provider reconciliation
  → append-only audit event
```

Do not depend on a hidden button, page layout, client-side property, or user-interface convention as the only control. Salesforce documents that profiles and permission sets provide object- and field-level security while record-level sharing controls record access.[1] HubSpot documents that permissions control view/create/edit/delete access to CRM objects and that property access and team/content access can be restricted.[3]

## 2. Common HMSI data model

Create the following logical objects or properties in either platform. Keep direct identifiers and sensitive narratives outside the audit object and aggregate reporting model.

| Logical object/property | Salesforce implementation | HubSpot implementation | Sensitivity |
|---|---|---|---|
| Retention record | Custom object `HMSI_Retention_Record__c` | Custom object `hmsi_retention_record` if available; otherwise a restricted custom record model | Confidential |
| Audit event | Custom object `HMSI_Retention_Audit__c` plus external immutable store | Custom object or external append-only audit store | Restricted |
| Override request | Custom object `HMSI_Retention_Override__c` | Custom object or external approval service | Restricted |
| Suppression exception | Custom object `HMSI_Suppression_Exception__c` | Custom object or external privacy queue | Restricted |
| Legal/operational hold | Custom object `HMSI_Retention_Hold__c` | Custom object or external case/hold system | Restricted |
| Record class | Picklist `Record_Class__c` | Enumeration property `record_class` | Internal |
| Retention state | Picklist `Retention_State__c` | Enumeration property `retention_state` | Internal |
| Suppression status | Checkbox plus reason picklist | Boolean plus enumeration properties | Confidential |
| Approval reference | Text/External ID `Approval_Reference__c` | String property `approval_reference` | Restricted |
| Aggregate export eligibility | Formula/controlled field | Calculated or workflow-maintained property | Internal |
| Immutable external reference | External ID `Audit_Event_Key__c` | String `audit_event_key` | Restricted |

Use controlled values, not free text, for record class, state, suppression reason, outcome, and approval type. Store the raw source or volunteer response in a separately protected system when it is not required for CRM operations.

## 3. Salesforce configuration

### 3.1 Baseline profile and permission-set strategy

Keep the base profile restrictive. Use permission sets and permission-set groups for additive access, so that a user receives only the capabilities required for the current assignment. Do not grant `Modify All Data`, `View All Data`, `Author Apex`, `Customize Application`, or unrestricted export permission to a retention reviewer merely to simplify configuration.

Create the following permission-set groups:

| Permission-set group | Purpose | Key grants | Explicit exclusions |
|---|---|---|---|
| `HMSI_Operational_Coordinator` | Day-to-day coordination | Read scoped retention status; create review requests; read assigned operational fields | No suppression release, hold release, export, anonymisation, deletion |
| `HMSI_Team_Lead` | Scoped team review | Read team records; create exception requests; recommend holds; read approved aggregate reports | No global read, self-approval, suppression release, disposal approval |
| `HMSI_Programme_Director` | Programme oversight | Read aggregate reports; request date extensions; review operational impact | No deletion approval, unrestricted identifiable export, suppression release |
| `HMSI_Privacy_Reviewer` | Privacy review | Read restricted privacy metadata; review suppression exceptions; create/approve holds within remit | No direct deletion execution; no unlogged bulk export |
| `HMSI_Privacy_Approver` | High-risk independent approval | Approve disposal and high-risk suppression release with approval object access | Must not be the requester or executor for the same transition |
| `HMSI_Safeguarding_Restricted` | Confidential route | Access restricted safeguarding/support object and related hold metadata | No ordinary dashboard or volunteer analytics access |
| `HMSI_Security_Reviewer` | Security and integrity review | Read security audit stream, break-glass events, configuration events | No ordinary volunteer record editing |
| `HMSI_Retention_Service_Execution` | Non-interactive execution | API access to approved retention object fields and controlled mutation endpoint | No interactive login, no user management, no global export |
| `HMSI_Audit_Compliance_Read` | Independent evidence | Read audit summaries and immutable event store | No CRM record mutation |
| `HMSI_CRM_Configuration_Admin` | Technical administration | Configure fields, flows, permission sets, and integration users | No privacy approval or routine restricted-record browsing |

Assign permission-set groups through a joiner–mover–leaver process. Require a named owner, start date, business purpose, and review date for `HMSI_Privacy_Approver`, `HMSI_Safeguarding_Restricted`, `HMSI_Security_Reviewer`, and `HMSI_Retention_Service_Execution`.

### 3.2 Object permissions

For `HMSI_Retention_Record__c`:

| Role | Read | Create | Edit | Delete | View All / Modify All |
|---|:---:|:---:|:---:|:---:|:---:|
| Operational coordinator | Scoped | No | No | No | No |
| Team lead | Scoped | Review request only | Limited request fields | No | No |
| Programme director | Aggregate / approved scope | No | Request fields only | No | No |
| Privacy reviewer | Scoped/global by remit | Yes | Privacy fields | No | No |
| Privacy approver | Approved scope | Yes | Approval fields | No | No |
| Retention service | Approved API scope | No | State through server-side action | No | No |
| CRM administrator | Configuration support | Yes | Technical fields | No by default | No by default |

For `HMSI_Retention_Audit__c`, ordinary users receive no direct object access. The audit writer integration user receives create-only access through a controlled endpoint or Apex service. The audit/compliance reader receives read access through a restricted report or external audit store. Disable update and delete for all human permission sets.

For `HMSI_Suppression_Exception__c`, team leads and programme directors may create requests but cannot approve release. Privacy reviewers can review and recommend. A second privacy approver is required for small-cell, cross-filter, confidential-route, or sensitive-content release.

### 3.3 Field-level security

Use field-level security rather than page layouts as the authoritative restriction. Make the following fields hidden or read-only for operational roles:

| Field | Operational coordinator | Team lead | Privacy reviewer | Retention service |
|---|---:|---:|---:|---:|
| `Retention_State__c` | Read-only/limited | Read-only | Edit through workflow | Controlled edit |
| `Retention_Review_At__c` | Hidden | Read-only | Edit with approval | Rule-driven edit |
| `Disposal_Due_At__c` | Hidden | Read-only | Edit with approval | Rule-driven edit |
| `Retention_Hold__c` | Hidden | Read-only | Edit through hold workflow | Read/check |
| `Retention_Hold_Reason__c` | Hidden | Hidden | Read/edit controlled | Read |
| `Privacy_Suppressed__c` | Read-only/hidden | Read-only | Edit through exception workflow | Read/apply rule |
| `Suppression_Reason__c` | Hidden | Read-only | Edit controlled | Read/apply rule |
| `Aggregate_Export_Eligible__c` | Read-only | Read-only | Read/edit through rule | Rule-driven edit |
| `Approval_Reference__c` | Hidden | Hidden | Read/write approval object | Read verification |
| `Object_Ref_Hash__c` | Hidden | Hidden | Read restricted | Read |
| Raw free text | Hidden | Hidden | Restricted object only | Never copied |

When Salesforce field history tracking or Field Audit Trail is available, enable it for retention state, review date, disposal date, hold, suppression, export eligibility, approval status, and permission changes. Treat vendor history as supporting evidence; keep the authoritative audit chain in the dedicated audit model.

### 3.4 Record-level sharing

Set organization-wide defaults for retention records and audit objects to the most restrictive setting available. Use role hierarchy, criteria-based sharing, sharing sets, restriction rules, or Apex managed sharing to provide only the necessary team or programme scope.

Recommended pattern:

- Operational coordinators see only records assigned to their team or work queue.
- Team leads see their team’s review metadata but not restricted support or safeguarding records.
- Privacy reviewers receive a separate privacy queue and controlled cross-team visibility.
- Safeguarding records reside in a separate restricted object or sharing domain.
- The retention service uses a dedicated integration user and approved server-side endpoint.
- The CRM administrator does not receive routine access to restricted data merely because they administer configuration.

Do not use the role hierarchy as a substitute for privacy scope. A senior manager’s position should not automatically grant access to raw feedback, safeguarding narratives, or direct identifiers.

### 3.5 Salesforce approval and Flow design

Create separate approval processes or Flow orchestration paths:

| Flow | Entry condition | Approval | Result |
|---|---|---|---|
| `HMSI_Retention_Review` | `Retention_Review_At__c <= NOW()` and active state | Privacy review task | `review_due` |
| `HMSI_Hold_Request` | Hold requested or incident-linked | Privacy, safeguarding, or security owner | `hold` |
| `HMSI_Disposal_Approval` | State is `anonymise_due` or `delete_due`; all gates pass | Two-person approval | Execution token/reference |
| `HMSI_Suppression_Exception` | Suppression is ambiguous or release requested | Privacy reviewer; second approver when high risk | Retain/recode/route/release |
| `HMSI_Break_Glass` | Incident-bound emergency request | Security approver; expiry required | Time-limited access or batch pause |

Flow entry criteria must be server-side and must re-check the current record version immediately before execution. Do not let a user edit `Retention_State__c` directly to bypass the approval process. Use validation rules to reject changes that do not originate from the approved Flow, Apex service, or controlled integration user.

### 3.6 Salesforce integration user

Create a dedicated integration user with a restrictive profile and `HMSI_Retention_Service_Execution` permission set. Use a connected app or named credential with secret storage and credential rotation. The integration user must:

- Read only allowlisted retention metadata and reconciliation status.
- Invoke only approved anonymisation/deletion service operations.
- Have no interactive login if Salesforce policy supports that restriction.
- Have no user-management, unrestricted export, or configuration rights.
- Require a valid approval reference and batch ID on every destructive call.
- Write an audit event before and after the provider operation through the server-side audit writer.

## 4. HubSpot configuration

HubSpot’s permissions model allows administrators to control view, create, edit, and delete access for CRM objects and activities, and supports restricting property edit access and access by teams.[3] Map the HMSI controls to those permission families, then use a server-side policy service where HubSpot cannot provide the required separation of duties.

### 4.1 Team and seat structure

Create dedicated HubSpot teams and assign seats according to operational scope:

| HubSpot team/seat group | HMSI purpose | Configuration pattern |
|---|---|---|
| `HMSI Operations` | Operational coordination | View/edit only assigned or team-scoped operational records |
| `HMSI Team Leads` | Team review | Team-scoped view; create review/exception requests |
| `HMSI Programme Directors` | Aggregate oversight | Read reports/dashboards; no restricted raw data |
| `HMSI Privacy Review` | Privacy exceptions and holds | Restricted custom-object/property access; approval workflow |
| `HMSI Safeguarding` | Confidential route | Separate restricted object or external system; minimum seat access |
| `HMSI Security` | Incident and access review | Audit/security access only |
| `HMSI CRM Admins` | Technical setup | Configuration permissions; no routine privacy decision rights |
| `HMSI Retention Service` | Integration identity | Private app with narrow scopes; no human seat use |
| `HMSI Compliance Read` | Evidence review | Read-only compliance reports and external audit store |

HubSpot plans and seats may limit custom objects, property restrictions, workflows, approvals, exports, and audit features. Confirm the subscribed tier before promising a native implementation. If a required control is unavailable, broker the high-risk action through the HMSI policy service rather than granting Super Admin access.

### 4.2 Custom objects and properties

If the subscribed HubSpot edition supports custom objects, create these objects:

- `HMSI Retention Record` with `record_class`, `retention_state`, `retention_review_at`, `disposal_due_at`, `retention_hold`, `hold_owner`, `hold_review_at`, `privacy_suppressed`, `suppression_reason`, `aggregate_export_eligible`, `reconciliation_state`, and `audit_event_key`.
- `HMSI Override Request` with requester, reviewer, approval status, reason, requested state/date, expiration, and approval reference.
- `HMSI Suppression Exception` with reason, risk level, review outcome, reviewer, second approver, and rule version.
- `HMSI Hold` with scope, owner, reason, review date, release decision, and incident/request reference.

Make retention and suppression properties non-editable for ordinary users. Where HubSpot cannot make an individual property read-only for a specific team or workflow path, do not expose it as the user-controlled source of truth; store the authoritative value in the policy service and synchronize a read-only display property to HubSpot.

### 4.3 HubSpot object permissions

| Role | Retention object | Override request | Suppression exception | Audit object/report |
|---|---|---|---|---|
| Operations | View scoped | Create | Create request only | No direct access |
| Team lead | View team | Create/recommend | Create/recommend | Summary only |
| Programme director | Aggregate/read | Create request | Read summary | Summary only |
| Privacy reviewer | View/edit controlled | Review | Review/edit controlled | Restricted read |
| Privacy approver | View approved scope | Approve | Approve high-risk release with 2P | Restricted read |
| CRM administrator | Configure | No approval | No approval | Technical configuration only |
| Retention service | API-controlled | Update status through service | Apply approved outcome | Append audit externally |
| Compliance reviewer | Read report | Read evidence | Read evidence | Read-only |

Do not grant HubSpot Super Admin solely to make retention operations work. Super Admin should be limited to named account administrators, and all high-risk actions should still require an external approval and audit path.

### 4.4 HubSpot workflows and approvals

Create the following workflows or server-side automations:

| Workflow | Trigger | Action |
|---|---|---|
| `HMSI - Retention Review Due` | Review timestamp reached | Set review queue status; create task; do not delete |
| `HMSI - Hold Protection` | Hold or incident flag becomes active | Set retention state to hold; block disposal path; notify owner |
| `HMSI - Suppression Apply` | Small-cell, confidential route, sensitive content, or quality rule | Set suppression and reason; exclude from reports |
| `HMSI - Suppression Exception Queue` | Ambiguous condition or release request | Create restricted exception record; assign privacy team |
| `HMSI - Reconciliation Gate` | Import/export is partial, conflicting, or unverified | Set exception state; preserve previous trusted report |
| `HMSI - Disposal Approval Request` | Approved reviewer marks eligible | Create approval task; require independent approver |
| `HMSI - Disposal Execution Callback` | External service confirms action | Update bounded result; attach audit event key; never accept arbitrary client status |

Native HubSpot workflows should not call a destructive endpoint based only on a contact property. The server-side policy service must re-query the record, check the approval, hold, rights, incident, correction, suppression, and reconciliation gates, and then perform the controlled operation.

### 4.5 HubSpot private app/service identity

Create a private app or equivalent integration identity with the narrowest available scopes. Separate read/reconciliation and execution credentials where possible. The service identity must not be used by staff as a normal login.

Required controls include:

- Store credentials in the secret manager; never in workflow text, notes, tickets, or properties.
- Allow only retention object/property reads and approved mutation endpoints.
- Restrict export scopes and contact-data access.
- Verify webhook signatures and replay protection for callbacks.
- Require server-generated approval references and run/batch IDs.
- Write audit evidence to the append-only audit store, not only to a HubSpot timeline note.
- Rotate the credential and review scopes after every role or integration change.

### 4.6 HubSpot audit and export limitations

Use HubSpot’s available audit, login, export, workflow, and account-activity features as supporting evidence, but do not assume that an activity timeline is an immutable compliance ledger. Reconcile the platform audit output with the HMSI audit service using run IDs, event keys, timestamps, actor class, and bounded counts.

Restrict export permissions to named privacy/compliance or integration users. Ensure aggregate export views exclude direct identifiers, raw feedback, precise locations, confidential-route references, and suppressed cells. If HubSpot’s native report builder cannot enforce cross-filter suppression reliably, generate the aggregate report in the HMSI policy/reporting service.

## 5. Shared approval matrix

The same separation-of-duties model applies to both platforms.

| Action | Requester | Reviewer | Approver | Executor |
|---|---|---|---|---|
| Change review date | Team lead or programme director | Privacy reviewer | Privacy lead for high-risk extension | Policy service |
| Create operational hold | Team lead or programme director | Relevant hold owner | Privacy/security/safeguarding lead | Policy service/CRM workflow |
| Release hold | Hold owner may request | Independent privacy/security reviewer | Two-person approval | Policy service |
| Apply suppression | Pipeline service or scoped reviewer | Privacy reviewer as needed | Rule approval for manual override | Policy service |
| Release small-cell suppression | Privacy reviewer | Independent privacy reviewer | Two-person approval | Policy service |
| Approve anonymisation | Privacy reviewer | Independent approver | Two-person approval | Retention service |
| Approve deletion | Privacy reviewer | Independent approver | Two-person approval | Retention service |
| Reconcile unknown provider result | Retention operator | Security/privacy reviewer for high risk | Not applicable unless retry/disposal resumes | Retention service |
| Change retention/suppression rule | Privacy or programme owner proposes | Data/security reviewer | Two-person approval | CRM admin/policy service |

A person may not approve their own request. The system must compare requester and approver identities, not merely their display names.

## 6. API policy checks

Every endpoint that creates or changes a retention override or suppression exception should evaluate the following server-side policy:

```ts
export function canApplyHighRiskAction(input: {
  actorRole: string;
  actorId: string;
  requesterId: string;
  recordClass: string;
  approvalStatus: string;
  approvalRef: string | undefined;
  hasHold: boolean;
  hasRightsRequest: boolean;
  hasIncident: boolean;
  hasPendingCorrection: boolean;
  isSuppressed: boolean;
  secondApproverId?: string;
}): boolean {
  const independent = input.actorId !== input.requesterId;
  const twoPerson = Boolean(input.secondApproverId) && input.secondApproverId !== input.requesterId && input.secondApproverId !== input.actorId;
  const protectedRecord = input.hasHold || input.hasRightsRequest || input.hasIncident || input.hasPendingCorrection;
  const approved = input.approvalStatus === "approved" && Boolean(input.approvalRef);

  if (!independent || !approved || protectedRecord) return false;
  if (["safeguarding", "restricted_support", "security_incident"].includes(input.recordClass)) return false;
  if (input.isSuppressed && !twoPerson) return false;
  return ["privacy_approver", "security_approver"].includes(input.actorRole);
}
```

The sample policy is intentionally conservative. Adapt the roles to the approved HMSI role registry, but preserve independence, protected-record blocking, and approval-reference requirements.

## 7. Platform validation checklist

| Test | Salesforce evidence | HubSpot evidence | Status |
|---|---|---|:---:|
| Ordinary operator cannot edit retention state | Permission-set/FLS negative test | Object/property permission negative test | [ ] |
| Team lead can request but not approve own override | Flow approval log | Workflow/approval log | [ ] |
| Privacy reviewer can review suppression exception | Restricted object report | Restricted custom object/report | [ ] |
| High-risk release requires second approver | Approval process evidence | External policy-service evidence if native control unavailable | [ ] |
| Retention service is non-interactive | Integration-user configuration | Private-app/service configuration | [ ] |
| Service cannot access restricted records | Permission and API-scope test | Scope and object-access test | [ ] |
| Hold blocks anonymisation/deletion | Flow/Apex test | Workflow/policy-service test | [ ] |
| Dry-run makes no destructive call | Adapter call log | Policy-service call log | [ ] |
| Suppressed records absent from exports | Report/export inspection | Report/export inspection | [ ] |
| Cross-filter small cells suppressed | Server-side report test | External report-service test if needed | [ ] |
| Audit events are append-only | Object permission and external ledger test | External ledger test | [ ] |
| Unknown provider result is not blindly retried | Apex/service recovery test | Policy-service recovery test | [ ] |
| Privileged access is reviewed quarterly | Permission-set assignment report | User/team/permission review report | [ ] |
| Production and test identities are separate | Connected-app/integration evidence | Private-app/environment evidence | [ ] |

## 8. Decision guidance

Choose Salesforce when HMSI needs more granular native separation across objects, fields, records, permission sets, sharing rules, and approval orchestration, and the organization is prepared to administer that complexity. Choose HubSpot only after confirming that the subscribed tier can enforce the required custom-object, property, team, export, workflow, and audit boundaries. In either platform, keep high-risk anonymisation and deletion behind the same server-side retention policy service and append-only audit ledger described in the HMSI specifications.

## References

[1]: https://help.salesforce.com/s/articleView?id=platform.security_data_access.htm&language=en&type=5 "Salesforce Help — Control Who Sees What"

[2]: https://help.salesforce.com/s/articleView?id=platform.users_set_fls_permsets.htm&type=5 "Salesforce Help — Enable Field-Level Security for Permission Sets"

[3]: https://knowledge.hubspot.com/user-management/hubspot-user-permissions-guide "HubSpot Knowledge Base — HubSpot user permissions guide"

[4]: ./hmsi-retention-rbac-override-suppression-matrix.md "HMSI RBAC Matrix for Retention Overrides and Suppression Exceptions"

[5]: ./hmsi-retention-audit-logging-specification.md "HMSI Retention Audit Logging Specification"

[6]: ./hmsi-staged-retention-automation-scripts.md "HMSI Staged Retention Automation Scripts and Workflow Rules"
