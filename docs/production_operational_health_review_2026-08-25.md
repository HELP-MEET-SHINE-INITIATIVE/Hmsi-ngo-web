# Production Operational Health Review — 25 August 2026

**Author:** Manus AI
**Scope:** Non-destructive review of the live public site, Vercel production deployment, production runtime-error summaries, database metadata, repository tests, and local production build.

## Overall Position

The HMSI public site is reachable, its latest Vercel production deployment is `READY`, essential public APIs responded successfully, expected production tables are present, all 80 repository tests passed, and the local production build completed. No payment was submitted, no administrator action was invoked, no user record was accessed, and no production configuration or data was changed during this review.

Two corrections require attention before describing the system as fully healthy. The password-recovery route logged recent configuration failures, and the current campaign page contains a generic medical/hospital verification statement that does not match the campaign's stated emergency-outreach purpose. A smaller follow-up is needed for intermittent Supabase `JWT issued at future` errors in recent runtime logs.

## Verified Healthy Signals

| Check | Result |
|---|---|
| Current production deployment | Vercel deployment `dpl_65VSiTTxwjguS6xVUtqEnts82rrN`, sourced from commit `5820259`, is `READY` and targets production. |
| Public homepage | Rendered successfully at `www.hmsi.org.ng`; the live campaign, approved field stories, opportunities, and Live News entry were visible. |
| Public content APIs | `/api/news?limit=1`, `/api/stories?limit=1`, and `/api/opportunities` returned current published/open data successfully during the review. |
| Campaign display | The approved Emergency Field Response & Community Outreach 2026 campaign rendered with ₦0 raised of ₦500,000, consistent with the previously verified no-donation baseline. No checkout was initiated. |
| Database schema availability | Metadata confirmed the expected public tables for news, stories, opportunities, portal access, role rooms, retention, password setup, workers, volunteers, and members. |
| Repository regression suite | `npm test` passed: 80 tests passed, with no failures, skips, or cancellations. |
| Production build | `npm run build` completed and produced the expected route manifest. |

## Corrections Recommended

| Priority | Finding | Evidence and safe correction |
|---|---|---|
| High | Password recovery is not reliably configured in production. | In the last 24 hours, `/api/portal/auth/recover` recorded nine configuration failures stating that Supabase Auth was unavailable on the HMSI server. Verify that Vercel Production has the non-secret variable names expected by `lib/portalAuth.ts`: `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; do not expose values. After configuration is confirmed, perform an authorised delivery-safe recovery test. |
| High | Campaign narrative does not match the approved campaign purpose. | The live Emergency Field Response & Community Outreach 2026 page states that a field team visited a family and confirmed medical requirements with a hospital. The campaign description is instead an emergency-response/community-outreach launch campaign. Remove or replace the medical/hospital narrative and any “verified request” wording unless it is supported by an approved, campaign-specific verification record. |
| Medium | Recent Supabase JWT timing errors were recorded. | Within the last 24 hours, `/api/opportunities`, `/api/admin/overview`, `/impact`, `/api/stories`, and analytics recorded intermittent `JWT issued at future` failures. The public APIs were successful during this review, so this is not confirmed as an active outage. Review Supabase key rotation/validity and runtime clock-related configuration; do not rotate credentials without an approved change plan. |
| Low | Build warnings remain. | The production build warns that the `middleware` file convention is deprecated in favour of `proxy`, and reports a Node `process.cwd` use in an Edge Runtime import trace. The build succeeded, so these are maintenance items rather than release blockers. Plan a controlled framework-compatibility update. |

## Security and Retention Position

The previous production schema review remains valid: password setup links are cascaded from their direct invitation and ID-card parents, while personnel removal is intentionally a 30-day retention-managed process rather than a universal immediate hard-delete cascade. The recovery route currently returns a generic response even when backend configuration is unavailable, which preserves account-enumeration resistance; the issue is operational availability, not a known disclosure from the reviewed route.

## Review Boundaries

This review did not submit a donation, invoke Paystack, create a user, submit a password-reset request, send email, run a cron job, load protected administrator data, change an environment variable, or modify production database data/schema. Runtime-error summaries were used only to identify route-level failures; no user-identifying error details are recorded in this document.
