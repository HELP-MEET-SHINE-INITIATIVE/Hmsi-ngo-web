import assert from 'node:assert/strict';
import test from 'node:test';

class SyntheticPool {
  constructor(size = 8) {
    this.size = size;
    this.inUse = 0;
    this.waiters = [];
    this.maxInUse = 0;
    this.waitMs = [];
    this.queryMs = [];
  }

  async acquire() {
    const start = performance.now();
    if (this.inUse >= this.size) await new Promise((resolve) => this.waiters.push(resolve));
    const waited = performance.now() - start;
    this.waitMs.push(waited);
    this.inUse += 1;
    this.maxInUse = Math.max(this.maxInUse, this.inUse);
    let released = false;
    return () => {
      if (released) throw new Error('DOUBLE_RELEASE');
      released = true;
      this.inUse -= 1;
      this.waiters.shift()?.();
    };
  }

  async query(fn) {
    const release = await this.acquire();
    const started = performance.now();
    try { return await fn(); }
    finally {
      this.queryMs.push(performance.now() - started);
      release();
    }
  }
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

function createRlsStore() {
  const assignments = [
    { id: 'a-001', volunteerId: 'vol-001', isDeleted: false, status: 'assigned' },
    { id: 'a-002', volunteerId: 'vol-002', isDeleted: false, status: 'in_progress' },
    { id: 'a-003', volunteerId: 'vol-001', isDeleted: true, status: 'completed' },
  ];
  const audit = [];
  const mutationKeys = new Set();

  return {
    async listAssignments(identity) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return assignments.filter((row) => !row.isDeleted && row.volunteerId === identity.volunteerId);
    },
    async mutateAssignment(identity, id, key) {
      await new Promise((resolve) => setTimeout(resolve, 2));
      if (identity.role !== 'volunteer') return { status: 403 };
      const row = assignments.find((candidate) => candidate.id === id);
      if (!row || row.isDeleted || row.volunteerId !== identity.volunteerId) return { status: 403 };
      if (mutationKeys.has(key)) return { status: 200, duplicate: true };
      mutationKeys.add(key);
      row.status = 'in_progress';
      audit.push({ action: 'started', assignmentId: id, actor: identity.volunteerId });
      return { status: 200, duplicate: false };
    },
    audit,
  };
}

const volunteerA = { role: 'volunteer', volunteerId: 'vol-001' };
const volunteerB = { role: 'volunteer', volunteerId: 'vol-002' };
const worker = { role: 'worker', volunteerId: 'vol-001' };

test('pool never exceeds configured capacity and reports bounded wait under peak reads', async () => {
  const pool = new SyntheticPool(4);
  const store = createRlsStore();
  const requests = Array.from({ length: 40 }, (_, index) => pool.query(() => store.listAssignments(index % 2 ? volunteerA : volunteerB)));
  const results = await Promise.all(requests);
  assert.equal(results.every((rows) => rows.length === 1), true);
  assert.equal(pool.maxInUse, 4);
  assert.ok(percentile(pool.waitMs, 0.95) < 1000, `p95 pool wait exceeded 1s: ${percentile(pool.waitMs, 0.95).toFixed(2)}ms`);
});

test('RLS ownership filtering prevents cross-volunteer reads and hides soft-deleted rows', async () => {
  const pool = new SyntheticPool(2);
  const store = createRlsStore();
  const [a, b] = await Promise.all([
    pool.query(() => store.listAssignments(volunteerA)),
    pool.query(() => store.listAssignments(volunteerB)),
  ]);
  assert.deepEqual(a.map((row) => row.id), ['a-001']);
  assert.deepEqual(b.map((row) => row.id), ['a-002']);
  assert.equal(a.some((row) => row.id === 'a-002'), false);
  assert.equal(a.some((row) => row.isDeleted), false);
});

test('concurrent duplicate assignment actions produce one mutation and one audit event', async () => {
  const pool = new SyntheticPool(8);
  const store = createRlsStore();
  const responses = await Promise.all(
    Array.from({ length: 32 }, () => pool.query(() => store.mutateAssignment(volunteerA, 'a-001', 'same-staging-idempotency-key'))),
  );
  assert.equal(responses.filter((response) => response.status === 200 && response.duplicate === false).length, 1);
  assert.equal(responses.filter((response) => response.status === 200 && response.duplicate === true).length, 31);
  assert.equal(store.audit.length, 1);
});

test('cross-role and cross-owner mutations are denied without pool or audit bypass', async () => {
  const pool = new SyntheticPool(4);
  const store = createRlsStore();
  const responses = await Promise.all([
    pool.query(() => store.mutateAssignment(worker, 'a-001', 'worker-forbidden-key')),
    pool.query(() => store.mutateAssignment(volunteerB, 'a-001', 'cross-owner-key')),
  ]);
  assert.deepEqual(responses.map((response) => response.status), [403, 403]);
  assert.equal(store.audit.length, 0);
});

test('pool and RLS workload exposes latency metrics without identity labels', async () => {
  const pool = new SyntheticPool(3);
  const store = createRlsStore();
  await Promise.all(Array.from({ length: 24 }, (_, index) => pool.query(() => store.listAssignments(index % 3 ? volunteerA : volunteerB))));
  const metrics = {
    poolSize: pool.size,
    maxInUse: pool.maxInUse,
    p95WaitMs: percentile(pool.waitMs, 0.95),
    p99QueryMs: percentile(pool.queryMs, 0.99),
    labels: { environment: 'synthetic', route: 'portal_tasks', result: 'success' },
  };
  assert.equal(Object.keys(metrics.labels).includes('volunteerId'), false);
  assert.equal(Object.keys(metrics.labels).includes('email'), false);
  assert.ok(metrics.p95WaitMs >= 0);
  assert.ok(metrics.p99QueryMs >= 0);
});
