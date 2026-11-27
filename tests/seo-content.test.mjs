import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('programme and field-story routes are present in the sitemap', () => {
  const sitemap = read('app/sitemap.ts');
  for (const route of [
    '/programmes',
    '/programmes/project-feed-a-home',
    '/programmes/food-security-community-relief-edo',
    '/programmes/youth-empowerment-nigeria',
    '/programmes/climate-resilient-community-agriculture',
    '/field-stories',
    '/field-stories/food-insecurity-edo-project-feed-a-home',
    '/field-stories/immediate-relief-to-climate-resilient-farms',
    '/field-stories/governance-and-scuml-compliance-nonprofits-nigeria',
    '/field-stories/grassroots-volunteerism-hmsi-model',
  ]) assert.match(sitemap, new RegExp(`['\"]${route.replaceAll('/', '\\/')}['\"]`), route);
});

test('public crawler rules allow pages and protect private utility routes', () => {
  const robots = read('app/robots.ts');
  assert.match(robots, /allow:\s*['"]\/["']/);
  assert.match(robots, /'\/api\/'/);
  assert.match(robots, /sitemap\.xml/);
});

test('global and page schemas contain HMSI public identifiers', () => {
  const layout = read('app/layout.tsx');
  const content = read('lib/seoContent.ts');
  for (const value of ['Help Meet Shine Initiative', '125103', '2621241776765', 'SC 121406403', 'Benin City', 'Edo State']) {
    assert.match(layout + content, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), value);
  }
  assert.match(content, /'@type': 'NGO'/);
  assert.match(content, /'@type': 'BreadcrumbList'/);
});

test('server-rendered SEO pages define unique canonical and OpenGraph metadata', () => {
  const programme = read('app/programmes/[slug]/page.tsx');
  const archive = read('app/field-stories/page.tsx');
  const story = read('app/field-stories/[slug]/page.tsx');
  for (const source of [programme, archive, story]) {
    assert.match(source, /alternates:\s*\{\s*canonical/);
    assert.match(source, /openGraph:/);
    assert.match(source, /JSON\.stringify/);
  }
  assert.match(story, /'@type': 'Article'/);
});
