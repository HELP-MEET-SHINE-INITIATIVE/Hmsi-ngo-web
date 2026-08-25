import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const newsApiSource = await readFile(new URL('../app/api/news/route.ts', import.meta.url), 'utf8');
const newsroomStudioSource = await readFile(new URL('../components/NewsroomStudio.tsx', import.meta.url), 'utf8');
const newsPageSource = await readFile(new URL('../components/NewsPageContent.tsx', import.meta.url), 'utf8');
const newsFlashSource = await readFile(new URL('../components/NewsFlash.tsx', import.meta.url), 'utf8');

test('newsroom requires a primary image for direct publication and permits an admin correction afterward', () => {
  assert.match(newsApiSource, /if \(isAdmin && !imageUrl\)/);
  assert.match(newsApiSource, /payload\.action === 'save_image'/);
  assert.match(newsApiSource, /Add a primary news image before publishing/);
  assert.match(newsApiSource, /primary_image_updated/);
  assert.match(newsApiSource, /image_url: primaryImageUrl/);
  assert.match(newsApiSource, /Published news can only have its primary image updated/);
});

test('admin newsroom offers direct image upload before publish and when correcting an existing article', () => {
  assert.match(newsroomStudioSource, /label="Primary news image"/);
  assert.match(newsroomStudioSource, /Publish news with primary image/);
  assert.match(newsroomStudioSource, /Publish with main image/);
  assert.match(newsroomStudioSource, /action, reason: reason\.trim\(\), image_url: imageUrl/);
  assert.match(newsroomStudioSource, /Save main image/);
  assert.match(newsroomStudioSource, /Public headline and article image/);
});

test('public newsroom and homepage news flash use the stored primary image instead of an unrelated fallback photo', () => {
  assert.match(newsPageSource, /Main image for \$\{article\.headline\}/);
  assert.match(newsPageSource, /article\.image_url/);
  assert.doesNotMatch(newsPageSource, /outreach-10\.png/);
  assert.match(newsFlashSource, /image_url: string \| null/);
  assert.match(newsFlashSource, /activeArticle\.image_url/);
});

test('Live News ticker requests only the newest approved or published record and links to that exact article', () => {
  assert.match(newsApiSource, /query = query\.in\('status', \['approved', 'published'\]\)/);
  assert.match(newsApiSource, /\.order\('published_at', \{ ascending: false, nullsFirst: false \}\)/);
  assert.match(newsApiSource, /if \(!requestedId && limit\) query = query\.limit\(limit\)/);
  assert.match(newsFlashSource, /fetch\('\/api\/news\?limit=1'/);
  assert.match(newsFlashSource, /const activeArticle = headlines\[0\]/);
  assert.match(newsFlashSource, /href=\{`\/news\/\$\{activeArticle\.id\}`\}/);
  assert.match(newsFlashSource, /latest approved update/);
});
