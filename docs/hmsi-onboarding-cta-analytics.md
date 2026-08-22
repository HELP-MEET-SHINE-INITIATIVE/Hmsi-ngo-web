# HMSI Onboarding CTA Analytics

## Purpose

The admin Traffic analytics view now reports performance for every catalogued HMSI onboarding role and external platform route. The report shows CTA impressions, CTA clicks, and click-through rate (CTR) for the selected 7-, 30-, or 90-day period.

## Metric definition

`CTR = CTA clicks ÷ CTA impressions × 100`

An impression is recorded once per CTA and page view when at least 50% of the CTA enters the visitor’s viewport. A click is recorded when the CTA link is activated. The tracker records only the approved catalog key, current pathname, same-site destination pathname when applicable, hostname-only referrer, bounded UTM labels, and timestamp.

The system does not store IP addresses, email addresses, names, raw query strings, full external URLs, or persistent visitor/session identifiers. Admin reports contain aggregate counts only.

## Event types

| Event type | Purpose |
|---|---|
| `page_view` | Public page-view count and traffic-source reporting |
| `link_click` | Existing same-site link-click reporting |
| `cta_impression` | Approved onboarding CTA became substantially visible |
| `cta_click` | Approved onboarding CTA was activated, including external links |

## Approved CTA catalog

The catalog is defined in `lib/onboardingCtas.ts`. The public onboarding CTA component uses these keys, and the ingestion endpoint rejects unknown CTA keys. This keeps reporting stable when several role links share `/volunteer` or `/worker-apply` destinations.

## Admin workflow

1. Sign in at `/hmsi-control`.
2. Open the **Traffic analytics** view.
3. Select **Last 7 days**, **Last 30 days**, or **Last 90 days**.
4. Review the CTA totals and per-CTA table.
5. Use the table’s zero-activity rows to identify roles or platform routes that need promotion.
6. Refresh after a campaign has generated additional traffic.

The dashboard lists all catalogued CTAs, including those with no activity. No sample or simulated numbers are displayed.

## Database change

The production Supabase `public.page_views` table now includes a nullable `cta_key` column, a bounded key-format check, an expanded event-type check, and an index on `(cta_key, event_type, created_at desc)`. The migration is stored at `supabase/traffic_analytics_cta_patch.sql`.
