import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const navbarSource = await readFile(new URL('../components/Navbar.tsx', import.meta.url), 'utf8');

test('private admin route does not render the public navbar', () => {
  assert.match(navbarSource, /pathname === '\/' \|\| pathname === '\/hmsi-control'/);
});

test('public navigation remains available outside the admin route', () => {
  assert.match(navbarSource, /const links = \[/);
  assert.match(navbarSource, /href: '\/about'/);
  assert.match(navbarSource, /href="\/donate"/);
});
