import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('homepage featured story links to the clicked published record instead of a static legacy story', async () => {
  const card = await read('components/HomepageFeaturedStoryCard.tsx');
  assert.ok(card.includes('const storyHref = isFallback ? \'/stories\' : `/stories/${story.id}`;'), 'Expected a record-specific story route.');
  assert.ok(card.includes('href={storyHref}'), 'Expected the featured story card to use its generated route.');
  assert.ok(card.includes('Read full story'), 'Expected the visible featured-story action.');
  assert.ok(!card.includes('Needs: Supporting Frontline Workers'), 'A legacy static story destination must not be retained.');
});

test('story detail renderer loads and displays the route parameter’s published record', async () => {
  const detail = await read('components/FeaturedStoryContent.tsx');
  const api = await read('app/api/stories/route.ts');
  for (const token of ['const id = params.id as string', 'fetch(`/api/stories?id=${encodeURIComponent(id)}`', 'story.title', 'story.excerpt', 'story.body', 'story.image_url']) {
    assert.ok(detail.includes(token), `Expected detail renderer to use ${token}.`);
  }
  for (const token of ["searchParams.get('id')", "query = query.eq('id', storyId)", "query = query.eq('status', 'published')"]) {
    assert.ok(api.includes(token), `Expected stories API to constrain the requested published record using ${token}.`);
  }
});
