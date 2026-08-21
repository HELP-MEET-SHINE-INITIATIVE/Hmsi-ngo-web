# HMSI Production Security Audit — August 2026

**Scope:** Public deployment at `https://www.hmsi.org.ng`, GitHub repository, production-facing route behavior, HTTP security headers, public API boundaries, secret-handling patterns, indexing controls, and available GitHub CI evidence.

**Latest repository commit:** `826d473` — `security: prevent private routes from indexing`  
**Repository state:** `origin/main` synchronized; working tree clean.

> This is an application and configuration review, not a penetration test, legal opinion, privacy certification, or independent audit of Vercel, Supabase, Paystack, Resend, or GitHub account settings.

## Executive result

The final review found no hardcoded server secrets in the current repository, no reachable `.env.local` history after the history purge, no tracked environment files other than the placeholder `.env.example`, and no secret-shaped Paystack, GitHub, Slack, private-key, Supabase service-role, Paystack-secret, Resend, admin-password, or admin-session-secret values in the current tree. The previously tracked `.env.local` and its browser Paystack key were removed from the working tree and purged from the rewritten `main` history.

The production deployment returned the expected baseline security headers, public policy routes loaded successfully after deployment propagation, sensitive-file paths returned 404, admin APIs rejected unauthenticated requests, and the public data APIs returned only their expected public response classes. The Cookie Policy route that was initially found to be missing was added, included in the sitemap and footer, and verified live with HTTP 200. Page-level noindex metadata was added to private dashboards, collaboration rooms, authentication pages, and the sensitive fundraiser-intake page, then verified after propagation.

## Findings and status

| Area | Status | Evidence and interpretation |
|---|---|---|
| Hardcoded secret scan | Pass | No current-tree matches for common live/test Paystack prefixes, server-secret patterns, GitHub tokens, Slack tokens, or private-key blocks. This is pattern-based and does not replace provider-side secret scanning. |
| Environment-file protection | Pass | `.env.local` is ignored, absent from the working tree, absent from tracked files, and absent from reachable Git history. `.env.example` contains placeholders only. |
| History remediation | Pass with operational caveat | The old `.env.local` was purged from the rewritten branch and `main` was force-pushed. Existing clones, forks, caches, logs, screenshots, or GitHub unreachable objects may still require review. Any value that was ever sensitive must still be revoked or rotated. |
| Server-side secret boundary | Pass by code review | Supabase service-role, Paystack secret, Resend API, admin password, and admin session secret are read through server-only environment variables in the code paths reviewed. They must still be verified in the Vercel environment configuration. |
| Production HTTP headers | Pass for baseline set | Live responses included HSTS with `includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict-origin referrer policy, and a restrictive permissions policy. |
| Content Security Policy | Open improvement | No `Content-Security-Policy` header was observed. It was not added blindly because the final external script, image, payment iframe, embed, and provider inventory must be completed first. Add a tested report-only policy, then enforce it after Paystack and other approved resources are mapped. |
| Sensitive file exposure | Pass | `/.env`, `/.env.local`, and `/.git/config` returned 404 in the production probe. |
| Admin API authorization | Pass for unauthenticated probe | `/api/admin/overview` and `/api/admin/moderation` returned 401; `/api/admin/session` returned a small unauthenticated JSON response. A full authenticated role and mutation review remains outside this public probe. |
| Public API methods | Expected behavior | Public fundraiser, news, story, and opportunity endpoints returned public responses. Donation, volunteer, newsletter-subscribe, and admin fundraiser mutation-style GET probes returned 405 where a write method is required. |
| Public policy routes | Pass | Privacy, Safeguarding, Transparency, Terms, and the repaired Cookie Policy route returned HTTP 200 after propagation. |
| Indexing controls | Pass after propagation | `robots.txt` disallows API, admin, dashboard, authentication, worker-room, volunteer-room, and fundraiser-creation paths. Page-level `noindex,nofollow` was added and verified for private dashboards, rooms, login, signup, and fundraiser intake. |
| Sitemap | Pass | The live sitemap includes Privacy, Cookie Policy, Safeguarding, Transparency, and Terms routes. Private routes are not included. |
| GitHub CI | Pass | CI and dependency-audit runs for commit `826d473` completed successfully. |
| Dependency risk | Pass at tested threshold | `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities. Dependabot and the repository audit workflow remain enabled. |
| Build and lint | Pass | `npm run lint` and `npm run build` completed successfully. The build emits only the non-blocking Next.js recommendation to migrate `middleware.ts` to `proxy.ts`. |

## Deployed security headers observed

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

No `Set-Cookie` header was observed on the anonymous homepage response during the probe. The administrator session cookie implementation uses HTTP-only, `SameSite=Strict`, root path, and production `Secure` behavior in the application code.

## Provider-side controls not verifiable from this session

The repository and public deployment cannot prove the current state of Vercel environment variables, Supabase project settings, Supabase Row Level Security, Paystack account keys, Resend API keys, GitHub repository secrets, organization-level MFA, provider audit logs, backups, or billing/account recovery controls. `vercel` CLI was not available in the audit environment, and no provider dashboard credentials were used.

HMSI should verify the production environment contains fresh values for `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `HMSI_ADMIN_PASSWORD`, and `HMSI_ADMIN_SESSION_SECRET`. Rotate any value that was ever placed in the old environment file, an old clone, a screenshot, a log, a ticket, or an untrusted machine. The old file appeared to contain only a browser-facing Paystack key, but rotation remains appropriate if the key was treated as sensitive or its provenance is uncertain.

## Prioritized remaining actions

| Priority | Action | Completion evidence |
|---|---|---|
| Critical | Verify and rotate all production secrets in Vercel, Supabase, Paystack, Resend, GitHub, and any old local clones where exposure is possible. | Provider rotation records, fresh deployment, and secret-scan results. |
| High | Confirm Supabase RLS, Storage policies, service-role usage, database backups, and restoration access. | Exported policy review, restoration test, and access review. |
| High | Add a tested Content Security Policy, initially in report-only mode, after inventorying Paystack, Supabase, image, font, embed, and other approved origins. | Browser/network test matrix and enforced response header. |
| High | Enable MFA and least-privilege roles for GitHub, Vercel, Supabase, Paystack, Resend, and administrator access. | Account-security checklist and quarterly access review. |
| Medium | Complete authenticated security testing for admin, worker, volunteer, moderation, upload, donation, and messaging workflows. | Test report covering IDOR, role bypass, CSRF, rate limits, abuse, and unauthorized data access. |
| Medium | Add rate limiting, abuse monitoring, and alerting to public submissions, authentication, newsletter, comments, likes, messages, and uploads. | Threshold configuration, alert test, and incident runbook. |
| Medium | Migrate `middleware.ts` to the Next.js `proxy` convention after confirming behavior in staging. | Successful CI/build and route regression test. |
| Medium | Complete the live cookie/storage scan and implement the consent banner before adding optional analytics, marketing, profiling, or third-party embeds. | Cookie inventory, consent tests, privacy-policy update, and withdrawal test. |
| Ongoing | Keep the repository history clean, review Dependabot updates, scan pull requests for secrets, and re-run production checks after provider or deployment changes. | Quarterly audit record and change-management log. |

## Audit limitations

This review did not attempt credential guessing, exploitation, destructive testing, payment transactions, authenticated administrator actions, Supabase policy changes, or third-party provider-dashboard inspection. It did not certify that every provider-side secret is fresh or that every historical GitHub object has been garbage-collected. It confirms the controls observable from the repository, public HTTP behavior, GitHub checks, and non-invasive production probes.
