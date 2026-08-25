import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('homepage field-story cards use live public records instead of static placeholders', async () => {
  const homepage = await read('app/page.tsx');
  const feed = await read('components/HomepageFieldStoryFeed.tsx');
  assert.ok(homepage.includes('<HomepageFieldStoryFeed />'), 'Expected homepage to render the dynamic field-story feed.');
  for (const placeholder of ['HMSI field update', 'Programme context', 'Volunteer information']) assert.ok(!homepage.includes(placeholder), `Static placeholder ${placeholder} must be removed.`);
  for (const token of ['/api/stories?limit=3', 'const href = `/stories/${story.id}`', 'trackStoryClick(href)', 'toLocaleDateString']) assert.ok(feed.includes(token), `Expected dynamic story-feed behavior ${token}.`);
});

test('public story query serves only approved or published records and supports record-specific category filtering', async () => {
  const api = await read('app/api/stories/route.ts');
  for (const token of ["searchParams.get('id')", "searchParams.get('exclude')", "searchParams.get('category')", "query = query.in('status', ['published', 'approved'])", "query = query.eq('id', storyId)", 'query = query.eq(\'category\', category)', 'query = query.limit(limit)']) assert.ok(api.includes(token), `Expected bounded public story query support for ${token}.`);
});

test('story detail loads its own record, prioritizes category-related stories, renders dates, and records aggregate click events', async () => {
  const detail = await read('components/FeaturedStoryContent.tsx');
  for (const token of ['const id = params.id as string', 'fetch(`/api/stories?id=${encodeURIComponent(id)}`', 'category=${encodeURIComponent(currentStory.category)}', 'fetch(`/api/stories?exclude=${encodeURIComponent(id)}&limit=20`', 'story.gallery_images', 'toLocaleDateString(\'en-NG\')', 'trackStoryClick(href)']) assert.ok(detail.includes(token), `Expected dynamic detail behavior ${token}.`);
});

test('updates aliases preserve exact record routing and gallery CRUD remains administrator-only and storage-scoped', async () => {
  const alias = await read('app/updates/[id]/page.tsx');
  const galleryApi = await read('app/api/admin/gallery/route.ts');
  const migration = await read('supabase/outreach_gallery_patch.sql');
  assert.ok(alias.includes('redirect(`/stories/${encodeURIComponent(id)}`)'), 'Expected /updates record alias to preserve the story identifier.');
  for (const token of ["viewer.role !== 'admin'", 'outreach-gallery/${storyId}/', 'startsWith(`outreach-gallery/${image.story_id}/`)', 'is_deleted: true', 'storage_delete_failed']) assert.ok(galleryApi.includes(token), `Expected guarded gallery behavior ${token}.`);
  for (const token of ['create table if not exists public.outreach_gallery_images', 'create table if not exists public.outreach_gallery_events', 'enable row level security', 'sort_order integer']) assert.ok(migration.includes(token), `Expected gallery migration control ${token}.`);
});
