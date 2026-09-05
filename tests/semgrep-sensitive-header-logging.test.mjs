import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url);
const config = new URL('../.semgrep/hmsi-sensitive-header-logging.yml', import.meta.url);
const positiveFixture = new URL('./fixtures/semgrep-sensitive-header-logging.ts', import.meta.url);
const safeFixture = new URL('./fixtures/semgrep-sensitive-header-logging.safe.ts', import.meta.url);

async function runSemgrep(fixture) {
  const result = spawnSync(
    'semgrep',
    [
      '--config', config.pathname,
      fixture.pathname,
      '--json',
      '--no-git-ignore',
      '--quiet',
    ],
    {
      cwd: root.pathname,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1' },
    },
  );

  if (result.error?.code === 'ENOENT') {
    if (process.env.SEMGREP_REQUIRED === '1') {
      throw new Error('Semgrep is required but is not installed or not on PATH.');
    }
    return { skipped: true, findings: [], stderr: 'Semgrep is not installed.' };
  }

  assert.equal(result.error, undefined, result.error?.message);
  assert.ok(result.stdout, `Semgrep produced no JSON output. stderr=${result.stderr}`);
  return {
    skipped: false,
    findings: JSON.parse(result.stdout).results,
    stderr: result.stderr,
  };
}

test('known sensitive-header violations are detected by rule ID', async (t) => {
  const result = await runSemgrep(positiveFixture);
  if (result.skipped) {
    t.skip(result.stderr);
    return;
  }

  const ids = result.findings.map((finding) => finding.check_id).sort();
  assert.deepEqual(ids, [
    'hmsi-sensitive-header-direct-log',
    'hmsi-sensitive-header-event-payload',
    'hmsi-sensitive-header-metric-label',
    'hmsi-sensitive-header-object-log',
    'hmsi-sensitive-header-template-log',
  ]);
  assert.equal(result.findings.length, 5);
});

test('safe classified telemetry produces no Semgrep findings', async (t) => {
  const result = await runSemgrep(safeFixture);
  if (result.skipped) {
    t.skip(result.stderr);
    return;
  }

  assert.deepEqual(result.findings, []);
});

test('fixtures remain deterministic and contain the intended canary boundary', async () => {
  const unsafe = await readFile(positiveFixture, 'utf8');
  const safe = await readFile(safeFixture, 'utf8');
  assert.match(unsafe, /request\.headers\.get\('Authorization'\)/);
  assert.match(unsafe, /request\.headers\.get\('Origin'\)/);
  assert.match(safe, /originClass/);
  assert.doesNotMatch(safe, /JSON\.stringify\(request|headers\.get\(/);
});
