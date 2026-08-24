import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBulkWorkerAccessNotices } from '../lib/bulkWorkerAccessNotices.mjs';

function makeRequest(body, cookie = 'hmsi_admin=session', extraHeaders = {}) {
  return new Request('https://www.hmsi.org.ng/api/admin/workers/access-notices', {
    method: 'POST',
    headers: { ...(cookie ? { cookie } : {}), 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
}

function makeAdmin({ workers = { data: [], error: null }, cards = [], revokeResults = [], issueResults = [] } = {}) {
  const calls = { workerFilters: [], cardLookups: [], revocations: [], issuedCards: [] };
  const workersBuilder = {
    select() { return this; },
    eq(column, value) { calls.workerFilters.push(['eq', column, value]); return this; },
    not(column, operator, value) { calls.workerFilters.push(['not', column, operator, value]); return this; },
    limit(value) { calls.workerFilters.push(['limit', value]); return Promise.resolve(workers); },
  };
  const cardsBuilder = {
    select() {
      const filters = [];
      return {
        eq(column, value) { filters.push(['eq', column, value]); return this; },
        order(column, options) { filters.push(['order', column, options]); return this; },
        limit(value) { filters.push(['limit', value]); return this; },
        maybeSingle() { calls.cardLookups.push(filters); return Promise.resolve(cards.shift() || { data: null, error: null }); },
      };
    },
    update(values) {
      const revocation = { values, filters: [] };
      calls.revocations.push(revocation);
      const chain = {
        eq(column, value) { revocation.filters.push(['eq', column, value]); return chain; },
        then(resolve, reject) { return Promise.resolve(revokeResults.shift() || { error: null }).then(resolve, reject); },
      };
      return chain;
    },
    insert(values) { calls.issuedCards.push(values); return Promise.resolve(issueResults.shift() || { error: null }); },
  };
  return { admin: { from(table) { if (table === 'workers') return workersBuilder; if (table === 'hmsi_id_cards') return cardsBuilder; throw new Error(`Unexpected table: ${table}`); } }, calls };
}

function makeDependencies(options = {}) {
  const { admin, calls } = makeAdmin(options.database);
  const sent = [];
  const notices = [];
  const errors = [];
  const dependencies = {
    getAdminEmailFromCookie: options.getAdminEmailFromCookie || ((cookie) => cookie ? 'admin@hmsi.org.ng' : null),
    getSupabaseAdmin: options.getSupabaseAdmin || (() => admin),
    createCredentialCode: () => 'TEMP-CODE',
    createMemberNumber: () => 'HMSI-W-TEST001',
    hashCredentialCode: (code) => `hash:${code}`,
    accessNoticeEmail: (input) => { notices.push(input); return { text: `ID ${input.memberNumber}`, html: `<p>${input.memberNumber}</p>` }; },
    sendPortalEmail: options.sendPortalEmail || (async (input) => { sent.push(input); return { sent: true, messageId: 'msg-test' }; }),
    logError: (...args) => errors.push(args),
  };
  return { dependencies, calls, sent, notices, errors };
}

async function json(response) { return response.json(); }

test('rejects a request without an authenticated admin cookie before loading workers', async () => {
  const harness = makeDependencies();
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }, ''), harness.dependencies);
  assert.equal(response.status, 401);
  assert.deepEqual(await json(response), { error: 'Admin authentication required.' });
  assert.deepEqual(harness.calls.workerFilters, []);
});

test('requires explicit confirmation before selecting eligible workers', async () => {
  const harness = makeDependencies();
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: false }), harness.dependencies);
  assert.equal(response.status, 400);
  assert.deepEqual(await json(response), { error: 'Explicit confirmation is required before sending access notices.' });
  assert.deepEqual(harness.calls.workerFilters, []);
});

test('rejects a foreign-origin bulk dispatch even when an admin session is present', async () => {
  const harness = makeDependencies();
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }, 'hmsi_admin=session', { origin: 'https://attacker.invalid', 'sec-fetch-site': 'cross-site' }), harness.dependencies);
  assert.equal(response.status, 403);
  assert.deepEqual(await json(response), { error: 'Cross-site administrative requests are not permitted.' });
  assert.deepEqual(harness.calls.workerFilters, []);
});

test('rejects a browser-marked cross-site bulk dispatch without an Origin header', async () => {
  const harness = makeDependencies();
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }, 'hmsi_admin=session', { 'sec-fetch-site': 'cross-site' }), harness.dependencies);
  assert.equal(response.status, 403);
  assert.deepEqual(await json(response), { error: 'Cross-site administrative requests are not permitted.' });
  assert.deepEqual(harness.calls.workerFilters, []);
});

test('fails closed when the server-side Supabase client is unavailable', async () => {
  const harness = makeDependencies({ getSupabaseAdmin: () => null });
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }), harness.dependencies);
  assert.equal(response.status, 503);
  assert.deepEqual(await json(response), { error: 'Supabase is not configured on the server.' });
  assert.deepEqual(harness.calls.workerFilters, []);
});

test('selects only active completed workers and delivers an existing activated card ID', async () => {
  const harness = makeDependencies({ database: {
    workers: { data: [{ id: 'worker-1', name: 'Amina', email: ' AMINA@HMSI.ORG.NG ', role: 'worker' }], error: null },
    cards: [{ data: { id: 'card-1', member_number: 'HMSI-W-EXISTING', activated_at: '2026-08-24T00:00:00.000Z' }, error: null }],
  } });
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }), harness.dependencies);
  assert.equal(response.status, 200);
  assert.deepEqual((await json(response)).summary, { eligible: 1, sent: 1, failed: 0, skipped: 0, reissued: 0 });
  assert.deepEqual(harness.calls.workerFilters, [['eq', 'status', 'active'], ['eq', 'onboarding_status', 'completed'], ['not', 'email', 'is', null], ['limit', 500]]);
  assert.deepEqual(harness.notices, [{ workerName: 'Amina', memberNumber: 'HMSI-W-EXISTING', activated: true, activationCode: undefined }]);
  assert.equal(harness.sent[0].to, 'amina@hmsi.org.ng');
  assert.equal(harness.calls.issuedCards.length, 0);
});

test('reissues an unactivated card and delivers the new ID with a temporary activation code', async () => {
  const harness = makeDependencies({ database: {
    workers: { data: [{ id: 'worker-2', name: 'Bola', email: 'bola@hmsi.org.ng', role: 'coordinator' }], error: null },
    cards: [{ data: { id: 'card-2', member_number: 'HMSI-W-OLD', activated_at: null }, error: null }],
  } });
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }), harness.dependencies);
  assert.deepEqual((await json(response)).summary, { eligible: 1, sent: 1, failed: 0, skipped: 0, reissued: 1 });
  assert.equal(harness.calls.revocations.length, 1);
  assert.equal(harness.calls.issuedCards.length, 1);
  assert.equal(harness.calls.issuedCards[0].member_number, 'HMSI-W-TEST001');
  assert.equal(harness.calls.issuedCards[0].role_display, 'HMSI Worker Coordinator');
  assert.equal(harness.calls.issuedCards[0].activation_code_hash, 'hash:TEMP-CODE');
  assert.deepEqual(harness.notices, [{ workerName: 'Bola', memberNumber: 'HMSI-W-TEST001', activated: false, activationCode: 'TEMP-CODE' }]);
});

test('counts a non-sent provider result as skipped without treating it as a delivery success', async () => {
  const harness = makeDependencies({
    database: {
      workers: { data: [{ id: 'worker-3', name: 'Chi', email: 'chi@hmsi.org.ng', role: 'worker' }], error: null },
      cards: [{ data: { id: 'card-3', member_number: 'HMSI-W-CHI', activated_at: '2026-08-24T00:00:00.000Z' }, error: null }],
    },
    sendPortalEmail: async () => ({ sent: false, reason: 'email_not_configured' }),
  });
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }), harness.dependencies);
  assert.deepEqual((await json(response)).summary, { eligible: 1, sent: 0, failed: 0, skipped: 1, reissued: 0 });
});

test('skips a blank worker email and fails closed when card revocation cannot complete', async () => {
  const harness = makeDependencies({ database: {
    workers: { data: [
      { id: 'worker-blank', name: 'Favour', email: '   ', role: 'worker' },
      { id: 'worker-revoke', name: 'Gani', email: 'gani@hmsi.org.ng', role: 'worker' },
    ], error: null },
    cards: [{ data: { id: 'card-revoke', member_number: 'HMSI-W-OLD', activated_at: null }, error: null }],
    revokeResults: [{ error: new Error('revocation unavailable') }],
  } });
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }), harness.dependencies);
  assert.deepEqual((await json(response)).summary, { eligible: 2, sent: 0, failed: 1, skipped: 1, reissued: 0 });
  assert.equal(harness.calls.issuedCards.length, 0);
  assert.equal(harness.sent.length, 0);
});

test('does not send an access notice when replacement ID-card issuance fails', async () => {
  const harness = makeDependencies({ database: {
    workers: { data: [{ id: 'worker-issue', name: 'Hauwa', email: 'hauwa@hmsi.org.ng', role: 'worker' }], error: null },
    cards: [{ data: null, error: null }],
    issueResults: [{ error: new Error('card issue unavailable') }],
  } });
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }), harness.dependencies);
  assert.deepEqual((await json(response)).summary, { eligible: 1, sent: 0, failed: 1, skipped: 0, reissued: 0 });
  assert.equal(harness.calls.issuedCards.length, 1);
  assert.equal(harness.sent.length, 0);
});

test('continues safely after a card lookup failure and an email exception', async () => {
  const harness = makeDependencies({
    database: {
      workers: { data: [
        { id: 'worker-4', name: 'Dami', email: 'dami@hmsi.org.ng', role: 'worker' },
        { id: 'worker-5', name: 'Efe', email: 'efe@hmsi.org.ng', role: 'worker' },
      ], error: null },
      cards: [
        { data: null, error: new Error('card lookup unavailable') },
        { data: { id: 'card-5', member_number: 'HMSI-W-EFE', activated_at: '2026-08-24T00:00:00.000Z' }, error: null },
      ],
    },
    sendPortalEmail: async () => { throw new Error('provider unavailable'); },
  });
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }), harness.dependencies);
  assert.deepEqual((await json(response)).summary, { eligible: 2, sent: 0, failed: 2, skipped: 0, reissued: 0 });
  assert.equal(harness.errors.length, 1);
});

test('fails closed when the verified-worker query cannot be completed', async () => {
  const harness = makeDependencies({ database: { workers: { data: null, error: new Error('database unavailable') } } });
  const response = await handleBulkWorkerAccessNotices(makeRequest({ confirm: true }), harness.dependencies);
  assert.equal(response.status, 500);
  assert.deepEqual(await json(response), { error: 'Verified worker records could not be loaded.' });
});
