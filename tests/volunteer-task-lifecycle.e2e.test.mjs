import assert from 'node:assert/strict';
import test from 'node:test';

const ROLES = { ADMIN: 'admin', VOLUNTEER: 'volunteer', WORKER: 'worker' };
const transitions = {
  assigned: new Set(['accepted', 'in_progress']),
  accepted: new Set(['in_progress']),
  in_progress: new Set(['submitted']),
};

function createLifecycleApi() {
  const volunteers = new Map([
    ['vol-001', { id: 'vol-001', name: 'Synthetic Volunteer', email: 'volunteer@example.invalid', role: ROLES.VOLUNTEER, status: 'approved', accountStatus: 'active', onboardingStatus: 'completed', isDeleted: false }],
    ['vol-pending', { id: 'vol-pending', name: 'Pending Fixture', email: 'pending@example.invalid', role: ROLES.VOLUNTEER, status: 'pending', accountStatus: 'active', onboardingStatus: 'completed', isDeleted: false }],
    ['vol-other', { id: 'vol-other', name: 'Other Volunteer', email: 'other@example.invalid', role: ROLES.VOLUNTEER, status: 'approved', accountStatus: 'active', onboardingStatus: 'completed', isDeleted: false }],
  ]);
  const assignments = new Map();
  const proofs = new Map();
  const events = [];
  const notifications = [];
  const idempotency = new Map();
  let sequence = 0;

  const now = () => new Date('2026-08-26T12:00:00.000Z').toISOString();
  const nextId = (prefix) => `${prefix}-${++sequence}`;
  const isEligible = (volunteer) => volunteer?.role === ROLES.VOLUNTEER && volunteer.status === 'approved' && volunteer.accountStatus === 'active' && volunteer.onboardingStatus === 'completed' && volunteer.isDeleted === false;
  const audit = (assignmentId, actor, action, fromStatus, toStatus, detail = null) => events.push({ assignmentId, actor, action, fromStatus, toStatus, detail, createdAt: now() });
  const auth = (session, role) => {
    if (!session || session.role !== role) throw new Error(role === ROLES.ADMIN ? 'ADMIN_REQUIRED' : 'VOLUNTEER_REQUIRED');
    return session;
  };

  return {
    assign(session, input) {
      auth(session, ROLES.ADMIN);
      if (!input.idempotencyKey || input.idempotencyKey.length < 16) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
      const previous = idempotency.get(`${session.email}:${input.idempotencyKey}`);
      const fingerprint = JSON.stringify(input);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new Error('IDEMPOTENCY_KEY_REUSED');
        return { ...previous.assignment, duplicate: true };
      }
      const volunteer = volunteers.get(input.volunteerId);
      if (!isEligible(volunteer)) throw new Error('VOLUNTEER_NOT_ELIGIBLE');
      if (!input.title?.trim() || !input.description?.trim() || !input.requiredOutcome?.trim()) throw new Error('TASK_FIELDS_REQUIRED');
      const assignment = { id: nextId('assignment'), volunteerId: volunteer.id, title: input.title.trim(), description: input.description.trim(), requiredOutcome: input.requiredOutcome.trim(), priority: input.priority ?? 'medium', proofRequired: input.proofRequired === true, status: 'assigned', isDeleted: false, createdAt: now(), updatedAt: now() };
      assignments.set(assignment.id, assignment);
      idempotency.set(`${session.email}:${input.idempotencyKey}`, { fingerprint, assignment });
      audit(assignment.id, session.email, 'created', null, 'assigned', 'Synthetic assignment created.');
      notifications.push({ assignmentId: assignment.id, to: volunteer.email, status: 'queued' });
      return { ...assignment, duplicate: false };
    },
    listTasks(session) {
      auth(session, ROLES.VOLUNTEER);
      return [...assignments.values()].filter((item) => item.volunteerId === session.volunteerId && item.isDeleted === false).map((item) => ({ ...item }));
    },
    transition(session, input) {
      auth(session, ROLES.VOLUNTEER);
      const assignment = assignments.get(input.assignmentId);
      if (!assignment || assignment.isDeleted || assignment.volunteerId !== session.volunteerId) throw new Error('ASSIGNMENT_NOT_OWNED');
      if (assignment.status !== input.expectedStatus || !transitions[input.expectedStatus]?.has(input.nextStatus)) throw new Error('INVALID_OR_STALE_TRANSITION');
      if (input.nextStatus === 'submitted' && !input.completionNote?.trim()) throw new Error('COMPLETION_NOTE_REQUIRED');
      const previous = assignment.status;
      assignment.status = input.nextStatus;
      assignment.updatedAt = now();
      audit(assignment.id, session.email, input.nextStatus === 'accepted' ? 'accepted' : input.nextStatus === 'in_progress' ? 'started' : 'proof_submitted', previous, input.nextStatus, input.completionNote?.trim() ?? null);
      return { ...assignment };
    },
    submitProof(session, input) {
      auth(session, ROLES.VOLUNTEER);
      const assignment = assignments.get(input.assignmentId);
      if (!assignment || assignment.isDeleted || assignment.volunteerId !== session.volunteerId) throw new Error('ASSIGNMENT_NOT_OWNED');
      if (assignment.status !== 'in_progress') throw new Error('PROOF_STATE_REQUIRED');
      let url;
      try { url = new URL(input.driveUrl); } catch { throw new Error('DRIVE_URL_INVALID'); }
      if (url.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(url.hostname) || url.username || url.password) throw new Error('DRIVE_URL_INVALID');
      const proof = { id: nextId('proof'), assignmentId: assignment.id, submittedBy: session.volunteerId, driveUrl: input.driveUrl, status: 'pending_review', createdAt: now() };
      proofs.set(proof.id, proof);
      assignment.status = 'submitted';
      assignment.updatedAt = now();
      audit(assignment.id, session.email, 'proof_submitted', 'in_progress', 'submitted', 'Private synthetic proof metadata submitted.');
      return { id: proof.id, status: proof.status, assignmentStatus: assignment.status };
    },
    review(session, input) {
      auth(session, ROLES.ADMIN);
      const assignment = assignments.get(input.assignmentId);
      if (!assignment || assignment.isDeleted || assignment.status !== 'submitted') throw new Error('REVIEW_STATE_REQUIRED');
      const previous = assignment.status;
      if (!['completed', 'needs_revision', 'rejected'].includes(input.decision)) throw new Error('INVALID_REVIEW_DECISION');
      assignment.status = input.decision;
      assignment.updatedAt = now();
      audit(assignment.id, session.email, input.decision, previous, input.decision, input.feedback?.trim() ?? null);
      return { ...assignment };
    },
    delete(session, assignmentId) {
      auth(session, ROLES.ADMIN);
      const assignment = assignments.get(assignmentId);
      if (!assignment) throw new Error('ASSIGNMENT_NOT_FOUND');
      assignment.isDeleted = true;
      assignment.deletedAt = now();
      assignment.recoveryUntil = '2026-09-25T12:00:00.000Z';
      audit(assignment.id, session.email, 'soft_deleted', assignment.status, assignment.status, 'Synthetic soft delete.');
      return { ...assignment };
    },
    audit() { return events.map((event) => ({ ...event })); },
    notifications() { return notifications.map((item) => ({ ...item })); },
    proofCount() { return proofs.size; },
  };
}

const admin = { role: ROLES.ADMIN, email: 'admin@example.invalid' };
const volunteer = { role: ROLES.VOLUNTEER, volunteerId: 'vol-001', email: 'volunteer@example.invalid' };
const otherVolunteer = { role: ROLES.VOLUNTEER, volunteerId: 'vol-other', email: 'other@example.invalid' };
const worker = { role: ROLES.WORKER, email: 'worker@example.invalid' };

function assignmentInput(overrides = {}) {
  return {
    volunteerId: 'vol-001',
    title: 'Synthetic community check-in',
    description: 'Confirm the synthetic community contact workflow.',
    requiredOutcome: 'Submit a private synthetic report link for review.',
    priority: 'high',
    proofRequired: true,
    idempotencyKey: 'staging-volunteer-flow-001',
    ...overrides,
  };
}

test('complete lifecycle: admin assignment → volunteer execution → proof → admin approval', () => {
  const api = createLifecycleApi();
  const assigned = api.assign(admin, assignmentInput());
  assert.equal(assigned.status, 'assigned');
  assert.equal(assigned.volunteerId, volunteer.volunteerId);
  assert.equal(api.notifications()[0].status, 'queued');

  const visible = api.listTasks(volunteer);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].title, 'Synthetic community check-in');
  assert.equal(api.listTasks(otherVolunteer).length, 0);

  assert.equal(api.transition(volunteer, { assignmentId: assigned.id, expectedStatus: 'assigned', nextStatus: 'accepted' }).status, 'accepted');
  assert.equal(api.transition(volunteer, { assignmentId: assigned.id, expectedStatus: 'accepted', nextStatus: 'in_progress' }).status, 'in_progress');
  const proof = api.submitProof(volunteer, { assignmentId: assigned.id, driveUrl: 'https://drive.google.com/file/d/synthetic-proof/view', note: 'Synthetic evidence only.' });
  assert.equal(proof.status, 'pending_review');
  assert.equal(proof.assignmentStatus, 'submitted');
  assert.equal(api.proofCount(), 1);

  const completed = api.review(admin, { assignmentId: assigned.id, decision: 'completed', feedback: 'Synthetic proof accepted.' });
  assert.equal(completed.status, 'completed');
  assert.deepEqual(api.audit().map((event) => event.action), ['created', 'accepted', 'started', 'proof_submitted', 'completed']);
});

test('authorization blocks unapproved assignment, cross-volunteer access, and non-admin review', () => {
  const api = createLifecycleApi();
  assert.throws(() => api.assign(admin, assignmentInput({ volunteerId: 'vol-pending' })), /VOLUNTEER_NOT_ELIGIBLE/);
  const assigned = api.assign(admin, assignmentInput());
  assert.throws(() => api.listTasks(worker), /VOLUNTEER_REQUIRED/);
  assert.throws(() => api.transition(otherVolunteer, { assignmentId: assigned.id, expectedStatus: 'assigned', nextStatus: 'accepted' }), /ASSIGNMENT_NOT_OWNED/);
  assert.throws(() => api.review(volunteer, { assignmentId: assigned.id, decision: 'completed' }), /ADMIN_REQUIRED/);
});

test('idempotent administrator retry returns one assignment and one notification', () => {
  const api = createLifecycleApi();
  const first = api.assign(admin, assignmentInput());
  const retry = api.assign(admin, assignmentInput());
  assert.equal(retry.duplicate, true);
  assert.equal(retry.id, first.id);
  assert.equal(api.listTasks(volunteer).length, 1);
  assert.equal(api.notifications().length, 1);
  assert.throws(() => api.assign(admin, assignmentInput({ title: 'Different task' })), /IDEMPOTENCY_KEY_REUSED/);
});

test('invalid transitions and unsafe proof URLs fail without state mutation', () => {
  const api = createLifecycleApi();
  const assigned = api.assign(admin, assignmentInput());
  assert.throws(() => api.transition(volunteer, { assignmentId: assigned.id, expectedStatus: 'assigned', nextStatus: 'completed' }), /INVALID_OR_STALE_TRANSITION/);
  assert.throws(() => api.submitProof(volunteer, { assignmentId: assigned.id, driveUrl: 'https://example.invalid/proof' }), /PROOF_STATE_REQUIRED/);
  api.transition(volunteer, { assignmentId: assigned.id, expectedStatus: 'assigned', nextStatus: 'in_progress' });
  assert.throws(() => api.submitProof(volunteer, { assignmentId: assigned.id, driveUrl: 'http://drive.google.com/file/d/synthetic' }), /DRIVE_URL_INVALID/);
  assert.equal(api.listTasks(volunteer)[0].status, 'in_progress');
  assert.equal(api.proofCount(), 0);
});

test('soft-deleted assignment disappears from the volunteer feed and remains audited', () => {
  const api = createLifecycleApi();
  const assigned = api.assign(admin, assignmentInput());
  const deleted = api.delete(admin, assigned.id);
  assert.equal(deleted.isDeleted, true);
  assert.equal(api.listTasks(volunteer).length, 0);
  assert.equal(api.audit().at(-1).action, 'soft_deleted');
  assert.equal(api.audit().at(-1).detail, 'Synthetic soft delete.');
});
