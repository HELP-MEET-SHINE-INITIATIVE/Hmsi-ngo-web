# HMSI Traffic Monetization Audit — 22 August 2026

## Scope

This audit uses aggregate production data only and reviews existing HMSI public conversion surfaces. It does not expose donor/requester records and does not initiate any payment, sponsorship activation, or advertising campaign.

## Production traffic snapshot

The last-30-day aggregate query returned 65 page-view events. The donation page had 1 page-view event and 1 click-to-donate event. Fundraising routes had 2 page-view events. No sponsorship request was recorded and the requested sponsorship budget total was NGN 0 in the same period.

Top observed page-view paths included `/` (26), `/instagram` (5), `/worker-apply` (4), `/school` (3), `/opportunities` (3), `/transparency` (3), `/volunteer` (3), `/fundraising-growth` (3), `/fundraise` (2), `/contact` (2), `/dashboard` (2), `/member-apply` (1), `/projects` (1), `/impact` (1), `/donate` (1), and `/about` (1). A malformed `/opportunities%60` path appeared twice and should be monitored as a tracking/data-quality issue rather than treated as a monetizable page.

## Existing monetization surfaces

1. `/donate` provides Paystack donations in NGN and USD, subject to the provider/account activation requirements already documented.
2. `/fundraise` provides approved campaign pages and fundraising ambassador/volunteer pathways.
3. `/sponsor` provides an admin-reviewed sponsorship request flow. Payment initialization is available only after administrator approval, and public activation is controlled by an administrator.
4. `/partnerships` provides institutional-partnership and due-diligence pathways; it is a lead-generation surface, not an automatic grant or funding promise.
5. `/api/admin/analytics` already reports traffic origins, top pages, clicked targets, campaigns, and onboarding CTA CTRs to an authenticated administrator.

## Recommended strategy

The data is too small to justify adding display advertising or forecasting revenue. The first priority should be increasing qualified visits to the donation, approved-fundraiser, and sponsorship pages, then measuring completed conversions. The safest monetization model is a three-lane funnel: donations for charitable support; admin-reviewed sponsorship placements for commercial revenue; and institutional partnership leads for grants or programme support. These must remain financially and editorially distinct.

Google Ad Grants, if HMSI is eligible and approved, are in-kind Search advertising credits and are not cash revenue. Google AdSense is a separate product and would require a privacy/consent review, policy-compliant content and placement, and an approved publisher account. It should not be enabled on safeguarding-sensitive, beneficiary-related, or low-content pages without a separate compliance review.

## Implementation guardrails

No silent FX conversion; no promise of paid work, grants, employment, or guaranteed reach; no sponsor activation before approval and verified payment; no unconsented beneficiary or child imagery; no donor targeting based on sensitive humanitarian attributes; no incentivized ad clicks; and no use of personal donor/requester records in analytics summaries.

## Official Google sources consulted

- Google Ad Grants guidance: https://support.google.com/google-ads/answer/57772?hl=en — states that eligible nonprofits may receive up to USD 10,000 per month for Google Search ads, helping raise awareness, attract donors, and recruit volunteers; this is in-kind advertising, not cash revenue.
- Google for Nonprofits Ad Grants overview: https://www.google.com/nonprofits/offerings/google-ad-grants/ — describes the USD 10,000 monthly in-kind Search advertising benefit and traffic/fundraising use cases.
- Google AdSense Program Policies: https://support.google.com/adsense/answer/48182?hl=en — prohibits invalid or incentivized clicks, requires policy-compliant traffic sources and placements, and states that policy violations can disable ad serving or the account.
- Google Publisher Policies: https://support.google.com/adsense/answer/10502938?hl=en — requires accurate publisher declarations, privacy disclosures for cookies/identifiers, and disallows more paid promotional material than publisher content and ads that interfere with user interactions.

## Implementation decision

The selected provider is Google AdSense with publisher ID `ca-pub-3311197406621859`, supplied by HMSI. Planned implementation is a consent-gated Auto Ads script restricted to `/about`, `/impact`, `/projects`, `/partnerships`, and `/transparency`. It excludes donation checkout, support requests, safeguarding, school, member/worker rooms, dashboards, applications, and sensitive beneficiary content. `public/ads.txt` is configured for the same publisher ID. Account-side AdSense approval and Auto Ads activation remain prerequisites for live ad serving.
