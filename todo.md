
- [x] Replace the HMSI Assistant Manus transport with a server-side Gemini API transport using `GEMINI_API_KEY`.
- [x] Add Gemini transport regression coverage, validate the production build, and verify a harmless live Assistant reply.
- [x] Migrate the legacy worker Assistant route and frontend result handling to Gemini using `GEMINI_API_KEY`.
- [x] Migrate the legacy newsroom research route and frontend result handling to Gemini while preserving approval safeguards.
- [x] Add worker/newsroom regression coverage, validate the build, and verify harmless live requests.
- [x] Review newsroom Gemini schema normalization for future structured-output compatibility and strengthen coverage where needed.
- [x] Implement built-in Supabase Auth mapping for approved workers, volunteers, and members.
- [x] Add secure worker identity-card activation, sign-in, sign-out, and role-limited portal access.
- [x] Add volunteer/member password recovery and portal profile-photo upload flows.
- [x] Add assignment identity-card notification email delivery and correct remaining stale Assistant error text.
- [x] Add authorization tests, validate the production build, configure required secrets, and verify live flows.
- [ ] Audit Resend configuration and delivery logs for assignment notification emails without exposing secrets or PII.
- [ ] Implement reusable secure Resend templates and notification routing for HMSI events.
- [ ] Add safe delivery logging, regression tests, and Resend configuration documentation.
- [x] Implement idempotent worker ID-card generation and secure email dispatch when an authorized admin creates an assignment.
- [x] Add route regression tests, build validation, and deployment verification for assignment-triggered notifications.
- [x] Review and harden volunteer/member password reset request and callback flows, add security tests, and validate deployment.
- [ ] Review latest Resend notification delivery and API logs against the secured password-reset implementation without exposing PII or secrets.
- [x] Correct ID-card email rendering so every notice contains a non-empty worker ID number.
- [x] Send the confirmed ID-card access notices to the new worker and all verified active workers, then verify Resend delivery metadata.
- [x] Run the complete regression suite and verify automated coverage of the admin-only bulk worker access-notice endpoint.
- [x] Add mocked runtime integration tests for authorization, confirmation, eligible-worker selection, card reissue, delivery, and failure handling in the bulk access-notice endpoint.
- [x] Document the secure bulk worker access-notice API contract, response semantics, safeguards, and administrative integration pattern.
- [x] Create a presentation deck on bulk worker access-notice API design, safeguards, integration, and runtime validation.
- [x] Review and harden bulk access-notice authentication and authorization controls, and clarify worker, volunteer, and member portal sign-in identification.
- [x] Repair the shared portal password-recovery entry and add role-specific sign-in guidance without exposing role eligibility.
- [x] Audit recent password-recovery delivery without exposing recipient data, and configure official-email-only sender and president correspondence controls after exact addresses are approved.
- [x] Enforce `HMSI Portal <no-reply@hmsi.org.ng>` as the sole portal-mail sender (superseded by the subsequently approved multi-sender policy).
- [x] Complete Supabase Auth SMTP configuration after the official Resend SMTP credential and president reply-to address are supplied.
- [x] Implement verified HMSI sender identities and server-side event routing for onboarding, auth, administration, and presidential internal alerts.
- [x] Add professional password-reset, worker-welcome, and president-facing admin-alert templates with regression coverage and no unapproved live dispatch.
- [ ] Align the live Supabase reset-email HTML body with the already implemented HMSI password-reset template through the dashboard code editor.
- [x] Configure and verify required Vercel production notification environment variables, including the approved `HMSI_MAJOR_DONATION_THRESHOLD_NGN=1000000` value.
- [x] Verify `RESEND_API_KEYY` and `RESEND_FROM_EMAILL` are unused; retain them in Vercel Production and Preview by explicit user decision while preserving the standard active Resend keys.
- [x] Verify the current Vercel production deployment and recent notification-route runtime health without modifying HMSI configuration.
- [x] Add a primary image field to the admin news publishing workflow and render it consistently on public news headline cards and articles.
- [x] Document a fail-safe image-path tracking, replacement cleanup, and scheduled orphan-reconciliation design before any destructive storage change is authorized.
- [x] Add protected `/admin/editorial` and `/admin/articles` routes with an editorial queue, content-management views, inspection controls, and optimistic review actions.
- [x] Add admin-only article-management API handlers and editorial audit fields for review, draft, publish, reject, archive, and deletion states.
- [x] Add a safe ten-day article archival policy, scheduled reconciliation route, tests, production validation, and deployment verification.
- [x] Build the selected personal Google Drive submission, administrator intake-routing, ingestion-status, notification, and privacy-cleanup workflow for HMSI portal users.
- [x] Require named-HMSI-administrator viewer sharing for personal Drive submissions and expose submitted links only in the protected administrator intake-routing view.
- [x] Restore the production Paystack donation checkout by verifying and correcting the `NEXT_PUBLIC_PAYSTACK_KEY` configuration without exposing payment credentials.
- [x] Review production server logs for hidden errors during Paystack donation initialization without exposing credentials or donor data.
- [ ] Verify an isolated Paystack test-mode staging environment and run an end-to-end popup test only if it cannot create a production charge or donor record.
- [x] Perform production-safe Paystack donation-flow verification without submitting a payment, donor data, or donation record.
- [x] Prepare an approved verified-donation thank-you acknowledgement, confirm the latest successful donation safely, and assess displaying successful donations in the protected admin dashboard.
- [x] Implement a protected, paginated admin dashboard view for successful donations with privacy-conscious record handling and automatic verified-donation acknowledgements.
- [x] Verify the production mailer configuration and email-service connection using non-delivery checks without exposing credentials or recipient data.
- [x] Verify protected thank-you acknowledgement-log availability and updates for recent successful donations without exposing donor information.
- [x] Add and apply a fail-safe donation acknowledgement audit schema, then verify it without altering existing donation records.
- [x] Connect verified donation acknowledgement dispatch and Resend webhook events to the audit schema and protected admin ledger with idempotent processing.
- [x] Extend the donation model and admin ledger for verified multi-channel tracking, receipt details, campaign attribution, acknowledgement status, and bounded real-time refresh without exposing payment credentials or card data.
- [x] Add a verified provider-webhook trust boundary and an admin-only manual-donation intake path that requires explicit verification before fundraiser totals or donor acknowledgements are triggered.
- [x] Add a volunteer publisher-role taxonomy and a role-limited `/portal/submit-news` workflow that submits content only to the existing editorial review queue and never publishes directly.
- [x] Extend `/portal/submit-news` with rich-text content, controlled category selection, direct image upload or validated Google Drive media links, submitter attribution, and the approved editorial-review confirmation message.
- [x] Extend administrator editorial review with request-revisions feedback, contributor-visible revision state, and protected re-submission while retaining administrator-only publishing.
- [x] Align the protected editorial queue and article model with the publisher dispatch terminology while preserving compatibility with existing pending-review records and public news rendering.
- [x] Add a protected administrator control to assign or remove publisher pathways for approved active volunteers after onboarding.
- [ ] Run a complete end-to-end volunteer news submission, revision, approval, and publication integration test against an isolated staging deployment with disposable test identities and cleanup verification.
- [x] Run isolated mock-mode end-to-end verification of volunteer submission, editorial queue, revision/status transitions, administrator approval, and publication boundaries without live database or external side effects.

## Featured Story Dynamic Routing

- [x] Confirm the homepage featured-story card constructs its destination from the selected record ID rather than a static legacy link.
- [x] Confirm the story detail renderer and public API load the selected published record’s unique metadata, image, excerpt, and body.
- [x] Run focused regression coverage, production build validation, confirm the live record route, and publish the routing verification update.

## Related Field Stories

- [x] Load up to three other published field stories while excluding the current story record.
- [x] Render an accessible related-stories section at the bottom of the selected story detail page with dynamic record links.
- [x] Add regression coverage, validate the production build and live detail route, then publish the enhancement.

## Public Launch Readiness Package

- [x] Add an administrator-reviewed featured campaign seed with a ₦500,000 target and no fabricated donation total, supporter count, or progress.
- [x] Add two clearly labeled, administrator-reviewed HMSI Field Operations dispatch seeds without misrepresenting field verification or live activity.
- [x] Add an administrator-only `/admin/templates` library for approved volunteer and publisher outreach templates with safe HMSI deep links.
- [x] Add a public micro-donation fast-track widget that routes to the approved donation entry path without transmitting unsupported selected amounts or payment details.
- [x] Add a public volunteer and independent-publisher conversion banner to the news feed with clear role-limited pathways.
- [x] Add a live supporters/progress component that displays only verified donation acknowledgements, with an explicit empty state when no verified public record is available.
- [x] Add a bounded administrator-only launch system check for database, notification configuration, and payment-webhook readiness without exposing secrets or implying provider verification.
- [x] Add regression coverage, production-build validation, live-route verification, and a deployment for the launch package.

## Dynamic Story Feed and Outreach Gallery

- [x] Replace homepage field-story placeholder cards with a bounded dynamic query for published or approved story records and exact record links.
- [x] Add public `/updates` compatibility routing to the existing record-specific story renderer without duplicating article data.
- [x] Prioritize related stories sharing the current category, display publication dates, and record privacy-safe aggregate click-through analytics.
- [x] Add the outreach-gallery schema and an administrator-only gallery API that supports ordered image metadata, append, caption update, and deletion state.
- [x] Add protected `/admin/gallery` and `/admin/stories/[id]` controls for image upload, editing, prioritization, and confirmed deletion.
- [x] Ensure gallery deletion removes only storage objects owned by the selected gallery record and preserves auditable metadata or a soft-delete marker.
- [x] Add regression coverage, production-build validation, live verification, and a deployment for the story-feed and gallery release.

## Dynamic Live News Ticker

- [x] Replace the homepage Live News ticker’s static placeholder with the newest approved or published `news_articles` record ordered by publication timestamp.
- [x] Bind the ticker category, headline, excerpt, and Read News call to the active record’s exact `/news/[id]` route.
- [x] Add regression coverage, production-build validation, live verification, and a deployment for the Live News ticker fix.

## Non-Transactional Live Journey Verification

- [x] Verify the production Live News ticker and its exact article-detail view without modifying content.
- [x] Verify the production donation journey through the secure checkout handoff without entering payment data, submitting a donation, or creating a donor record.
- [x] Inspect bounded production runtime signals and record the completed non-transactional verification outcome.
