import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperSource = await readFile(new URL('../lib/hmsiAssistant.ts', import.meta.url), 'utf8');
const chatSource = await readFile(new URL('../app/api/admin/assistant/chat/route.ts', import.meta.url), 'utf8');
const operatorSource = await readFile(new URL('../app/api/admin/assistant/operator/route.ts', import.meta.url), 'utf8');
const panelSource = await readFile(new URL('../components/HmsiAssistantPanel.tsx', import.meta.url), 'utf8');

test('Gemini transport reads only the server-side standard credential', () => {
  assert.match(helperSource, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(helperSource, /process\.env\.MANUS_API_KEY/);
  assert.match(helperSource, /generativelanguage\.googleapis\.com\/v1beta\/models/);
  assert.match(helperSource, /encodeURIComponent\(apiKey\)/);
});

test('admin chat returns a synchronous Gemini response and records a completed local task', () => {
  assert.match(chatSource, /response: task\.response_text/);
  assert.match(chatSource, /provider: 'gemini'/);
  assert.match(chatSource, /status: 'stopped'/);
  assert.doesNotMatch(chatSource, /message\.includes\('MANUS_API_KEY'\)/);
});

test('operator route stores a confirmation-ready structured preview', () => {
  assert.match(operatorSource, /status: 'pending_confirmation'/);
  assert.match(operatorSource, /provider: 'gemini'/);
  assert.match(operatorSource, /confirmationRequired/);
  assert.doesNotMatch(operatorSource, /message\.includes\('MANUS_API_KEY'\)/);
});

test('admin UI identifies the private workspace as Gemini-backed', () => {
  assert.match(panelSource, /Gemini workspace/);
  assert.match(panelSource, /Gemini is working/);
  assert.match(panelSource, /Ask Gemini privately/);
});
