import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const expectedEntries = [
  ['Nigeria Network of NGOs (NNNGO)', 'https://nnngo.org/'],
  ['Nigerian Volunteers Award (NVA)', 'https://www.instagram.com/theofficialnva/'],
  ['West Africa Civil Society Institute (WACSI)', 'https://wacsi.org/'],
  ['TechSoup', 'https://wacsi.org/cyber-attacks-wacsi-techsoup-train-36-civic-actors-on-digital-security-and-safety/'],
  ['Global Call to Action Against Poverty (GCAP) Africa', 'https://gcap.global/region/africa/'],
  ['Small Media Foundation', 'https://smallmedia.org.uk/'],
];

test('partner ecosystem includes all supplied organizations with evidence-aware labels', async () => {
  const component = await read('components/PartnerEcosystem.tsx');
  for (const [name, source] of expectedEntries) {
    assert.match(component, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(component, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(component, /not all presented as current signed partnerships/);
  assert.match(component, /agreement register/);
  assert.match(component, /event support, not an award received by HMSI/);
});

test('partnerships page uses the shared partner ecosystem section', async () => {
  const page = await read('app/partnerships/page.tsx');
  assert.match(page, /import PartnerEcosystem/);
  assert.match(page, /<PartnerEcosystem \/>/);
  assert.match(page, /public partner and network connections/);
});
