# HMSI Security Policy

Help Meet Shine Initiative (HMSI) takes the security and privacy of donors, people requesting support, volunteers, workers, staff, and community partners seriously. This policy applies to the HMSI web platform and its repository.

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a suspected security vulnerability. Public reports can expose people, credentials, payment information, or exploitable implementation details before a fix is available.

Send a private report to **security@helpmeetshine.org**. If that mailbox is unavailable, contact the repository maintainers privately and mark the message **confidential security report**.

A useful report should include:

- A concise description of the issue and the affected route, component, workflow, or dependency.
- Reproduction steps or a minimal proof of concept that does not access or disclose real user data.
- The potential impact, including whether confidentiality, integrity, availability, payment processing, or account access is affected.
- Any relevant logs, screenshots, commit references, or suggested mitigation.

Please do not include real donor records, support-request details, authentication cookies, service keys, payment secrets, or personally identifiable information in a report.

## Response and disclosure

The maintainers will acknowledge a private report as soon as reasonably possible, investigate the report, and coordinate a fix or mitigation. Please allow time for validation, release, and deployment before making a vulnerability public. The final disclosure timeline depends on severity, exploitability, affected data, and whether a production mitigation is available.

## Protected secrets

The following values are server-side secrets and must never be committed to GitHub, rendered into browser JavaScript, or pasted into public issues or pull requests:

| Secret | Protection requirement |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Use only in server route handlers and privileged server helpers. |
| `PAYSTACK_SECRET_KEY` | Use only to verify transactions on the server. |
| `RESEND_API_KEY` | Use only from server-side email and newsletter routes. |
| `HMSI_ADMIN_PASSWORD` | Store only in the deployment environment; never hard-code it. |
| `HMSI_ADMIN_SESSION_SECRET` | Use only for signing and verifying the admin session. |
| `.env.local` and deployment secrets | Keep out of commits, screenshots, logs, and support messages. |

The public Supabase URL, anon key, Paystack public key, and site URL may be exposed where required by the browser, but database policies and server authorization must not rely on secrecy of public values.

## Authentication and authorization

The `/hmsi-control` path is private, but hidden routing is not considered a security boundary. Administrator actions require a valid signed HTTP-only session. Approval, deletion, suspension, moderation, assignment, newsletter delivery, and campaign-management routes validate the administrator session on the server.

Volunteer and worker roles are checked server-side for dashboard, room, post, comment, like, message, and publishing APIs. A browser-supplied email or role is not sufficient authorization. Volunteers cannot access the worker room. Workers may access the volunteer room subject to the active-account and moderation rules.

Account suspension and restoration must be treated as security-sensitive actions. Moderation records and approval events should remain auditable in Supabase, and any change to those workflows should include tests or clear manual verification.

## Payments and donor privacy

Paystack checkout callbacks are not trusted as proof of payment. The server verifies a transaction using `PAYSTACK_SECRET_KEY` before writing it to the donation ledger or updating fundraiser totals.

Anonymous donation selection controls public presentation of the donor’s name. It does not remove the transaction from the private administrative ledger and does not bypass payment verification, fraud controls, or legally required records. Do not expose donor email addresses or payment references in public pages, URLs, social metadata, logs, or screenshots.

## Supabase and database security

Supabase is the production source of truth for structured records and storage metadata. Keep migrations versioned under `supabase/`, apply row-level security policies, and use the service-role client only on the server. Review any change to RLS, storage policies, approval queries, or privileged mutations carefully.

Run the required migrations before enabling a feature in production. A missing migration should produce a clear setup warning rather than silently weakening authorization or data integrity.

## File uploads

Public fundraiser submissions and authenticated publisher forms validate accepted image types and file size before upload. Uploaded images are processed server-side with Sharp: camera orientation is corrected, images are bounded to a maximum dimension, converted to WebP, compressed, and stored in Supabase Storage. The database stores URLs and storage paths, not raw image bytes.

Do not trust a filename, extension, client-provided MIME type, or client-generated URL as a complete security check. Keep the server-side validation and optimizer in place, and never execute an uploaded file.

## Dependencies and CI

GitHub Actions installs from `package-lock.json` with `npm ci --legacy-peer-deps`, runs ESLint, runs the production build, and audits production dependencies. Dependabot submits reviewable pull requests for npm and GitHub Actions updates. Do not use `npm audit fix --force` as an unattended production workflow; review dependency changes and confirm the build before merging.

When changing Next.js, React, Sharp, Supabase, Paystack, Resend, or authentication dependencies, review release notes and run the complete local verification sequence:

```bash
npm ci --legacy-peer-deps
npm run lint
npm audit --omit=dev --audit-level=high
npm run build
```

## Scope exclusions

This policy covers the HMSI repository, deployed web platform, API route handlers, dashboards, public forms, Supabase integration, payment verification, storage uploads, and GitHub automation. Third-party services such as Supabase, Paystack, Resend, GitHub, and Vercel have their own security-reporting channels and policies; report provider-specific infrastructure issues to the relevant provider as well as HMSI when HMSI data or users may be affected.

## Acknowledgement

HMSI may acknowledge responsible reporters in a future security release note when the reporter agrees and the acknowledgement does not create additional risk. No public acknowledgement will include private report details, personal data, or exploit information that could endanger users.
