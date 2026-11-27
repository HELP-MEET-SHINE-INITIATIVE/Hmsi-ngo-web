import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('RSS route emits RSS 2.0 XML and the required channel fields', () => {
  const route = read('app/rss.xml/route.ts');
  assert.match(route, /<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(route, /<rss version="2\.0">/);
  assert.match(route, /<channel>/);
  assert.match(route, /<title>\$\{escapeXml\(FEED_TITLE\)\}<\/title>/);
  assert.match(route, /<atom:link[^>]+application\/rss\+xml/);
  assert.match(route, /Content-Type': 'application\/rss\+xml; charset=utf-8'/);
});

test('RSS source selection is public and includes required HMSI content groups', () => {
  const route = read('app/rss.xml/route.ts');
  assert.match(route, /fieldStories/);
  assert.match(route, /programmes/);
  assert.match(route, /getFundraisers/);
  assert.match(route, /\.eq\('status', 'published'\)/);
  assert.doesNotMatch(route, /author_email|contact_email|contact_phone|contact_location/);
});

test('RSS fundraiser descriptions use a privacy-safe summary instead of user narratives', () => {
  const route = read('app/rss.xml/route.ts');
  assert.match(route, /FUNDRAISER_FEED_DESCRIPTION/);
  assert.match(route, /HMSI community fundraising initiative/);
  assert.match(route, /description: FUNDRAISER_FEED_DESCRIPTION/);
  assert.doesNotMatch(route, /description: cleanText\(fundraiser\.description\)/);
});

test('site metadata advertises the canonical RSS feed', () => {
  const layout = read('app/layout.tsx');
  assert.match(layout, /'application\/rss\+xml': 'https:\/\/www\.hmsi\.org\.ng\/rss\.xml'/);
});
