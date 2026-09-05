import test from "node:test";
import assert from "node:assert/strict";

const providers = ["salesforce", "hubspot"];

class MockCrmAdapter {
  constructor(provider) {
    this.provider = provider;
    this.records = new Map();
    this.calls = [];
  }
  seed(record) { this.records.set(record.id, structuredClone(record)); }
  get(id) {
    const record = this.records.get(id);
    if (!record) throw new Error("record_not_found");
    return structuredClone(record);
  }
  execute(action, id, approvalRef) {
    this.calls.push({ provider: this.provider, action, id, approvalRef });
    if (action === "delete") this.records.delete(id);
    else {
      const record = this.get(id);
      record.privacySuppressed = false;
      record.version += 1;
      this.records.set(id, record);
    }
  }
}

class PolicyService {
  constructor(adapter, audit, now = () => Date.now()) {
    this.adapter = adapter;
    this.audit = audit;
    this.now = now;
    this.processed = new Set();
  }
  execute({ actor, approval, action, recordId }) {
    const key = `${approval.requestId}:${action}:${recordId}`;
    if (this.processed.has(key)) {
      this.audit.push({ type: "idempotent_replay", result: "accepted", action, recordId });
      return;
    }
    const record = this.adapter.get(recordId);
    const reject = (reasonCode) => {
      this.audit.push({ type: "high_risk_action_rejected", result: "rejected", action, recordId, reasonCode });
      throw new Error(reasonCode);
    };
    if (actor.role !== "retention_service") reject("executor_must_be_retention_service");
    if (approval.action !== action || approval.recordId !== recordId) reject("approval_scope_mismatch");
    if (approval.status !== "approved" || approval.expiresAt <= this.now()) reject("approval_invalid_or_expired");
    if (!approval.approvalRef) reject("approval_reference_required");
    if (approval.requesterId === approval.firstApproverId) reject("requester_cannot_approve_own_request");
    if (action === "delete" && !approval.secondApproverId) reject("two_person_approval_required");
    const highRiskSuppression = action === "release_suppression" && record.privacySuppressed && record.recordClass !== "aggregate_read_model";
    if (highRiskSuppression && !approval.secondApproverId) reject("two_person_approval_required_for_high_risk_suppression");
    if (approval.secondApproverId && [approval.requesterId, approval.firstApproverId].includes(approval.secondApproverId)) reject("second_approver_must_be_independent");
    if (record.hasHold || record.hasRightsRequest || record.hasIncident || record.hasPendingCorrection) reject("protected_record_gate");
    if (["restricted_support", "safeguarding", "security_incident"].includes(record.recordClass)) reject("restricted_record_class");
    if (actor.scope !== approval.scope || actor.scope !== record.scope) reject("scope_mismatch");

    this.audit.push({ type: "high_risk_action_accepted", result: "accepted", action, recordId, approvalRef: approval.approvalRef });
    this.adapter.execute(action, recordId, approval.approvalRef);
    this.processed.add(key);
    this.audit.push({ type: action === "delete" ? "deletion_completed" : "suppression_release_completed", result: "completed", action, recordId, approvalRef: approval.approvalRef });
  }
}

function makeRecord(overrides = {}) {
  return {
    id: "TEST-RET-001", recordClass: "normalized_feedback", state: "delete_due", privacySuppressed: false,
    hasHold: false, hasRightsRequest: false, hasIncident: false, hasPendingCorrection: false,
    scope: "team-a", version: 1, ...overrides,
  };
}
function makeApproval(overrides = {}) {
  return {
    requestId: "REQ-001", action: "delete", recordId: "TEST-RET-001", requesterId: "requester",
    firstApproverId: "approver-one", secondApproverId: "approver-two", status: "approved",
    expiresAt: Date.now() + 60_000, approvalRef: "APPROVAL-001", scope: "team-a", ...overrides,
  };
}
function setup(provider, recordOverrides = {}) {
  const adapter = new MockCrmAdapter(provider);
  const audit = [];
  adapter.seed(makeRecord(recordOverrides));
  return { adapter, audit, policy: new PolicyService(adapter, audit) };
}

for (const provider of providers) {
  test(`${provider}: permits deletion only with independent two-person approval`, () => {
    const { adapter, audit, policy } = setup(provider);
    policy.execute({ actor: { id: "svc", role: "retention_service", scope: "team-a" }, approval: makeApproval(), action: "delete", recordId: "TEST-RET-001" });
    assert.equal(adapter.calls.length, 1);
    assert.equal(adapter.records.has("TEST-RET-001"), false);
    assert.deepEqual(audit.map((event) => event.type), ["high_risk_action_accepted", "deletion_completed"]);
  });

  test(`${provider}: permits high-risk suppression release with two independent approvers`, () => {
    const { adapter, audit, policy } = setup(provider, { state: "active", privacySuppressed: true });
    policy.execute({ actor: { id: "svc", role: "retention_service", scope: "team-a" }, approval: makeApproval({ action: "release_suppression" }), action: "release_suppression", recordId: "TEST-RET-001" });
    assert.equal(adapter.get("TEST-RET-001").privacySuppressed, false);
    assert.equal(audit.at(-1).type, "suppression_release_completed");
  });

  test(`${provider}: rejects self-approval, missing second approver, and duplicate approver`, () => {
    for (const [approval, expected] of [
      [makeApproval({ secondApproverId: undefined }), "two_person_approval_required"],
      [makeApproval({ firstApproverId: "requester" }), "requester_cannot_approve_own_request"],
      [makeApproval({ secondApproverId: "approver-one" }), "second_approver_must_be_independent"],
    ]) {
      const { adapter, policy } = setup(provider);
      assert.throws(() => policy.execute({ actor: { id: "svc", role: "retention_service", scope: "team-a" }, approval, action: "delete", recordId: "TEST-RET-001" }), new RegExp(expected));
      assert.equal(adapter.calls.length, 0);
    }
  });

  test(`${provider}: blocks protected records and restricted classes`, () => {
    for (const overrides of [{ hasHold: true }, { hasRightsRequest: true }, { hasIncident: true }, { hasPendingCorrection: true }, { recordClass: "safeguarding" }]) {
      const { adapter, policy } = setup(provider, overrides);
      const expected = overrides.recordClass ? "restricted_record_class" : "protected_record_gate";
      assert.throws(() => policy.execute({ actor: { id: "svc", role: "retention_service", scope: "team-a" }, approval: makeApproval(), action: "delete", recordId: "TEST-RET-001" }), new RegExp(expected));
      assert.equal(adapter.calls.length, 0);
    }
  });

  test(`${provider}: rejects expired or mismatched approvals and scope`, () => {
    for (const [approval, actor, expected] of [
      [makeApproval({ expiresAt: Date.now() - 1 }), { id: "svc", role: "retention_service", scope: "team-a" }, "approval_invalid_or_expired"],
      [makeApproval({ action: "release_suppression" }), { id: "svc", role: "retention_service", scope: "team-a" }, "approval_scope_mismatch"],
      [makeApproval({ scope: "team-b" }), { id: "svc", role: "retention_service", scope: "team-a" }, "scope_mismatch"],
      [makeApproval(), { id: "human", role: "privacy_approver", scope: "team-a" }, "executor_must_be_retention_service"],
    ]) {
      const { adapter, policy } = setup(provider);
      assert.throws(() => policy.execute({ actor, approval, action: "delete", recordId: "TEST-RET-001" }), new RegExp(expected));
      assert.equal(adapter.calls.length, 0);
    }
  });

  test(`${provider}: is idempotent when the approved transition is delivered twice`, () => {
    const { adapter, audit, policy } = setup(provider);
    const input = { actor: { id: "svc", role: "retention_service", scope: "team-a" }, approval: makeApproval(), action: "delete", recordId: "TEST-RET-001" };
    policy.execute(input);
    policy.execute(input);
    assert.equal(adapter.calls.length, 1);
    assert.equal(audit.at(-1).type, "idempotent_replay");
  });
}
