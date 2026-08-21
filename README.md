# Help Meet Shine Initiative (HMSI) Web Platform

[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js_16-black?logo=next.js)](https://nextjs.org/)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Hosting: Vercel](https://img.shields.io/badge/Hosting-Vercel-black?logo=vercel)](https://vercel.com/)
[![License: HMSI NGO Non-Commercial](https://img.shields.io/badge/License-HMSI%20NGO%20Non--Commercial-b56b3b.svg)](LICENSE)

The official web platform for **Help Meet Shine Initiative (HMSI)**, a Nigeria-rooted humanitarian NGO working with communities in Nigeria and across Africa. The platform helps people request support, discover verified fundraising causes, donate securely, volunteer, apply for worker opportunities, read field stories, and follow HMSI programmes. The repository is distributed under the custom **HMSI NGO Non-Commercial License** in [`LICENSE`](LICENSE).

> **Canonical website:** [https://www.hmsi.org.ng](https://www.hmsi.org.ng)
>
> **Repository:** [HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web](https://github.com/HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web)

## Contents

- [Platform overview](#platform-overview)
- [Public experience](#public-experience)
- [Authenticated workspaces](#authenticated-workspaces)
- [Administration](#administration)
- [Technology](#technology)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Supabase setup and migrations](#supabase-setup-and-migrations)
- [Payments and donations](#payments-and-donations)
- [Images and media](#images-and-media)
- [Homepage publishing and rotation](#homepage-publishing-and-rotation)
- [GitHub and deployment](#github-and-deployment)
- [Routes and API surface](#routes-and-api-surface)
- [Security and privacy](#security-and-privacy)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [References](#references)

## Platform overview

HMSI is a Next.js App Router application with TypeScript and Tailwind CSS. It is deployed on Vercel and uses Supabase PostgreSQL for structured data and Supabase Storage for uploaded images. Next.js provides the application framework and routing model used by the public pages, dashboards, server-rendered metadata, and API route handlers [1].

| Area | Capability |
|---|---|
| Public support | Get Help requests, fundraiser requests, verified causes, donations, contact, and WhatsApp contact access |
| Fundraising | Fundraiser creation and approval, organisation-wide campaigns, programme campaigns, Community Support category, live donor counts, anonymous donations, Paystack checkout, payment links, and social promotion |
| Stories and news | Featured field stories, live approved-story archive, newsroom articles, approval workflows, full detail pages, social previews, and homepage flashes |
| Participation | Volunteer applications, worker applications, opportunity listings, application review, worker assignments, volunteer rooms, and worker rooms |
| Administration | Hidden admin control center, approval queues, fundraiser management, moderation, donations ledger, messages, newsletters, opportunities, campaigns, and promotion links |
| Operations | Supabase migrations, server-only secrets, image conversion to WebP, GitHub CI, Dependabot updates, npm audit, and Vercel deployment |

## Verified organizational profile

The organization profile supplied for publication identifies HMSI as **The Incorporated Trustees of HELP-MEET SHINE INITIATIVE**, registered with the Corporate Affairs Commission of the Federal Republic of Nigeria under **CAC/IT/NO 125103** and incorporated on **21 February 2019**. The supplied tax identification number is **21249981**, under the Federal Inland Revenue Service. HMSI’s headquarters are in **Benin City, Edo State, Nigeria**.

The appointed Board of Trustees is **Mary Ogbeide** and **Godspower Folorunsho Adebusoye**. **Godspower Folorunsho Adebusoye** is identified as President. The supplied recognition is the **MEA Award for Most Productive NGO (2022)**. These details are published from HMSI-provided information and should be kept synchronized with official organizational records.

HMSI’s stated capability covers food security and zero hunger, poverty alleviation and empowerment, crisis and emergency response, agriculture, WASH, gender equality, youth empowerment, technology, climate resilience, and peace and conflict resolution. The supplied operating measures are **7 meals per $1 donated** and a field workforce of **100+ domestic and expatriate team members**. Detailed audits and project impact metrics are available to institutional donors upon request.

## Public experience

The homepage presents HMSI’s mission and the clearest next steps for visitors: donating to NGO work, supporting a verified cause, requesting help, volunteering, partnering, or reading the impact record. Its support CTAs are designed for mobile-first discovery and use direct links rather than inactive visual placeholders.

The homepage includes an approved fundraiser flash, an approved featured-story flash, opportunity and news flashes where available, impact statistics, an optimized Get Help CTA, and a field-desk section. Approved fundraisers are displayed one at a time with emergency campaigns first; each campaign remains visible for two minutes before the next active campaign is shown. Featured stories also rotate one at a time and refresh from the live stories API so a newly approved story can enter the homepage without waiting for a redeploy.

| Route | Purpose |
|---|---|
| `/` | Main HMSI homepage, CTAs, impact information, rotating content, and field desk |
| `/get-help` | Support-request information and help-request CTA |
| `/fundraise` | Public fundraiser directory with search and category filters |
| `/fundraise/[id]` | Individual fundraiser detail page, donation form, live donor count, and promotion controls |
| `/fundraise/create` | Public help/fundraiser request submission form |
| `/donate` | General HMSI donation form using Paystack |
| `/impact` | Standalone impact and top-fundraiser presentation |
| `/stories` | Live archive of all approved field stories, newest first |
| `/stories/[id]` | Full featured-story reader with sharing and return navigation |
| `/news` | Published newsroom articles |
| `/news/[id]` | Full newsroom article reader |
| `/opportunities` | Public volunteer, worker, and shared-role opportunities |
| `/volunteer` | Volunteer application path |
| `/worker-apply` | Worker application-for-approval path |
| `/contact` | Contact form, support contacts, and direct WhatsApp access |
| `/partnerships` | Institutional partnership profile, capability statement, focus areas, and donor CTA |
| `/transparency` | Legal identity, leadership, accountability, safeguarding, privacy, and complaints information |
| `/terms` | Website terms, governing law, intellectual property, content liability, and authorized linking |
| `/about`, `/projects` | HMSI organisation and programme information |

Every public fundraiser and featured story has a full detail page. Campaign and story detail pages include direct sharing actions for Facebook and LinkedIn, an Instagram promotion action that copies the tracked URL before opening HMSI’s official Instagram profile, and a copy-link action for WhatsApp, email, SMS, and other channels. Their Open Graph and Twitter metadata is configured for large, campaign-style previews.

## Authenticated workspaces

Volunteer and worker identities use the project’s browser session flow for the public-facing authenticated experience. The server still validates the viewer role for protected APIs. Administrators use a separate signed HTTP-only cookie session and do not rely on the hidden URL alone for security.

### Volunteer workspace

Approved volunteers can use `/dashboard` and `/volunteer-room`. The volunteer dashboard exposes opportunities, messages and notifications, newsletter submissions, field-story submissions, newsroom submissions, assignments, profile information, and links to the shared collaboration room. Volunteer stories, news, and newsletter content enter the appropriate review workflow before publication or delivery.

### Worker workspace

Approved workers can use `/worker-dashboard` and `/worker-room`. Workers can also access the volunteer room and approved volunteer-facing content, but volunteers cannot access the worker room. Worker submissions and assignments are separated from volunteer activity, and worker-room posts support worker-only comments and likes.

### Community rooms and moderation

The volunteer room is a shared collaboration space for approved volunteers and workers. The worker room is restricted to active workers and administrators. Server-side role checks protect room reads, posts, comments, likes, and moderation actions. Workers can flag problematic volunteer-room comments; administrators can review flags, delete bad comments, and suspend or restore accounts.

## Administration

The private administration workspace is available at `/hmsi-control`. It is intentionally omitted from public navigation and search indexing, but security does not depend on obscurity. The server requires the configured administrator credentials and signs an eight-hour HTTP-only session cookie with secure same-site settings.

The control center provides:

- Overview metrics, migration warnings, direct campaign donation links, and recruitment promotion links.
- Fundraiser approval and direct campaign creation for organisation-wide, programme-specific, and Community Support campaigns.
- Editing, completion, archiving, restoration, and permanent deletion of fundraiser records.
- Public donation URLs with tracking parameters that can be copied for rapid promotion.
- Volunteer application approval, worker application approval, worker record creation, and account status management.
- Volunteer-room and worker-room access, including administrator preview mode and return links.
- Comment deletion, worker flags, review of moderation records, account suspension, and restoration.
- Donations ledger access, including anonymous-donation status.
- Contact messages, worker/admin replies, read states, and notifications.
- Newsletter drafting, review, approval, delivery, and migration diagnostics.
- Featured-story creation, approval, rejection with a revision reason, editing, publication, and deletion.
- Newsroom article creation, approval, rejection, editing, publication, and deletion.
- Opportunity publishing, application review, worker assignments, and job/support task management.
- Copy-ready volunteer recruitment, worker/job application, Get Help, and campaign donation links.

Administrator actions are protected in server route handlers. Do not expose the Supabase service-role key, Paystack secret, Resend API key, or admin session secret to browser code.

## Technology

| Layer | Implementation |
|---|---|
| Application | Next.js 16.3.1 App Router [1] |
| Language | TypeScript |
| UI | React 19 and Tailwind CSS |
| Icons and interaction | lucide-react and client-side React state |
| Database | Supabase PostgreSQL with row-level security [2] |
| File storage | Supabase Storage |
| Payments | Paystack Inline checkout with server-side verification [3] |
| Email | Resend API for newsletter and reply delivery |
| Hosting | Vercel [4] |
| Image processing | Sharp server-side conversion and resizing [6] |
| Automation | GitHub Actions, Dependabot, npm CI, npm audit |

## Local development

### Prerequisites

Install Node.js 20.x, npm, Git, and access to a Supabase project. The repository declares Node 20.x as its supported runtime. A different local Node version may emit an engine warning even when the application builds.

### Clone and install

```bash
git clone https://github.com/HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web.git
cd Hmsi-ngo-web
npm ci --legacy-peer-deps
```

Use `npm ci` rather than `npm install` for reproducible installation from the committed lockfile. The `--legacy-peer-deps` flag is retained because it matches the repository’s dependency installation workflow.

### Configure local environment

```bash
cp .env.example .env.local
```

Fill in the values described in [Environment variables](#environment-variables). Never commit `.env.local` or real credentials.

### Run the application

```bash
npm run dev
```

Open `http://localhost:3000`. The main verification commands are:

```bash
npm run lint
npm audit --omit=dev --audit-level=high
npm run build
```

`npm run lint` uses the repository’s ESLint 9 flat configuration. `npm run build` performs the production Next.js build and route validation.

## Environment variables

Copy the variable names from [`.env.example`](.env.example). Values below are descriptions, not credentials.

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server | Public Supabase client key; protected by database policies |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Privileged Supabase operations in route handlers; never expose it to the browser |
| `SUPABASE_STORAGE_BUCKET` | Server | Storage bucket for fundraiser and publisher images; defaults to `fundraiser-images` |
| `NEXT_PUBLIC_PAYSTACK_KEY` | Browser | Paystack public checkout key |
| `PAYSTACK_SECRET_KEY` | Server only | Paystack transaction verification |
| `RESEND_API_KEY` | Server only | Newsletter and email delivery |
| `RESEND_FROM_EMAIL` | Server | Verified Resend sender identity |
| `NEXT_PUBLIC_SITE_URL` | Browser/server | Canonical URL and tracked promotion-link base |
| `HMSI_ADMIN_EMAIL` | Server only | Administrator login email |
| `HMSI_ADMIN_PASSWORD` | Server only | Administrator login password |
| `HMSI_ADMIN_SESSION_SECRET` | Server only | Secret used to sign the admin session cookie |

The public contact addresses are **support@hmsi.org.ng** for support and **contact@hmsi.org.ng** for general enquiries and partnerships. The public site describes HMSI as serving Nigeria and communities across Africa.

## Supabase setup and migrations

Open the Supabase project’s SQL Editor and run the migrations in the following order. The patch files are designed for the current schema and should be kept in source control with application changes.

| Order | File | Adds |
|---:|---|---|
| 1 | [`supabase/schema.sql`](supabase/schema.sql) | Base fundraiser, contact, signup, volunteer, worker, assignment, community, and storage setup |
| 2 | [`supabase/messaging_patch.sql`](supabase/messaging_patch.sql) | Contact replies, notification records, read states, and reply workflow |
| 3 | [`supabase/donations_patch.sql`](supabase/donations_patch.sql) | Verified donation ledger, fundraiser totals, donor counts, and anonymous-donation field |
| 4 | [`supabase/newsletter_patch.sql`](supabase/newsletter_patch.sql) | Subscribers, newsletter drafts, approval events, and delivery logs |
| 5 | [`supabase/featured_stories_patch.sql`](supabase/featured_stories_patch.sql) | Featured-story drafts, publication states, and approval history |
| 6 | [`supabase/newsroom_patch.sql`](supabase/newsroom_patch.sql) | News articles, publication states, and approval history |
| 7 | [`supabase/fundraiser_management_patch.sql`](supabase/fundraiser_management_patch.sql) | Completed/archived fundraiser management states |
| 8 | [`supabase/fundraiser_campaigns_patch.sql`](supabase/fundraiser_campaigns_patch.sql) | Organisation-wide and programme campaign metadata |
| 9 | [`supabase/role_opportunities_community_patch.sql`](supabase/role_opportunities_community_patch.sql) | Opportunities, roles, applications, and related community data |
| 10 | [`supabase/moderation_access_patch.sql`](supabase/moderation_access_patch.sql) | Volunteer account status and comment-flag moderation records |

The patches are intended to be idempotent where possible. If the admin dashboard reports that records are unavailable, copy the named migration file into the Supabase SQL Editor, run it, and refresh the dashboard. After a schema change, redeploy the latest application commit so the UI and database are in sync.

### Row-level security and service role

Supabase should remain the source of truth for production records. The browser may use the public anon key only for operations allowed by the configured policies. Privileged queries and mutation routes use `getSupabaseAdmin()` on the server. Never replace server authorization with a client-supplied role, email, or hidden URL.

## Payments and donations

Fundraiser and general donations use Paystack Inline checkout. The browser starts checkout with the public key, while the server verifies the transaction using `PAYSTACK_SECRET_KEY` before writing the donation to Supabase. A donation is not counted as successful merely because the browser callback ran.

The donation experience supports:

- General HMSI donations through `/donate`.
- Fundraiser-specific payments through `/fundraise/[id]`.
- Anonymous display choice while retaining the payment email needed for verification and receipts.
- Unique successful donor counts per fundraiser, based on verified donor email identity.
- Admin ledger visibility, including whether a donor chose anonymous presentation.
- Direct campaign links with `utm_source`, `utm_medium`, and campaign identifiers for social promotion.

Run [`supabase/donations_patch.sql`](supabase/donations_patch.sql) before enabling anonymous donations or live donor counts in production.

## Images and media

HMSI accepts JPG, PNG, and WEBP uploads up to 8 MB through public fundraiser submissions and approved publisher forms. Images are uploaded to Supabase Storage; the database stores the public URL and storage path rather than image bytes.

Before storage, the server-side optimizer:

1. Corrects camera orientation using EXIF rotation.
2. Resizes the image to fit within a 1600px maximum dimension without enlarging smaller files.
3. Converts the result to WebP.
4. Compresses the result at a web-appropriate quality level.
5. Stores the optimized object with `image/webp` content type and long-lived cache headers.

This pipeline is implemented in [`lib/optimizeImage.ts`](lib/optimizeImage.ts) and is used by both [`/api/uploads/publisher-image`](app/api/uploads/publisher-image/route.ts) and the public fundraiser upload route. The client upload component also displays that optimization occurs automatically.

The repository includes a small local image-preparation script for supplied static campaign artwork at [`scripts/prepare_fundraise_hero.py`](scripts/prepare_fundraise_hero.py). This is separate from the runtime upload optimizer.

## Homepage publishing and rotation

Administrators can publish official content directly. Volunteer and worker submissions follow approval rules before becoming public.

| Content | Public source | Homepage behavior |
|---|---|---|
| Fundraisers | Active approved fundraiser records | One item at a time, emergency-first, two-minute rotation, 30-second live refresh |
| Featured stories | Published `featured_story_drafts` records | One item at a time, newest published first, two-minute rotation, 30-second live refresh |
| Opportunities | Published opportunity records | One rotating opportunity flash when records exist |
| News | Published newsroom articles | One rotating news flash when records exist |

The homepage featured-story section links to the live [`/stories`](app/stories/page.tsx) archive. Both **Explore field stories** and the featured card’s **Read full story** prompt are clickable. The archive includes both newly approved and previously approved stories, with every item linking to `/stories/[id]`.

The public trust and partnership pages are [`/transparency`](app/transparency/page.tsx) and [`/partnerships`](app/partnerships/page.tsx). The website terms are published at [`/terms`](app/terms/page.tsx). Legal, registration, compliance, award, financial, and safeguarding statements should be reviewed against current official documents before any change is published.

## GitHub and deployment

The repository uses GitHub Actions for reproducible checks and Dependabot for scheduled dependency updates.

### Continuous integration

[`/.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes and pull requests targeting `main`:

```bash
npm ci --legacy-peer-deps
npm run lint
npm run build
```

The workflow uses Node 20.x, npm caching, read-only repository permissions, a 15-minute timeout, and concurrency cancellation for superseded runs.

### Dependency audit

[`/.github/workflows/dependency-audit.yml`](.github/workflows/dependency-audit.yml) runs on pushes, pull requests, a weekly schedule, and manual dispatch. It installs from the lockfile and runs:

```bash
npm audit --omit=dev --audit-level=high
```

The workflow does not run `npm audit fix --force`, modify the branch automatically, or create unreviewed dependency commits. Dependabot opens grouped, reviewable pull requests for npm and GitHub Actions updates according to [`.github/dependabot.yml`](.github/dependabot.yml) [5].

### Vercel

Connect the repository to Vercel and configure all production environment variables from [Environment variables](#environment-variables). Add the canonical domain `www.hmsi.org.ng`. The middleware redirects `helpmeetshine.org.ng` and `www.helpmeetshine.org.ng` to `https://www.hmsi.org.ng/` while preserving the requested path and query string. The legacy domains must resolve to the same Vercel project before the redirect can operate.

The deployed build should pass the same commands used by GitHub CI. Never deploy a branch with missing Supabase migrations or placeholder payment/admin secrets.

## Routes and API surface

The main public routes are listed in [Public experience](#public-experience). The principal server endpoints are:

| Endpoint | Function |
|---|---|
| `/api/fundraisers` | Public fundraiser reads and help-request submissions |
| `/api/fundraisers/[id]` | Public fundraiser detail reads |
| `/api/donations` | Donation verification and ledger write path |
| `/api/stories` | Public published-story reads and protected story publishing/review actions |
| `/api/news` | Newsroom reads and protected article workflow |
| `/api/opportunities` | Opportunity reads and applications |
| `/api/opportunities/[id]/apply` | Opportunity application submission |
| `/api/uploads/publisher-image` | Authenticated publisher image upload and optimization |
| `/api/contact` | Contact-message submission and retrieval workflow |
| `/api/messages` | Authenticated message, reply, and notification workflow |
| `/api/newsletter` | Newsletter drafting, review, and delivery workflow |
| `/api/community`, `/api/community/comments`, `/api/community/likes` | Protected room posts, comments, and likes |
| `/api/admin/*` | Administrator-only overview, moderation, approvals, assignments, and account actions |

When adding an endpoint, keep authorization on the server, validate all incoming fields, return a useful error state, and avoid trusting browser-provided role claims.

## Security and privacy

See [`SECURITY.md`](SECURITY.md) for the vulnerability-reporting policy and security expectations. In summary:

- Do not commit `.env.local`, credentials, service-role keys, payment secrets, or API keys.
- Keep Supabase service-role and Paystack secret operations in server route handlers.
- Verify Paystack transactions server-side before recording donations.
- Use signed, HTTP-only admin sessions and server-side role checks.
- Treat anonymous donations as private display preference, not as a bypass of payment verification or audit records.
- Apply Supabase RLS and keep migrations versioned with the code.
- Validate file type and size before processing uploads; store image metadata, not raw bytes, in the database.
- Keep moderation actions auditable and restrict suspension, deletion, and approval actions to the correct roles.
- Do not include private donor, volunteer, worker, or support-request details in public URLs, social metadata, logs, or screenshots.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| `Moderation records are unavailable` | Run [`supabase/moderation_access_patch.sql`](supabase/moderation_access_patch.sql), then refresh the admin dashboard. |
| Newsletter tables are unavailable | Run [`supabase/newsletter_patch.sql`](supabase/newsletter_patch.sql) and confirm the server-side Resend variables. |
| Opportunities or community rooms are unavailable | Run [`supabase/role_opportunities_community_patch.sql`](supabase/role_opportunities_community_patch.sql). |
| Anonymous donation insert fails | Run the updated [`supabase/donations_patch.sql`](supabase/donations_patch.sql) containing `is_anonymous`. |
| Campaign purpose fields are unavailable | Run [`supabase/fundraiser_campaigns_patch.sql`](supabase/fundraiser_campaigns_patch.sql). |
| Image upload fails | Confirm the Supabase URL, service-role key, bucket name, bucket policy, accepted type, and 8 MB limit. |
| Admin login fails | Confirm all three admin variables are set in the same deployment environment and redeploy after changing them. |
| Homepage story does not update | Confirm the story status is `published`, the stories migration is installed, and wait for the 30-second live refresh or reload the page. |
| GitHub dependency job fails | Run `npm ci --legacy-peer-deps`, `npm audit --omit=dev --audit-level=high`, and `npm run build` locally. Review Dependabot changes rather than using a force fix. |
| Legacy domain does not redirect | Add both legacy hostnames to the same Vercel project and point their DNS records to Vercel. |

## License

This project is distributed under the **HMSI NGO Non-Commercial License**. Read [`LICENSE`](LICENSE) before copying, modifying, redistributing, or deploying the code. Commercial use requires written permission from Help Meet Shine Initiative.

## References

[1]: https://nextjs.org/docs "Next.js Documentation"
[2]: https://supabase.com/docs "Supabase Documentation"
[3]: https://paystack.com/docs/payments/accept-payments/ "Paystack Accept Payments Documentation"
[4]: https://vercel.com/docs "Vercel Documentation"
[5]: https://docs.github.com/en/code-security/dependabot "GitHub Dependabot Documentation"
[6]: https://sharp.pixelplumbing.com/ "Sharp Image Processing Documentation"
