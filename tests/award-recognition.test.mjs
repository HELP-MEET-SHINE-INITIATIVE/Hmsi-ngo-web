import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const awardTitle = '2020 Entrepreneurship Support NGO of the Year – West Africa';
const sourceUrl = 'https://meamarkets.digital/winners/help-meet-shine-initiative-2/';

test('award component keeps the verified wording and source attribution', async () => {
  const component = await read('components/AwardRecognition.tsx');
  assert.match(component, new RegExp(awardTitle));
  assert.match(component, new RegExp(sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(component, /African Excellence Awards/);
});

test('public recognition surfaces reuse the award component', async () => {
  const [homepage, about, footer] = await Promise.all([
    read('app/page.tsx'),
    read('app/about/page.tsx'),
    read('components/Footer.tsx'),
  ]);
  assert.match(homepage, /import AwardRecognition/);
  assert.match(homepage, /<AwardRecognition \/>/);
  assert.match(about, /import AwardRecognition/);
  assert.match(about, /<AwardRecognition \/>/);
  assert.match(footer, /import AwardRecognition/);
  assert.match(footer, /<AwardRecognition compact \/>/);
});

test('root and About structured metadata include the award as a factual recognition field', async () => {
  const [layout, about] = await Promise.all([read('app/layout.tsx'), read('app/about/page.tsx')]);
  assert.match(layout, new RegExp(`'award': '${awardTitle}'`));
  assert.match(layout, new RegExp(`'awardSourceUrl': '${sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(about, new RegExp(`'award': '${awardTitle}'`));
});
