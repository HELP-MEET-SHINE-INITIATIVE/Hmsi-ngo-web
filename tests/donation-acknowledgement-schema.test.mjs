import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/donation_acknowledgements_patch.sql', import.meta.url), 'utf8');

test('donation acknowledgement migration is additive and constrains the summary state', () => {
  assert.match(migration, /add column if not exists acknowledgement_status/);
  assert.match(migration, /'not_started', 'queued', 'sent', 'delivered', 'bounced', 'failed', 'suppressed'/);
  assert.match(migration, /acknowledgement_updated_at timestamptz not null default timezone\('utc', now\(\)\)/);
  assert.doesNotMatch(migration, /drop table/i);
  assert.doesNotMatch(migration, /delete from public\.donations/i);
});

test('acknowledgement event records are append-only, linked to donations, and webhook-idempotent', () => {
  assert.match(migration, /create table if not exists public\.donation_acknowledgement_events/);
  assert.match(migration, /donation_id uuid not null references public\.donations\(id\) on delete restrict/);
  assert.match(migration, /provider_event_id text unique/);
  assert.match(migration, /event_source text not null default 'application'/);
  assert.match(migration, /enable row level security/);
  assert.doesNotMatch(migration, /for delete/i);
});

