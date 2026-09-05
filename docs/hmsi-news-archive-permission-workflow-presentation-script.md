# HMSI News Archive and Permission Workflow
## Team Presentation Script

**Audience:** HMSI administrators, editorial reviewers, approved publisher-pathway volunteers, workers, and programme leads  
**Presenter:** Manus AI  
**Suggested duration:** 15–20 minutes  
**Purpose:** Explain what changed, why it changed, who can perform each action, and how the team should operate the newsroom safely.

> **Presenter note:** This script describes the deployed workflow and the verified archive reset. It is an operational briefing, not a substitute for HMSI safeguarding, privacy, or editorial policy.

---

## Opening: What changed and why

**Say:**

“Today we are reviewing an important change to the HMSI newsroom. We have reset the public news surface without destroying the underlying editorial history, and we have clarified who may submit, review, publish, and archive news.

The goal is straightforward: the public website should show only news that has passed the full editorial process, while contributors should still have a simple route to submit useful field information. At the same time, administrators need an organised workspace where they can review content, correct it, request revisions, publish it, or retain it in the archive.

This is a control improvement, not a restriction on community participation. It protects the credibility of HMSI’s public communications while keeping the contribution pathway open and accountable.”

**Emphasise:** The team should think of the workflow as **submit → review → publish**, never submit → public automatically.

---

## Section 1: The archive reset

**Say:**

“Before the workflow changes were completed, the existing public news records were reviewed. The agreed action was a reversible archive reset rather than permanent deletion.

All records that were currently marked `published` or `approved` were moved to the `archived` state. The operation preserved the article records, retained the existing approval history, recorded an archive timestamp and reason, and added an audit event for each archived record. No hard deletion was performed.

The live verification showed ten archived records and nine records still pending administrator approval. The public feed therefore has no published items until an administrator deliberately approves and publishes a new article.”

### What the reset means

| Area | Result | Team implication |
|---|---|---|
| Public feed | No archived or approved item is displayed | Visitors see an honest empty state until new content is published |
| Editorial queue | Pending records remain available to administrators | Editors can continue review without losing submissions |
| Audit history | Previous approval history is retained | The decision trail remains available for accountability |
| Recovery | Articles are archived, not hard-deleted | An administrator can review or restore them through the protected workflow |
| New posting | Nothing is automatically posted | Every public article requires an explicit administrator publication action |

**Say:**

“The key distinction is between removing something from public view and destroying it. The reset removed old material from the public surface while preserving the editorial record for controlled review and recovery.”

**Handoff question:**

“Can everyone explain the difference between an archived article and a deleted article? An archived article is retained for review and recovery; a deleted article would be removed from the system. This release used archive, not hard deletion.”

---

## Section 2: Who can do what

**Say:**

“The new workflow uses role separation. The administrator is the only role that can publish directly to the public news feed. Approved community contributors may submit content, but their submissions enter a private editorial queue and do not become public automatically.”

| Role or pathway | Submit news | Edit own submission | Request revisions | Publish publicly | Archive |
|---|---:|---:|---:|---:|---:|
| Administrator/editor | Yes | Yes | Yes | Yes | Yes |
| Community Publisher | Yes, through portal | Resubmit requested revisions | No | No | No |
| Humanitarian Activist | Yes, through portal | Resubmit requested revisions | No | No | No |
| Independent Field Reporter | Yes, through portal | Resubmit requested revisions | No | No | No |
| Worker without an approved publisher pathway | No publisher submission access | No | No | No | No |
| Public visitor | No | No | No | No | No |

**Say:**

“Administrator status is not merely a visual menu setting. The server checks the actor before accepting editorial actions. The user interface may hide controls from non-administrators, but the server remains the final authorization boundary.

Contributor roles are deliberately limited. Their role is to provide field information and media references. Their role is not to bypass editorial review or make official publication decisions.”

**Operational rule:** Never publish manually by editing database status values or using an unapproved integration. Use the protected editorial controls so the approval event, reviewer identity, timestamp, and reason are recorded.

---

## Section 3: The contributor submission path

**Say:**

“An approved publisher-pathway contributor uses the protected submission portal. They provide a headline, summary, article body, category, attribution, and either a primary image or an approved Google Drive media reference where appropriate.

When the contributor selects ‘Submit for Review,’ the article receives a pending editorial status. The confirmation tells the contributor that the dispatch has been submitted to the HMSI Editorial Team for review. The article is not visible in the public feed at this stage.

If an administrator requests revisions, the contributor receives clear feedback and may resubmit through the protected pathway. A resubmission returns to editorial review. It does not become public merely because it was revised.”

### Contributor expectations

“Contributors should use factual, respectful language, identify the location and context at an appropriate level of detail, avoid unnecessary personal information, and separate urgent safeguarding concerns from ordinary editorial submissions. Safeguarding or confidential protection concerns must use the confidential route rather than the public-news form.”

---

## Section 4: The administrator editorial path

**Say:**

“The administrator begins in the protected Editorial Queue. Pending items show the title, contributor, date, category, thumbnail or image state, and the prominent pending-review status.

The reviewer opens the inspection drawer to read the full content, review the cover image, check the summary, and inspect the attribution and media reference. The reviewer then chooses the appropriate action.”

| Action | When to use it | Result |
|---|---|---|
| Save as draft | Content needs work but no final decision has been made | Article remains private in the draft queue |
| Request revisions | Contributor input is useful but changes are required | Contributor receives feedback and the article returns to a revision pathway |
| Reject | Content is unsuitable, unverifiable, unsafe, or outside scope | Article is not published and the reason is retained |
| Archive | The record should be retained but removed from active handling | Article remains recoverable and private |
| Approve & Publish | Review is complete and the item meets HMSI standards | Article becomes public and receives publication metadata |

**Say:**

“Before publication, the system requires a primary news image. This ensures that the same approved image can be used consistently on the public headline card and the article detail page. If the image is missing, the server rejects the publication request and explains that a primary news image must be selected.”

“Approval and publication are recorded with the reviewer identity, review timestamp, approval timestamp, publication timestamp, and an editorial event. The public-facing pending badge disappears because the article is now explicitly published.”

---

## Section 5: Public visibility and the empty state

**Say:**

“The public API has been tightened to return only records whose status is exactly `published`. An `approved` record is still private until the publication action is completed. This removes ambiguity between editorial approval and public release.

The homepage Live News ticker uses the same public boundary. It requests the newest published item and links directly to that article’s own record. If there are no published items, the ticker remains quiet rather than showing stale placeholder content.

The public `/news` page also has an explicit empty state. This is intentional. It is better to show ‘No published news yet’ than to display old, unapproved, or placeholder material.”

**Team reminder:** If the public feed is empty, do not create a placeholder article simply to fill the page. Use the editorial process to prepare and publish a genuine, reviewed HMSI update.

---

## Section 6: Archive review and recovery

**Say:**

“Archived records remain visible to administrators through the archived editorial view. The archive includes the archive timestamp, archive reason, and the existing article metadata. Recovery should be treated as a deliberate editorial decision, not an automatic undo.

To recover an item, an authorized administrator should first confirm that the article is still accurate, that the image and media links remain valid, that no safeguarding or privacy concern has emerged, and that the item still meets current editorial standards. The administrator should then restore it to a private review state and publish it again only through the normal approval controls.

Do not change an archived record directly in the database. Direct database changes bypass the normal review and audit trail.”

---

## Section 7: What we improved

**Say:**

“We made several improvements beyond the reset itself.

First, the public query boundary is now unambiguous: published only. Second, the homepage ticker uses the active record rather than a hardcoded headline. Third, the contributor path remains open but moderated. Fourth, the administrator has a protected, confirmed, reversible archive-all control for future cleanup operations. Fifth, the article model now has explicit archive metadata and the status constraint includes `archived`. Sixth, regression tests check publication authorization, image requirements, published-only visibility, exact article links, and archive-route safeguards.

These changes make the newsroom easier to understand for new team members: contributors submit, administrators decide, and the public sees only published content.”

---

## Section 8: Validation results

**Say:**

“The implementation was checked in three ways. The focused news regression suite passed all five tests. The full HMSI Node test suite passed all ninety-nine tests. The production build passed after removing an unused Vitest-only reference file that was incompatible with the repository’s supported test configuration.

The live database verification confirmed ten archived records and nine pending administrator-approval records. The reset did not post any new story, and no hard deletion occurred.

The code changes were committed and pushed to the HMSI GitHub repository in commit `4731dc2`. The CI and dependency-audit workflows were then triggered for that commit.”

> **Presenter note:** CI status should be rechecked immediately before presenting this section if the briefing is delivered after the deployment window.

---

## Section 9: Team operating procedure

**Say:**

“From this point forward, the team should use the following operating sequence.

A contributor submits a dispatch through the protected portal. The editorial team reviews the content, image, attribution, category, and safety considerations. If changes are needed, the reviewer requests revisions with clear feedback. If the item is unsuitable, the reviewer rejects or archives it with a reason. If it meets the standard, an authorized administrator publishes it. The public feed and Live News ticker then pick it up automatically because the record now has the `published` status.

If an item needs to be removed from public view, archive it through the protected editorial control. Do not hard-delete it unless a separately approved retention or privacy process requires that action.”

### Practical checklist

| Before submitting | Before publishing | After publishing |
|---|---|---|
| Confirm the story is appropriate for public editorial review | Confirm the contributor and attribution | Confirm the public article URL opens correctly |
| Remove unnecessary personal or confidential information | Check headline, summary, body, category, and image | Confirm the ticker uses the same article |
| Use the confidential safeguarding route for protection concerns | Confirm a primary image exists | Monitor for corrections or safeguarding concerns |
| Provide a valid media reference where needed | Record the editorial decision through the workspace | Archive through the workspace if removal is needed |

---

## Closing: The principle to remember

**Say:**

“The principle to remember is simple: **participation is open, publication is controlled, and public visibility is explicit**.

HMSI welcomes useful field knowledge from approved contributors. The organisation also has a responsibility to verify, protect, and present that knowledge responsibly. The updated newsroom supports both responsibilities.

If you are a contributor, submit through the portal and wait for editorial feedback. If you are an administrator, use the protected queue and record your decision. If you are unsure whether information belongs in a public story, pause and ask for editorial, privacy, or safeguarding guidance before submitting or publishing.

The public feed is intentionally empty until the next story has completed the process. That is not a failure; it is evidence that the workflow is working as designed.”

## Discussion prompts

1. Which role is responsible for the final public publication decision?
2. What is the difference between `approved` and `published`?
3. What should a contributor do when a submission contains a safeguarding concern?
4. What information must be checked before recovering an archived article?
5. Why is an empty public feed preferable to a stale placeholder article?

## Presenter reference

The implementation described here is supported by the HMSI source files for the public news API, administrator editorial workspace, archive endpoint, reversible archive migration, and news regression tests. The verified reset affected the live Hmsi-ngo-web Supabase project and archived ten records; it did not create or publish new news content.
