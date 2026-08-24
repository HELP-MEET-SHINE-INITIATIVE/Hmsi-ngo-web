# HMSI Primary News Image Storage Reconciliation

**Prepared by:** Manus AI  
**Status:** Design only — no storage deletion is enabled by this document.  
**Scope:** Future HMSI newsroom images only.

## Purpose

The newsroom currently saves a public image URL in `news_articles.image_url`. Replacing an image changes that URL but leaves the older uploaded object in Supabase Storage. The purpose of this design is to retain the authoritative **storage object path** alongside the URL, record replacement candidates, and remove only files that a later verification confirms are unreferenced.

> **Safety principle:** A public URL is a presentation value; a storage path is the authoritative object identifier. Never infer deletion targets from arbitrary URLs supplied by a browser.

## Two viable approaches

| Approach | Trade-offs | Cost | Setup complexity |
|---|---|---:|---:|
| **A. Path column + deferred deletion queue** | Stores `image_path` on the article and queues the replaced path after the article update succeeds. It is compact and sufficient when the newsroom uses a dedicated storage prefix. It cannot fully account for uploads abandoned before an article is saved unless a later prefix scan is enabled. | Uses the existing database, storage bucket, and scheduled function. | Moderate |
| **B. Path column + media-asset ledger + deferred deletion queue** | Adds a ledger row at upload time, marks the row attached only after the article update succeeds, and records deletion attempts. It safely covers abandoned uploads, replacements, retries, auditability, and manual review. | Uses the existing database, storage bucket, and scheduled function. | Higher |

Approach **B** is the stronger long-term design for HMSI because the newsroom accepts uploads before an article is published. Approach **A** is the lighter alternative if HMSI only needs to clean up images that were previously attached to an article.

## Required storage boundary

Do **not** reconcile the existing broad `publisher-images/` prefix as a whole. It is shared by several publisher-facing features, and a scan could delete images belonging to another feature.

Instead, make all **new** newsroom uploads use a dedicated prefix:

```text
news-primary-images/<role>/<uuid>.webp
```

where `<role>` is `admin`, `worker`, `volunteer`, or `member`. Existing images under `publisher-images/` should be considered legacy and protected from automatic deletion until they have been explicitly migrated and verified.

## Database changes

Create a new additive migration, for example `supabase/news_primary_image_storage_patch.sql`. It should never alter or delete existing `image_url` values.

```sql
-- 1. Retain the authoritative object path next to the public display URL.
alter table public.news_articles
  add column if not exists image_path text;

-- A published record must have a complete image pair once the new workflow is active.
alter table public.news_articles
  add constraint news_articles_published_image_pair_check
  check (
    status <> 'published'
    or (image_url is not null and image_path is not null)
  ) not valid;

-- Prevent one dedicated news object from being linked to multiple articles.
create unique index if not exists news_articles_image_path_unique_idx
  on public.news_articles (image_path)
  where image_path is not null;

-- 2. Recommended: record every new newsroom image as soon as it is uploaded.
create table if not exists public.news_image_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  uploader_email varchar(320) not null,
  uploader_role text not null check (uploader_role in ('admin', 'worker', 'volunteer', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  attached_news_id uuid references public.news_articles(id) on delete set null,
  attached_at timestamptz,
  deletion_state text not null default 'active'
    check (deletion_state in ('active', 'pending_delete', 'deleted', 'failed', 'protected')),
  deletion_eligible_at timestamptz,
  deleted_at timestamptz,
  delete_attempts integer not null default 0,
  last_delete_error text
);

create index if not exists news_image_assets_reconcile_idx
  on public.news_image_assets (deletion_state, deletion_eligible_at)
  where deletion_state in ('active', 'pending_delete', 'failed');

-- 3. Give each replacement or abandoned upload a durable, auditable deletion task.
create table if not exists public.news_image_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  asset_id uuid references public.news_image_assets(id) on delete set null,
  reason text not null check (reason in ('replaced', 'unattached_upload', 'manual_review')),
  state text not null default 'pending'
    check (state in ('pending', 'processing', 'deleted', 'failed', 'protected')),
  eligible_at timestamptz not null,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index if not exists news_image_cleanup_queue_pending_idx
  on public.news_image_cleanup_queue (state, eligible_at)
  where state in ('pending', 'failed');

-- Add primary-image update events without weakening existing approval events.
alter table public.news_approval_events
  drop constraint if exists news_approval_events_action_check;

alter table public.news_approval_events
  add constraint news_approval_events_action_check
  check (action in ('submitted', 'approved', 'rejected', 'published', 'primary_image_updated'));
```

After the application has written valid `image_path` values for all new publication flows and any required legacy backfill has been reviewed, validate the deferred check:

```sql
alter table public.news_articles
  validate constraint news_articles_published_image_pair_check;
```

This sequence avoids breaking existing published records that have `image_url` values but no recoverable storage path.

## Upload route changes

Extend `POST /api/uploads/publisher-image` with an explicit server-controlled purpose, such as `purpose=news-primary`. The browser may request a purpose, but the server must validate it and choose the prefix itself.

```ts
const purpose = new URL(request.url).searchParams.get('purpose');
const isNewsPrimaryImage = purpose === 'news-primary';

const path = isNewsPrimaryImage
  ? `news-primary-images/${viewer.role}/${crypto.randomUUID()}.${optimizedImage.extension}`
  : `publisher-images/${viewer.role}/${crypto.randomUUID()}.${optimizedImage.extension}`;

// Upload optimizedImage as today, then derive the public URL server-side.
const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(path);

if (isNewsPrimaryImage) {
  await admin.from('news_image_assets').insert({
    storage_path: path,
    public_url: publicUrlData.publicUrl,
    uploader_email: viewer.email,
    uploader_role: viewer.role,
  });
}

return NextResponse.json({
  imageUrl: publicUrlData.publicUrl,
  imagePath: path,
  optimized: true,
});
```

The client should retain the pair returned by the server:

```ts
type ImageRef = { imageUrl: string; imagePath: string };

<OptionalImageUpload
  viewer={viewer}
  value={draft.imageUrl}
  imagePath={draft.imagePath}
  onChange={(imageUrl, imagePath) => {
    setDraft({ imageUrl, imagePath: imagePath || '' });
  }}
/>
```

For newsroom submissions, send both `image_url` and `image_path`. For the existing review queue, retain both fields in article state so an administrator can attach the selected image at approval or publication time.

## Server-side publish and replacement transaction

The publication route must never trust a browser-provided URL alone. It should accept a path only when the value matches the dedicated news prefix and its extension, derive the URL from the bucket itself, and confirm that the asset ledger knows the path.

```ts
const NEWS_PATH = /^news-primary-images\/(admin|worker|volunteer|member)\/[0-9a-f-]+\.webp$/i;

function cleanNewsImagePath(value: unknown) {
  const path = cleanText(value, 260);
  return NEWS_PATH.test(path) ? path : null;
}

async function resolveNewsImage(admin: SupabaseClient, requestedPath: unknown) {
  const imagePath = cleanNewsImagePath(requestedPath);
  if (!imagePath) throw new Error('A valid HMSI primary news image is required.');

  const { data: asset, error } = await admin
    .from('news_image_assets')
    .select('id,storage_path,public_url,deletion_state')
    .eq('storage_path', imagePath)
    .maybeSingle();

  if (error || !asset || asset.deletion_state !== 'active') {
    throw new Error('The selected primary news image is unavailable. Upload it again before publishing.');
  }

  return { assetId: asset.id, imagePath: asset.storage_path, imageUrl: asset.public_url };
}
```

For a replacement, use the following sequence. The database update must succeed **before** the previous file becomes eligible for removal.

| Step | Required operation | Failure outcome |
|---|---|---|
| 1 | Load the article’s current `image_path`. | Stop; do not upload or delete anything. |
| 2 | Resolve and validate the selected new `image_path` from `news_image_assets`. | Return a validation error; retain the old image. |
| 3 | Update the article’s `image_url` and `image_path`, and mark the new asset attached. | If the transaction fails, retain the old image and do not queue deletion. |
| 4 | After the update succeeds, enqueue the old path with a seven-day `eligible_at` grace period. | Log a queueing failure; do not delete the old object synchronously. |
| 5 | A later reconciliation run re-checks all references before removal. | If referenced, mark protected and leave it untouched. |

Illustrative server sequence:

```ts
const oldPath = existing.image_path;
const next = await resolveNewsImage(admin, payload.image_path);

const { error: updateError } = await admin
  .from('news_articles')
  .update({ image_url: next.imageUrl, image_path: next.imagePath })
  .eq('id', articleId);

if (updateError) throw new Error('Unable to save the new primary image.');

await admin.from('news_image_assets').update({
  attached_news_id: articleId,
  attached_at: new Date().toISOString(),
}).eq('id', next.assetId);

if (oldPath && oldPath !== next.imagePath) {
  await admin.from('news_image_cleanup_queue').upsert({
    storage_path: oldPath,
    reason: 'replaced',
    eligible_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'storage_path' });
}
```

For uploads that are never attached, the reconciliation job may enqueue active `news_image_assets` rows with `attached_news_id is null` only after a longer grace period, such as 24 hours. This gives administrators enough time to create and publish a draft without a race against cleanup.

## Scheduled reconciliation job

The HMSI production repository already uses authenticated Vercel cron endpoints in `vercel.json`. Add a separate daily route instead of an in-process timer. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured, and advises idempotent, reconciliation-based cron processing because invocations may be missed or duplicated.[1]

Add one schedule:

```json
{
  "path": "/api/cron/news-image-reconciliation",
  "schedule": "0 3 * * *"
}
```

The schedule is daily at approximately 03:00 UTC. Keep the initial run in dry-run mode for at least seven days. The actual time and cron limits depend on the Vercel plan; Vercel documents that Cron Jobs run in production and are configured through `vercel.json` followed by redeployment.[1]

Route shape:

```ts
// app/api/cron/news-image-reconciliation/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseStorageBucket } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BATCH_SIZE = 25;
const DRY_RUN = process.env.NEWS_IMAGE_RECONCILIATION_DRY_RUN !== 'false';

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: 'Storage reconciliation is not configured.' }, { status: 503 });

    const now = new Date().toISOString();
    const { data: candidates, error } = await admin
      .from('news_image_cleanup_queue')
      .select('id,storage_path,attempts')
      .in('state', ['pending', 'failed'])
      .lte('eligible_at', now)
      .order('eligible_at', { ascending: true })
      .limit(BATCH_SIZE);
    if (error) throw error;

    let deleted = 0;
    let protectedCount = 0;
    let failed = 0;

    for (const candidate of candidates || []) {
      // Re-check immediately before deletion; do not rely on stale queue state.
      const { data: reference, error: referenceError } = await admin
        .from('news_articles')
        .select('id')
        .eq('image_path', candidate.storage_path)
        .limit(1)
        .maybeSingle();
      if (referenceError) throw referenceError;

      if (reference) {
        protectedCount += 1;
        await admin.from('news_image_cleanup_queue').update({ state: 'protected', last_error: 'Path is still referenced by a news article.' }).eq('id', candidate.id);
        continue;
      }

      if (DRY_RUN) continue;

      const { error: removeError } = await admin.storage
        .from(getSupabaseStorageBucket())
        .remove([candidate.storage_path]);

      if (removeError) {
        failed += 1;
        await admin.from('news_image_cleanup_queue').update({
          state: 'failed',
          attempts: candidate.attempts + 1,
          last_error: removeError.message.slice(0, 500),
          eligible_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', candidate.id);
        continue;
      }

      deleted += 1;
      await admin.from('news_image_cleanup_queue').update({ state: 'deleted', deleted_at: now, last_error: null }).eq('id', candidate.id);
      await admin.from('news_image_assets').update({ deletion_state: 'deleted', deleted_at: now }).eq('storage_path', candidate.storage_path);
    }

    return NextResponse.json({ ok: true, dryRun: DRY_RUN, examined: candidates?.length || 0, deleted, protected: protectedCount, failed }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('[News image reconciliation] Failed:', error);
    return NextResponse.json({ error: 'News image reconciliation failed.' }, { status: 500 });
  }
}
```

Supabase requires object deletion through the Storage API rather than SQL; deleting storage metadata through SQL alone leaves orphaned bucket objects. Its `remove` operation accepts multiple paths but has a maximum batch size of 1,000, so a small batch of 25 is intentionally conservative for a serverless job.[2]

## Important implementation safeguards

| Safeguard | Requirement |
|---|---|
| **Dedicated prefix** | Reconcile only `news-primary-images/`; never sweep all `publisher-images/`. |
| **Grace window** | Use at least seven days for replaced images and 24 hours for never-attached uploads. |
| **Reference re-check** | Query `news_articles.image_path` immediately before each removal. A record that is still referenced must be marked `protected`, not deleted. |
| **No synchronous old-file delete** | Never delete the old object during the page request that saves a replacement. A failed database write must leave the old object available. |
| **Dry-run first** | Default the job to dry-run mode. Return only aggregate counts in production logs until results are reviewed. |
| **Idempotency** | Use unique `storage_path` values and queue-state transitions. Duplicate or missed cron invocations must not delete a newly referenced image. |
| **Bounded work** | Process a small, fixed candidate batch and retry failures later. Do not enumerate or delete an entire bucket in one request. |
| **Authorization** | Require `CRON_SECRET` and return 401 before any database or storage operation when the bearer token is invalid. |
| **Observability** | Record state, attempt count, timestamps, and a truncated error message in the queue. Do not log public URLs or user email addresses unnecessarily. |

## Rollout sequence

1. **Deploy the additive schema only.** Do not validate the published-image pair constraint yet.
2. **Deploy the upload and newsroom API changes** so new images use `news-primary-images/` and write both `image_url` and `image_path`.
3. **Run approval and replacement tests** using a dedicated test article. Verify that a replacement queues the old path but does not delete it.
4. **Deploy the reconciliation endpoint with `NEWS_IMAGE_RECONCILIATION_DRY_RUN=true`.** Add the Vercel cron entry and redeploy.
5. **Review at least seven daily dry-run reports.** Resolve any unexpected protected, failed, or legacy-path records before enabling deletion.
6. **Set `NEWS_IMAGE_RECONCILIATION_DRY_RUN=false` only after explicit administrative approval.** Keep the seven-day replacement grace window.
7. **Validate the database check constraint** once all newly published articles retain valid image pairs.

## Test cases

| Scenario | Expected result |
|---|---|
| Upload a news image and abandon the draft | Asset stays available during grace period; later appears as a deletion candidate, initially in dry-run output. |
| Publish a new article | `image_url`, `image_path`, and the asset attachment all point to the same object. |
| Replace a published image | Article points to the new object; old object enters the queue with a future eligibility date; no immediate storage deletion occurs. |
| Replace an image twice before the first job | One queue record per obsolete path; the currently referenced path is never eligible for removal. |
| Cron runs twice | The first run records `deleted`; the second run skips it. No duplicate deletion occurs. |
| Candidate is reattached before cleanup | Reconciliation marks it `protected` after the final reference check. |
| Storage deletion fails | Queue state becomes `failed`, attempt count increases, and a later retry is scheduled; the database record remains auditable. |
| Unauthorized cron request | HTTP 401; no database query or storage deletion is attempted. |
| Legacy `publisher-images/` record | It is not scanned or deleted automatically. |

## Explicit approval boundary

The schema, upload-path, queue, and dry-run reporting work are non-destructive. Enabling actual deletion with `NEWS_IMAGE_RECONCILIATION_DRY_RUN=false`, or manually deleting any existing storage object, is destructive and should happen only after a named administrator explicitly authorizes it.

## References

[1] [Vercel, *Managing Cron Jobs*](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

[2] [Supabase, *Delete Objects*](https://supabase.com/docs/guides/storage/management/delete-objects)

[3] [Supabase, *JavaScript Storage Client Reference*](https://supabase.com/docs/reference/javascript/file-buckets-list)
