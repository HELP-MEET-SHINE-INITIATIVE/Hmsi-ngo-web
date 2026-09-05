import assert from 'node:assert/strict';
import { test } from 'node:test';

const ARTICLE_ID = 'NEWS-ARCHIVE-001';
const ADMIN = { email: 'editor@example.test', role: 'admin' };
const CONTRIBUTOR = { email: 'publisher@example.test', role: 'volunteer' };

class MockNewsStore {
  constructor() {
    this.records = new Map();
    this.events = [];
    this.calls = [];
  }

  seed(record) {
    this.records.set(record.id, structuredClone(record));
  }

  get(id) {
    const record = this.records.get(id);
    if (!record) throw new Error('article_not_found');
    return structuredClone(record);
  }

  update(id, expectedStatus, patch) {
    const record = this.get(id);
    if (record.status !== expectedStatus) return null;
    const updated = { ...record, ...patch, updatedAt: new Date().toISOString() };
    this.records.set(id, updated);
    this.calls.push({ operation: 'update', id, from: expectedStatus, to: updated.status });
    return structuredClone(updated);
  }

  addEvent(event) {
    this.events.push({ ...event, createdAt: new Date().toISOString() });
  }
}

class NewsWorkflowPolicy {
  constructor(store) {
    this.store = store;
    this.processedRestores = new Set();
  }

  restore({ actor, articleId, confirm, reason }) {
    if (actor?.role !== 'admin') throw new Error('admin_authentication_required');
    if (confirm !== 'RESTORE_ARCHIVED_NEWS_TO_REVIEW') throw new Error('explicit_confirmation_required');
    if (!reason || reason.trim().length < 3) throw new Error('restoration_reason_required');

    const key = `${articleId}:${actor.email}:${reason.trim()}`;
    if (this.processedRestores.has(key)) {
      this.store.addEvent({ type: 'restore_replay', articleId, actor: actor.email, result: 'idempotent' });
      return this.store.get(articleId);
    }

    const record = this.store.get(articleId);
    if (record.status !== 'archived') throw new Error('article_must_be_archived');

    const restored = this.store.update(articleId, 'archived', {
      status: 'draft',
      archiveReason: null,
      restoredBy: actor.email,
      restoredAt: new Date().toISOString(),
      publishedAt: null,
    });
    if (!restored) throw new Error('restore_conflict');

    this.store.addEvent({
      type: 'restored_to_private_review',
      articleId,
      actor: actor.email,
      from: 'archived',
      to: 'draft',
      reason: reason.trim(),
    });
    this.processedRestores.add(key);
    return restored;
  }

  publish({ actor, articleId, confirm }) {
    if (actor?.role !== 'admin') throw new Error('admin_authentication_required');
    if (confirm !== 'PUBLISH_REVIEWED_NEWS') throw new Error('explicit_publication_confirmation_required');
    const record = this.store.get(articleId);
    if (record.status !== 'draft') throw new Error('article_must_be_private_review');
    if (!record.primaryImageUrl) throw new Error('primary_image_required');
    const published = this.store.update(articleId, 'draft', {
      status: 'published',
      approvedBy: actor.email,
      publishedAt: new Date().toISOString(),
    });
    this.store.addEvent({ type: 'published', articleId, actor: actor.email, from: 'draft', to: 'published' });
    return published;
  }

  publicNews() {
    return [...this.store.records.values()]
      .filter((record) => record.status === 'published')
      .map(({ id, headline, status }) => ({ id, headline, status }));
  }
}

function setup(overrides = {}) {
  const store = new MockNewsStore();
  store.seed({
    id: ARTICLE_ID,
    headline: 'Archived synthetic dispatch',
    status: 'archived',
    archiveReason: 'Bulk news reset',
    primaryImageUrl: 'https://cdn.example.test/news.jpg',
    publishedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  });
  return { store, policy: new NewsWorkflowPolicy(store) };
}

test('restoration moves an archived article to private draft review', () => {
  const { store, policy } = setup();
  const restored = policy.restore({ actor: ADMIN, articleId: ARTICLE_ID, confirm: 'RESTORE_ARCHIVED_NEWS_TO_REVIEW', reason: 'Reassessed for current campaign context.' });

  assert.equal(restored.status, 'draft');
  assert.equal(restored.publishedAt, null);
  assert.equal(restored.restoredBy, ADMIN.email);
  assert.equal(store.events.at(-1).type, 'restored_to_private_review');
  assert.deepEqual(policy.publicNews(), []);
});

test('restoration never accepts published as its target state', () => {
  const { store, policy } = setup();
  const restored = policy.restore({ actor: ADMIN, articleId: ARTICLE_ID, confirm: 'RESTORE_ARCHIVED_NEWS_TO_REVIEW', reason: 'Fresh editorial review required.' });
  assert.notEqual(restored.status, 'published');
  assert.equal(store.get(ARTICLE_ID).status, 'draft');
  assert.equal(store.calls.at(-1).to, 'draft');
});

test('an administrator must perform a separate explicit publication action after restoration', () => {
  const { policy } = setup();
  policy.restore({ actor: ADMIN, articleId: ARTICLE_ID, confirm: 'RESTORE_ARCHIVED_NEWS_TO_REVIEW', reason: 'Fresh editorial review required.' });
  assert.deepEqual(policy.publicNews(), []);
  const published = policy.publish({ actor: ADMIN, articleId: ARTICLE_ID, confirm: 'PUBLISH_REVIEWED_NEWS' });
  assert.equal(published.status, 'published');
  assert.equal(policy.publicNews()[0].id, ARTICLE_ID);
});

test('publication remains blocked after restoration when the primary image is missing', () => {
  const { policy } = setup({ primaryImageUrl: null });
  policy.restore({ actor: ADMIN, articleId: ARTICLE_ID, confirm: 'RESTORE_ARCHIVED_NEWS_TO_REVIEW', reason: 'Fresh editorial review required.' });
  assert.throws(() => policy.publish({ actor: ADMIN, articleId: ARTICLE_ID, confirm: 'PUBLISH_REVIEWED_NEWS' }), /primary_image_required/);
  assert.deepEqual(policy.publicNews(), []);
});

test('non-admin actors cannot restore archived news', () => {
  const { policy } = setup();
  assert.throws(() => policy.restore({ actor: CONTRIBUTOR, articleId: ARTICLE_ID, confirm: 'RESTORE_ARCHIVED_NEWS_TO_REVIEW', reason: 'Attempted contributor recovery.' }), /admin_authentication_required/);
});

test('missing or incorrect confirmation cannot restore an article', () => {
  for (const confirm of [undefined, 'RESTORE_ARCHIVED_NEWS', 'PUBLISH_REVIEWED_NEWS']) {
    const { policy } = setup();
    assert.throws(() => policy.restore({ actor: ADMIN, articleId: ARTICLE_ID, confirm, reason: 'Controlled recovery test.' }), /explicit_confirmation_required/);
  }
});

test('restoration requires a reason and does not bypass stale-state protection', () => {
  const { store, policy } = setup();
  assert.throws(() => policy.restore({ actor: ADMIN, articleId: ARTICLE_ID, confirm: 'RESTORE_ARCHIVED_NEWS_TO_REVIEW', reason: '' }), /restoration_reason_required/);
  store.records.set(ARTICLE_ID, { ...store.get(ARTICLE_ID), status: 'published' });
  assert.throws(() => policy.restore({ actor: ADMIN, articleId: ARTICLE_ID, confirm: 'RESTORE_ARCHIVED_NEWS_TO_REVIEW', reason: 'Stale state test.' }), /article_must_be_archived/);
});

test('repeated restoration delivery is idempotent and does not publish the article', () => {
  const { store, policy } = setup();
  const input = { actor: ADMIN, articleId: ARTICLE_ID, confirm: 'RESTORE_ARCHIVED_NEWS_TO_REVIEW', reason: 'Idempotency test.' };
  policy.restore(input);
  policy.restore(input);
  assert.equal(store.calls.filter((call) => call.operation === 'update').length, 1);
  assert.equal(store.get(ARTICLE_ID).status, 'draft');
  assert.equal(store.events.at(-1).type, 'restore_replay');
  assert.deepEqual(policy.publicNews(), []);
});
