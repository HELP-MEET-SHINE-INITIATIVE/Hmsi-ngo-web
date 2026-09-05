# HMSI News Archive and Controlled Publishing
## Engineering Handover

**Repository:** `HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web`  
**Working path:** `/home/ubuntu/Hmsi-ngo-web-source`  
**Delivered commit:** `4731dc21718b9ae55bf29e9d41b1fe293cb92b9c`  
**Short commit:** `4731dc2`  
**Handover status:** Ready for engineering review and deployment follow-through  
**Author:** Manus AI  

> **Scope note:** The live data reset was deliberately reversible. Ten existing `published` or `approved` articles were archived; no hard deletion was performed and no new article was posted.

---

## 1. Executive summary

This release establishes a single public-news boundary and a reversible reset procedure. Public consumers now receive only articles whose status is exactly `published`. Records in `approved`, `draft`, `pending_admin_approval`, `pending_editorial_review`, `revision_requested`, `rejected`, or `archived` remain outside the public feed unless a future, explicit workflow changes their state.

Administrators remain the only actors permitted to publish to the public feed. Approved publisher pathways may submit and resubmit content through the protected portal, but they cannot publish directly. The administrator editorial workspace supports review, editing, revision requests, rejection, archive, and publication actions.

The live reset archived ten existing public/approved records and left nine records pending administrator approval. The archive operation preserved approval history and added archive metadata. It used no hard-delete operation.

---

## 2. Commit inventory

The commit includes six intended files. No unrelated inherited documentation or working-tree files were included in the commit.

| File | Change | Engineering impact |
|---|---|---|
| `app/api/news/route.ts` | Public unauthenticated queries now require `status = 'published'` | Locks public list and detail responses to final publication state |
| `app/api/admin/news/archive-all/route.ts` | New authenticated, same-origin, explicitly confirmed archive-all endpoint | Provides bounded, auditable, reversible reset of `published` and `approved` records |
| `components/EditorialWorkspace.tsx` | Adds confirmed archive-current-news control | Gives administrators a visible, controlled operational path |
| `components/NewsFlash.tsx` | Changes ticker wording from “latest approved update” to “latest published update” | Aligns public copy with actual visibility semantics |
| `tests/news-primary-image.test.mjs` | Updates published-only expectation and adds archive-route safeguards | Protects public filtering and reset controls from regression |
| `supabase/news_reversible_archive_patch.sql` | Adds archive columns, status constraint support, and indexes | Makes the archive state durable and queryable |

The source tree may still contain unrelated uncommitted files from earlier work. Do not use `git add .` in this working copy for follow-up commits. Stage only files belonging to the intended change.

---

## 3. Database change

The additive migration is located at `supabase/news_reversible_archive_patch.sql`. It adds the following nullable columns to `public.news_articles`:

| Column | Type | Purpose |
|---|---|---|
| `archived_at` | `timestamptz` | UTC time when the record entered the archived state |
| `archive_reason` | `text` | Human-readable operational reason for archiving |
| `scheduled_archive_at` | `timestamptz` | Existing/compatible schedule field used by editorial retention automation |

The migration also updates the status constraint to include `archived`, creates an index for archived records, and creates a partial index for published records ordered by `published_at`.

Before applying the migration in another environment, inspect the current schema and migration history. The operation is additive, but the constraint replacement should still be reviewed for drift. Confirm that all application queries selecting `scheduled_archive_at`, `archived_at`, or `archive_reason` are backed by the deployed schema.

The public API uses the service-role data client behind the server boundary. Client code must not be given service-role credentials, and public clients must not query the table directly to bypass the published-only rule.

---

## 4. Archive-all endpoint

### Endpoint

```text
POST /api/admin/news/archive-all
```

### Required controls

The endpoint requires all of the following:

1. A valid administrator identity from `getEditorialAdmin(request)`.
2. A same-origin request verified by `hasSameOrigin(request)`.
3. A JSON confirmation value exactly equal to `ARCHIVE_ALL_PUBLISHED_NEWS`.
4. A configured server-side Supabase admin client.
5. A bounded batch size of 50 records per read cycle.
6. A status-conditional update, which prevents a record that changed concurrently from being overwritten.
7. An `archived` event in `news_approval_events` for each successful update.

### Request example

```bash
curl -X POST "$HMSI_ORIGIN/api/admin/news/archive-all" \
  -H "Content-Type: application/json" \
  -H "Cookie: <authenticated-admin-cookie>" \
  --data '{"confirm":"ARCHIVE_ALL_PUBLISHED_NEWS"}'
```

Do not run this command against production without an explicit management-approved reset decision and a fresh preflight count. The route is intentionally unsuitable for unauthenticated automation.

### Response semantics

A successful response includes `ok`, `examined`, `archived`, `sourceStatuses`, `reversible`, and a human-readable message. A response with `reversible: true` confirms that the route did not perform a hard deletion. A partial or failed operation returns an error and must be reconciled against the database and audit events before retrying.

---

## 5. Live reset evidence

The live Supabase project was identified as `Hmsi-ngo-web` with project reference `mutosvokcxkpiqxewcva`.

The reset transaction selected only records with status `published` or `approved`, limited the candidate set to 1,000 records, changed them to `archived`, set archive metadata, cleared the scheduled archive date, and inserted an `archived` event per updated record.

The verification query returned the following status counts:

| Status | Count after reset |
|---|---:|
| `archived` | 10 |
| `pending_admin_approval` | 9 |

No `published` or `approved` records remained in the verification result. No hard deletion was executed.

The audit actor used for the direct administrator-approved reset was `admin@hmsi.org.ng`. If the organisation requires named human attribution instead of the official administrative mailbox, future direct SQL resets should be replaced by the protected route under the authenticated administrator identity.

---

## 6. Safe archive restoration procedure

Restoration must never make an archived article public in one step. The safe target state is a private editorial state, followed by a fresh review and an explicit administrator publication action.

### Recommended restoration sequence

**Step 1: Identify the archived record.** Use the protected administrator archive view and confirm the article ID, title, original author, archive reason, archive timestamp, image, media references, and previous publication metadata.

**Step 2: Check for blockers.** Confirm that the article does not contain current privacy, safeguarding, legal, factual, or image-rights concerns. Confirm that no retention or legal hold requires it to remain archived or restricted.

**Step 3: Restore to private review.** Restore the record to `draft` or the current private review state, not directly to `published`. Clear stale publication metadata only if the product policy requires it; preserve the historical publication timestamp in the audit history rather than silently overwriting it.

**Step 4: Record a restoration event.** The restoration must include the administrator identity, time, reason, source state, target state, article ID, and a correlation ID. If `news_approval_events` does not yet allow a `restored` action, add an approved schema value through a migration before implementing the route. Do not silently reuse `published` for a restoration event.

**Step 5: Re-review the content.** Recheck headline, summary, body, category, attribution, primary image, media links, and public-safety considerations. The article should be treated as potentially stale.

**Step 6: Publish through the editorial workspace.** Only after fresh review should an administrator use `Approve & Publish`. This action sets `status = 'published'`, stamps the current approval/publication metadata, and records a publication event.

**Step 7: Verify public behavior.** Open the exact article URL, the public news list, and the homepage ticker. Confirm that the article appears only after publication and that the displayed image and text match the reviewed record.

### Example restoration SQL for a controlled maintenance window

The following is a reference pattern, not a command to run blindly. Use it only after confirming the deployed schema, event constraint, RLS model, and named operator identity. Prefer a protected restoration API route so server-side authorization and audit logic remain centralized.

```sql
begin;

with candidate as (
  select id
  from public.news_articles
  where id = :article_id
    and status = 'archived'
  limit 1
), restored as (
  update public.news_articles n
  set status = 'draft',
      archive_reason = null,
      scheduled_archive_at = null,
      reviewed_by = :operator_email,
      reviewed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  from candidate c
  where n.id = c.id
    and n.status = 'archived'
  returning n.id
)
select id from restored limit 1;

-- Insert a dedicated restoration event only if the deployed event constraint
-- explicitly permits action = 'restored'. Otherwise use the approved API route
-- or apply the event-schema migration first.

commit;
```

The restoration query intentionally targets `draft`, not `published`. A separate administrator publication action is required.

---

## 7. Recovery limitations and recommended follow-up

The current release provides archive and archive-all controls. Engineering should add a dedicated protected restore endpoint before routine recovery is needed. The endpoint should require administrator authentication, same-origin validation, an explicit article ID, a reason, and a transition from `archived` to `draft` or `pending_admin_approval` only.

The restore endpoint should also write a dedicated `restored` audit event. If the event table uses a constrained action list, update that list through a migration and add regression tests before deployment.

A restore endpoint should not accept a client-supplied `reviewed_by`, `approved_by`, `published_at`, or `status` value. The server must derive the actor from the authenticated request and must choose the permitted target state itself.

---

## 8. Verification commands

### Local focused tests

```bash
cd /home/ubuntu/Hmsi-ngo-web-source
node --test tests/news-primary-image.test.mjs
```

Expected result for the delivered release: **5 tests passed, 0 failed**.

### Full repository tests

```bash
cd /home/ubuntu/Hmsi-ngo-web-source
npm test
```

Expected result at handover: **99 tests passed, 0 failed**.

### Production build

```bash
cd /home/ubuntu/Hmsi-ngo-web-source
npm run build
```

The build passed. Existing warnings about the deprecated Next.js middleware convention and an Edge Runtime Node API were not introduced by this change and should be tracked separately.

### Git verification

```bash
git show --stat --oneline 4731dc2
git status --short
git log -1 --oneline
```

The commit was pushed to `origin/main`. CI and dependency-audit workflows were triggered for the resulting merge commit `4731dc21718b9ae55bf29e9d41b1fe293cb92b9c`.

---

## 9. Deployment checklist

| Check | Required result |
|---|---|
| Migration applied in target environment | Archive columns, status constraint, and indexes exist |
| Public API inspected | Unauthenticated requests filter `status = 'published'` |
| Admin route protected | Unauthenticated and cross-site requests return an error |
| Confirmation gate tested | Missing or incorrect confirmation does not mutate data |
| Audit event tested | Every successful archive update has a matching archive event |
| Empty public state tested | No published articles produces the intended empty/quiet state |
| Contributor route tested | Approved non-admin roles can submit; they cannot publish |
| Image gate tested | Direct publication without a primary image is rejected |
| Restore procedure rehearsed | Archived article returns to private review, never directly to public |
| External distributions reviewed | Newsletter, social, RSS, and other integrations use published-only data |
| CI and dependency audit complete | No release-blocking failure remains |

---

## 10. Rollback guidance

### Code rollback

If the code release causes a material regression, use the repository’s standard reviewed rollback process or revert the specific commit. Do not use `git reset --hard` on the shared working copy. Preserve the archive migration and data state unless the incident specifically concerns the schema.

### Data rollback

Do not bulk-change all archived records back to `published`. Recovery must be article-specific and must return records to a private editorial state first. If a faulty archive operation is discovered, stop further automation, identify affected IDs from the audit events, obtain administrator approval, and restore only the confirmed records through the controlled recovery process.

### Migration rollback

The migration is additive, so the preferred rollback is code compatibility rather than dropping columns or indexes. Do not drop `archived_at`, `archive_reason`, or `scheduled_archive_at` while any deployed code, audit process, or recovery workflow depends on them.

---

## 11. Ownership and operational handoff

| Responsibility | Suggested owner |
|---|---|
| Public publication authority | Named HMSI administrators |
| Editorial quality and recovery decisions | Editorial lead |
| Safeguarding review | HMSI safeguarding lead |
| Privacy and retention review | HMSI privacy/data-governance owner |
| Schema migration and deployment | Engineering lead |
| External-feed query review | Engineering and communications leads |
| Access recertification | Portal/security administrator |

The engineering team should create a follow-up issue for a protected article-restore endpoint, a dedicated `restored` audit action if not already supported, and an automated integration test that proves archived content cannot become public without a fresh publication action.

## 12. Handover conclusion

The release establishes a safer newsroom contract: contributors may participate through moderated submission, administrators control public release, and the public receives only explicitly published content. The live archive reset removed ten records from public visibility without hard deletion, and the deployment includes the schema, route, UI, and regression-test changes needed to keep that boundary enforceable.
