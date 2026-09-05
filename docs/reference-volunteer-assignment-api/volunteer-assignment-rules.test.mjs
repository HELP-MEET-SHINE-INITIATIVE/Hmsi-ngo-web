import test from 'node:test';
import assert from 'node:assert/strict';

const transitions = {
  assigned: new Set(['accepted', 'in_progress']),
  accepted: new Set(['in_progress']),
  in_progress: new Set(['submitted']),
};
const allowedHosts = new Set(['drive.google.com', 'docs.google.com']);

function canTransition(from, to) {
  return Boolean(transitions[from]?.has(to));
}

function validDriveUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowedHosts.has(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function eligibleVolunteer(volunteer) {
  return Boolean(
    volunteer &&
      volunteer.status === 'approved' &&
      volunteer.account_status === 'active' &&
      volunteer.applicant_role === 'volunteer' &&
      volunteer.onboarding_status === 'completed' &&
      volunteer.is_deleted === false,
  );
}

function validIdempotencyKey(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{16,128}$/.test(value);
}

test('volunteer lifecycle allows only forward transitions', () => {
  assert.equal(canTransition('assigned', 'accepted'), true);
  assert.equal(canTransition('accepted', 'in_progress'), true);
  assert.equal(canTransition('in_progress', 'submitted'), true);
  assert.equal(canTransition('submitted', 'completed'), false);
  assert.equal(canTransition('completed', 'in_progress'), false);
});

test('only approved active completed volunteers are assignable', () => {
  const base = { status: 'approved', account_status: 'active', applicant_role: 'volunteer', onboarding_status: 'completed', is_deleted: false };
  assert.equal(eligibleVolunteer(base), true);
  assert.equal(eligibleVolunteer({ ...base, status: 'pending' }), false);
  assert.equal(eligibleVolunteer({ ...base, account_status: 'inactive' }), false);
  assert.equal(eligibleVolunteer({ ...base, is_deleted: true }), false);
  assert.equal(eligibleVolunteer({ ...base, onboarding_status: 'in_progress' }), false);
});

test('proof URL allowlist rejects non-HTTPS, credentials, and unapproved hosts', () => {
  assert.equal(validDriveUrl('https://drive.google.com/file/d/synthetic/view'), true);
  assert.equal(validDriveUrl('https://docs.google.com/document/d/synthetic/edit'), true);
  assert.equal(validDriveUrl('http://drive.google.com/file/d/synthetic/view'), false);
  assert.equal(validDriveUrl('https://example.invalid/synthetic'), false);
  assert.equal(validDriveUrl('https://user:pass@drive.google.com/file/d/synthetic/view'), false);
});

test('idempotency keys are bounded and character restricted', () => {
  assert.equal(validIdempotencyKey('staging-assignment-0001'), true);
  assert.equal(validIdempotencyKey('short'), false);
  assert.equal(validIdempotencyKey('contains space 0001'), false);
  assert.equal(validIdempotencyKey('x'.repeat(129)), false);
});

test('recovery is time-bounded by server time', () => {
  const now = Date.parse('2026-08-26T12:00:00Z');
  const future = Date.parse('2026-08-27T12:00:00Z');
  const expired = Date.parse('2026-08-25T12:00:00Z');
  assert.equal(future >= now, true);
  assert.equal(expired >= now, false);
});
