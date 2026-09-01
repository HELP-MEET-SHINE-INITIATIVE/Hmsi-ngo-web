import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const componentPath = fileURLToPath(new URL('../components/GreatNonprofitsBadge.tsx', import.meta.url));
const footerPath = fileURLToPath(new URL('../components/Footer.tsx', import.meta.url));

async function read(path) {
  return readFile(path, 'utf8');
}

test('GreatNonprofits badge uses the verified normalized HMSI profile and vendor script', async () => {
  const component = await read(componentPath);
  assert.match(component, /https:\/\/greatnonprofits\.org\/org\/help-meet-shine-initiative\/\?badge=1/);
  assert.match(component, /https:\/\/greatnonprofits\.org\/js\/api\/badge_stars\.js/);
  assert.match(component, /window\.gnp_url = 'help-meet-shine-initiative'/);
  assert.match(component, /window\.gnp_num = '1'/);
  assert.match(component, /window\.gnp_rating = '0\.00'/);
  assert.doesNotMatch(component, /award|certif|top-rated/i);
});

test('GreatNonprofits badge has a text fallback and no fabricated review claim', async () => {
  const component = await read(componentPath);
  assert.match(component, /Read or share community feedback/i);
  assert.match(component, /View HMSI on GreatNonprofits/);
  assert.match(component, /<noscript>/);
  assert.match(component, /Review Help Meet Shine Initiative on GreatNonprofits/);
  assert.match(component, /target="_blank"/);
  assert.match(component, /rel="noopener noreferrer"/);
});

test('GreatNonprofits badge is mounted once in the shared footer', async () => {
  const footer = await read(footerPath);
  assert.match(footer, /import GreatNonprofitsBadge from '\.\/GreatNonprofitsBadge';/);
  assert.equal((footer.match(/<GreatNonprofitsBadge \/>/g) || []).length, 1);
});
