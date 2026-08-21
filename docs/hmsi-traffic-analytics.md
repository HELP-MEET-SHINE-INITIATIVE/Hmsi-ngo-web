# HMSI Traffic Analytics

**Status:** Implemented in code; the Supabase migration must be run before production reporting is available.  
**Scope:** First-party measurement for public HMSI pages and internal link destinations.  
**Admin location:** `/hmsi-control` → **Traffic analytics**  
**Date updated:** 21 August 2026

## What the feature reports

The private HMSI administrator view reports traffic for a selectable seven-, thirty-, or ninety-day period. It shows aggregate page views, internal link clicks, the number of detected traffic origins, pages viewed, source categories, hostname-only referrers, daily page-view trend, the most-clicked internal destination, and the most-visited public pages.

Traffic origin is classified from campaign labels and referrer hostnames. UTM source and medium values are retained as bounded labels. When no campaign or referrer information exists, the visit is classified as **Direct**. Search-engine hosts are grouped as **Organic search**, known social hosts as **Social**, and other external hosts as **Referral**.

## Data minimisation

The event table deliberately does not store IP addresses, email addresses, full user-agent strings, raw query strings, page titles, form contents, donation details, help-request details, beneficiary information, or authentication data. Only a pathname, optional same-site destination pathname, referrer hostname, bounded UTM labels, event type, and UTC timestamp are stored.

Public event ingestion is handled by the server route at `/api/analytics/pageview`. The route accepts only `page_view` and `link_click` events, rejects malformed or excluded paths, strips query strings and fragments from paths, bounds text lengths, and writes with the server-side Supabase client. The admin aggregation route validates the existing signed admin session before reading data.

The public tracker excludes `/api/*`, `/hmsi-control`, `/gtm-preview`, `/login`, and `/signup`. It records public page views and same-site link clicks only. External links, downloads, and links opening in a new tab are not included in the internal destination report.

## Deployment steps

Run `supabase/traffic_analytics_patch.sql` in the Supabase SQL Editor. Then deploy the application. After deployment, visit several public HMSI pages and click internal links. Return to `/hmsi-control`, sign in, open **Traffic analytics**, and refresh the selected period. The dashboard intentionally displays an empty state until real events exist; it never fabricates traffic numbers or backfills events from before the tracker was deployed.

## Operational notes

The admin route limits a report query to 10,000 events per request. If that limit is reached, the dashboard identifies the result as limited. The migration includes indexes on timestamp, event type and path, click destination, and source fields to keep the reporting query practical as HMSI outreach grows.

The policy and consent inventory should be kept aligned with the live deployment. If HMSI later introduces optional third-party analytics, advertising pixels, or behavioural profiling, those technologies require a separate privacy and consent review; they are not enabled by this first-party Supabase event logger.
