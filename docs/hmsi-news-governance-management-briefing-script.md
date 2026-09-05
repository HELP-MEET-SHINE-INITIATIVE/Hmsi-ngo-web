# HMSI News Governance Changes
## Management Presentation Script

**Audience:** HMSI leadership, programme directors, administrators, editorial leads, safeguarding leads, and operational managers  
**Presenter:** Manus AI  
**Suggested duration:** 20–25 minutes  
**Decision purpose:** Confirm the rationale, control design, operating model, evidence, residual risks, and next actions for HMSI’s news archive reset and tightened publication permissions.

> **Presenter note:** This briefing describes the implemented workflow and management implications. It is not legal advice. Privacy, safeguarding, records-retention, and public-communications obligations should remain subject to appropriate professional review.

---

## 1. Executive opening

**Say:**

“Today I am presenting the rationale behind two connected newsroom decisions.

First, HMSI removed the current public news inventory from the live public surface through a reversible archive reset. Second, HMSI tightened the permission workflow so that public publication is an explicit administrator decision, while approved contributors retain a clear and moderated route to submit field information.

These changes address a governance problem, not simply a user-interface problem. A public news platform must distinguish between content that has been submitted, content that has been reviewed, content that has been approved internally, and content that has actually been released to the public. The updated workflow makes those stages explicit.

The management conclusion is straightforward: HMSI has preserved participation, improved accountability, reduced the risk of accidental publication, and created a cleaner foundation for trustworthy public communications.”

### Management message

> **Open participation does not require uncontrolled publication.** HMSI can welcome field knowledge while reserving the final public-release decision for authorized administrators.

---

## 2. The problem the changes solve

**Say:**

“Before this change, several conditions created avoidable governance risk. The newsroom contained records in multiple editorial states, and the public query treated both approved and published records as public. That blurred the distinction between internal approval and final release.

The homepage ticker and public news surfaces also depended on whatever the public query returned. If a record was approved but not yet explicitly published, it could be treated as public content. In addition, a stale or placeholder item could undermine trust if it appeared more current than the verified newsroom record.

The solution was to establish one clear public boundary: only an article whose status is exactly `published` may appear in public news responses. Everything else remains in the protected editorial workflow.”

| Risk before the change | Management consequence | Control now in place |
|---|---|---|
| Approved and published states were not sufficiently separated | Internal review could be mistaken for public release | Public API and ticker use `published` only |
| Old public records remained visible during workflow changes | Visitors could see outdated or unwanted material | Reversible archive reset removes them from public view |
| Contributor submission and publication boundaries could be misunderstood | A contributor might expect submission to equal publication | Contributor submissions remain pending until administrator action |
| Hard deletion would remove history and reduce recoverability | Management could lose context for previous decisions | Archive preserves article records and approval history |
| Direct database changes could bypass controls | Audit trail and accountability would be weakened | Protected administrator routes remain the operating path |

---

## 3. Why archiving was chosen instead of permanent deletion

**Say:**

“Management approved the reversible path because it achieved the immediate public-communications objective without destroying the underlying record.

All currently `published` and `approved` articles were archived. The records were not hard-deleted. Their existing approval history was retained, and each article received archive metadata and an archive event. This means the public surface was cleared while the organisation preserved the ability to review, recover, or make a properly documented retention decision later.

This distinction is important for governance. An archive action is a controlled change in visibility and lifecycle state. A hard delete is a destructive records action that may affect evidence, reporting, legal holds, privacy requests, or historical accountability. The reset therefore used the less destructive option.”

### Verified reset result

| Live verification result | Count | Interpretation |
|---|---:|---|
| Records now archived | 10 | Existing public/approved inventory removed from public visibility and retained |
| Records pending administrator approval | 9 | Pending editorial work was preserved for controlled handling |
| Records newly posted by the reset | 0 | The reset did not create or publish content |
| Records hard-deleted | 0 | No destructive purge was performed |

**Say:**

“The archived records are not automatically public, and they are not automatically restored. Recovery requires an authorized administrator to reassess accuracy, image validity, privacy, safeguarding, and editorial suitability before returning the item to the normal review path.”

---

## 4. The new governance model

**Say:**

“The updated model assigns clear accountability to each stage of the newsroom process.

Approved contributors provide information and supporting media. Editorial reviewers assess the submission. Administrators make the final decision about public release. The public website displays only the final published state.

This creates a separation between the person who contributes information and the person who makes the official public-release decision. It also creates an identifiable point of accountability when a story is published, rejected, revised, or archived.”

| Workflow stage | Responsible party | Status or result | Publicly visible? |
|---|---|---|---:|
| Draft preparation | Contributor or administrator | `draft` | No |
| Submission | Approved contributor | `pending_editorial_review` or `pending_admin_approval` | No |
| Editorial review | Administrator/editor | Review decision recorded | No |
| Revision request | Administrator/editor and contributor | `revision_requested` | No |
| Approval without final release | Administrator/editor | `approved` | No |
| Final public release | Authorized administrator | `published` | Yes |
| Retention outside active handling | Administrator/system | `archived` | No |

**Say:**

“The important management control is that `approved` is no longer treated as a public state. It is an internal decision point. `published` is the public-release state.”

---

## 5. Permission changes and separation of duties

**Say:**

“The permission workflow is deliberately role-based. Administrators can review, edit, request revisions, reject, archive, and publish. Approved publisher pathways can submit and resubmit content through the protected portal, but they cannot publish directly.

This is not only a navigation decision. The server checks authorization before it accepts the mutation. A hidden button is not the security boundary. The protected route and server-side role check are the security boundary.

This separation reduces the risk that an article becomes public because of a contributor action, a client-side manipulation, a stale screen, or an incorrectly assumed approval state.”

| Capability | Administrator | Approved publisher pathway | General staff or public visitor |
|---|---:|---:|---:|
| Submit a dispatch | Yes | Yes, through protected portal | No |
| Edit a pending item | Yes | Only through an approved revision path | No |
| Request revisions | Yes | No | No |
| Reject or archive | Yes | No | No |
| Approve and publish | Yes | No | No |
| View private editorial queue | Yes | Own permitted submission state only | No |

**Management principle:** The role that supplies information does not receive the role that authorizes final public release merely because the information is useful or urgent.

---

## 6. Why the public feed is now published-only

**Say:**

“The public API now applies a single explicit filter: `status = 'published'`. This rule is used for the public news listing, article detail view, and homepage Live News ticker.

The effect is that approved-but-unpublished items remain private. Drafts, revision requests, rejected records, and archived records remain private. The homepage ticker does not fall back to older or placeholder content when there is no current published item; it remains quiet.

From a management perspective, this creates a clean public claim: if visitors can see it in the public news feed, an authorized administrator has released it.”

### Public-state examples

| Article state | Editorial meaning | Public result |
|---|---|---|
| `draft` | Work is incomplete or being prepared | Not shown |
| `pending_editorial_review` | Awaiting review | Not shown |
| `revision_requested` | Contributor must respond to feedback | Not shown |
| `approved` | Internal approval recorded, but not final release | Not shown |
| `published` | Explicitly released by an administrator | Shown |
| `rejected` | Not accepted for publication | Not shown |
| `archived` | Retained outside active public handling | Not shown |

---

## 7. Operational impact on teams

**Say:**

“The operational impact is intentionally simple.

Contributors should continue to submit field updates through the approved portal. They should not expect immediate public visibility. They should use respectful, factual language, avoid unnecessary personal information, and route safeguarding or confidential concerns through the confidential process rather than the news form.

Administrators should use the Editorial Queue for every publication decision. They should review the article body, summary, category, contributor attribution, media link, and primary image. They should record revision, rejection, archive, or publication decisions through the workspace rather than changing database values directly.

Programme and communications leads should treat the empty public feed as a valid operational state. If there is no published item, the correct response is to prepare and review an appropriate story—not to restore an old record or create placeholder content.”

| Team | New operating expectation |
|---|---|
| Contributors | Submit through the protected portal and respond to revision requests there |
| Administrators | Make and record publication decisions in the protected editorial workspace |
| Safeguarding leads | Keep protection concerns in the confidential route, separate from ordinary editorial intake |
| Programme leads | Provide factual context and help verify stories without bypassing editorial authorization |
| Communications leads | Use only published records for public reporting and external distribution |
| Technical operators | Apply schema migrations and protected routes; do not perform informal status edits |

---

## 8. Image and content-quality control

**Say:**

“The workflow also improves public presentation quality. Direct administrator publication requires a primary news image. That image is used consistently on the public headline card and article page.

This control reduces visual inconsistency and prevents an article from appearing publicly with an unrelated fallback image. It also gives the editorial reviewer an explicit quality checkpoint before public release.

The content review should still confirm that the headline is accurate, the summary reflects the article, the body is suitable for public reading, the category is correct, the attribution is appropriate, and any media reference is valid and safe to share.”

### Publication readiness questions

1. Is the story factually supportable and within HMSI’s communications scope?
2. Does the headline accurately describe the article without exaggeration?
3. Does the summary match the body and avoid unsupported claims?
4. Does the article avoid unnecessary personal, confidential, or safeguarding information?
5. Is the contributor attribution correct and appropriate?
6. Is the primary image present, relevant, and approved for use?
7. Are external media links valid and appropriate for public access?
8. Has an authorized administrator made the final publication decision?

---

## 9. Auditability and accountability

**Say:**

“The workflow creates a stronger management record because significant decisions are captured as events. Submission, resubmission, revision request, approval, rejection, publication, and archive actions can be associated with an actor, timestamp, article, and reason where relevant.

This supports operational review without exposing unnecessary personal information in public interfaces. It also provides a basis for answering practical questions: who published this article, when was it published, why was it rejected, when was it archived, and what happened to a contributor’s requested revision?

The audit trail is only useful if the team uses the protected workflow consistently. Direct status changes, undocumented corrections, and informal database edits weaken the record and should not be used as routine operating practice.”

### Management reporting indicators

| Indicator | What it tells management |
|---|---|
| Pending review count | Whether the editorial queue is becoming a bottleneck |
| Median review age | How quickly submissions are receiving a decision |
| Revision-request rate | Whether contributors need clearer guidance or templates |
| Publication count | How much reviewed content is being released |
| Archive count and reasons | Whether content is aging, being superseded, or failing quality checks |
| Missing-image rejection count | Whether contributors understand publication requirements |
| Unauthorized-action attempts | Whether permission boundaries are being tested or misunderstood |

Metrics should be used as operational signals, not as a reason to pressure reviewers into lowering editorial or safeguarding standards.

---

## 10. Validation evidence

**Say:**

“The release was validated through focused tests, the full repository test suite, a production build, and live database verification.

The focused news regression suite passed five out of five tests. The complete HMSI Node test suite passed ninety-nine out of ninety-nine tests. The production build passed after an unused Vitest-only reference file was removed because the repository uses the Node test runner for this suite.

The live data check confirmed ten archived records and nine pending administrator-approval records. The archive operation itself created no new public content and performed no hard deletion.

The changes were committed and pushed to the HMSI GitHub repository in commit `4731dc2`. The associated CI and dependency-audit workflows were triggered for that commit.”

> **Management caution:** A passing build and test suite demonstrate implementation behavior under the tested conditions. They do not replace editorial judgment, safeguarding review, privacy review, or live operational monitoring.

---

## 11. Residual risks and limitations

**Say:**

“The changes materially reduce accidental-publication risk, but they do not eliminate every newsroom risk.

First, an administrator can still publish unsuitable content if the editorial review is weak. The technical control ensures authorization, not factual truth.

Second, the archive reset is reversible, but recovery still requires human review. An archived article should not be restored automatically.

Third, the system depends on correct role assignment. If a user is incorrectly granted administrator status, the permission model will enforce the wrong authority. Access reviews therefore remain necessary.

Fourth, the current system protects the public API boundary, but connected email, social, analytics, or syndication workflows must be checked separately to ensure they do not distribute non-published content.

Finally, the archive route is protected by administrator authentication, same-origin checking, explicit confirmation, and audit recording. It should still be treated as a high-impact administrative action and reviewed periodically.”

| Residual risk | Owner | Mitigation |
|---|---|---|
| Inaccurate or unsafe article approved by an administrator | Editorial lead | Use publication checklist and periodic quality review |
| Incorrect administrator assignment | Portal/security administrator | Perform role recertification and remove stale access |
| Archived article restored without fresh review | Editorial lead | Require restore-to-private-review workflow |
| External channel distributes non-published content | Communications/technical lead | Audit newsletter, social, RSS, and integration queries |
| Queue grows beyond operational capacity | Programme/editorial lead | Track review age and assign backup reviewers |
| Confidential information enters editorial workflow | Safeguarding/privacy lead | Train contributors and enforce confidential routing |

---

## 12. Management decisions requested

**Say:**

“I recommend that management confirm five operating decisions.

First, confirm that `published` is the only public news status and that `approved` remains an internal editorial state.

Second, confirm that all public-news publication must occur through the protected administrator workspace, with no routine direct database changes.

Third, confirm the named administrator group that is authorized to publish and archive, along with a recurring access review.

Fourth, confirm the recovery owner and review process for archived articles. Recovery should return an article to a private review state rather than directly to public visibility.

Fifth, confirm a service-level expectation for pending editorial review, such as a target review window, while preserving the right to pause publication for safeguarding, privacy, or verification reasons.”

### Recommended decision register

| Decision | Recommended position | Decision owner | Review cadence |
|---|---|---|---|
| Public status | Only `published` is public | Executive/communications lead | Annual or after major workflow change |
| Publication authority | Named administrators only | Executive/portal owner | Quarterly access review |
| Archive recovery | Fresh editorial review before republishing | Editorial lead | Per recovery request |
| Contributor access | Approved pathways submit; administrators publish | Programme/portal owner | Quarterly pathway review |
| Review service level | Establish a target without lowering safety standards | Programme director | Monthly queue review |
| External distribution | Verify all outbound integrations use published-only queries | Technical/communications leads | Before each integration release |

---

## 13. Implementation roadmap

**Say:**

“The next phase should focus on operational maturity rather than adding more publication privileges.

In the first month, management should confirm named administrators, publish the editorial checklist, brief contributors, and monitor pending-review age. The technical team should verify that newsletters, social integrations, search feeds, and analytics do not consume approved-but-unpublished records.

In the second month, the team should review archive recovery procedures, audit the administrator roster, inspect rejection and revision patterns, and calibrate queue service expectations.

In the third month, management should review a small set of aggregate indicators, assess whether contributors understand the workflow, and approve any changes through the same controlled process.”

| Period | Priority action | Evidence of completion |
|---|---|---|
| Month 1 | Brief roles and publish the editorial checklist | Attendance, checklist adoption, queue-age report |
| Month 1 | Verify external distribution boundaries | Integration query review and sign-off |
| Month 2 | Review administrator access and archive recovery | Access recertification and recovery exercise |
| Month 2 | Analyze revision and rejection themes | Aggregate editorial quality report |
| Month 3 | Review governance outcomes | Management review record and approved actions |

---

## Closing statement

**Say:**

“The news reset and permission changes give HMSI a clearer public-communications control model.

The organisation did not close the door to community participation. It separated contribution from official publication. It did not destroy the existing newsroom history. It removed current material from public view through a reversible archive action. It did not hide uncertainty behind placeholder news. It allowed the public feed to remain empty until a properly reviewed article is ready.

The management principle is therefore: **preserve the record, protect the public boundary, and make final publication accountable**.

If management confirms the decision points in this briefing, the team can operate the newsroom with a simple shared understanding: contributors submit, editors review, administrators publish, and the public sees only what HMSI has deliberately released.”

## Discussion questions

1. Does management agree that `published` must remain the only public status?
2. Which named accounts should retain publication and archive authority?
3. What review window is operationally realistic without weakening safeguarding or verification standards?
4. Which external communications channels require a published-only query audit?
5. Who owns archive recovery decisions and quarterly administrator access recertification?

## Source references within the HMSI repository

- `app/api/news/route.ts` — public published-only query boundary.
- `app/api/admin/news/archive-all/route.ts` — protected, confirmed, reversible archive-all route.
- `components/EditorialWorkspace.tsx` — administrator editorial controls and archive action.
- `components/NewsFlash.tsx` — homepage published-news ticker behavior.
- `supabase/news_reversible_archive_patch.sql` — additive archive metadata and status constraint migration.
- `tests/news-primary-image.test.mjs` — focused authorization, image, public-filter, and archive-route regression tests.
