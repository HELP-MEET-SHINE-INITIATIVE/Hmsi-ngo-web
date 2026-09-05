#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';

const config = '.semgrep/hmsi-sensitive-header-logging.yml';
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' })
  .split('\n')
  .map((file) => file.trim())
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file));

if (staged.length === 0) {
  console.log('SEMGREP_PRECOMMIT_SKIPPED_NO_CODE_FILES');
  process.exit(0);
}

const result = spawnSync(
  'semgrep',
  ['--config', config, ...staged, '--error', '--no-git-ignore'],
  { stdio: 'inherit', env: { ...process.env, NO_COLOR: '1' } },
);

if (result.error?.code === 'ENOENT') {
  console.error('SEMGREP_PRECOMMIT_BLOCKED: install Semgrep and ensure it is on PATH.');
  console.error('Example: python3 -m pip install semgrep');
  process.exit(1);
}

if (result.error) {
  console.error(`SEMGREP_PRECOMMIT_BLOCKED: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('SEMGREP_PRECOMMIT_BLOCKED: sensitive-header logging violation detected.');
  process.exit(result.status ?? 1);
}

console.log(`SEMGREP_PRECOMMIT_OK: scanned ${staged.length} staged code file(s).`);
