# HMSI Instagram Traffic Channel

## Purpose

The public route `/instagram` is a mobile-first landing page for visitors arriving from HMSI’s official Instagram profile, Stories, Reels, and campaign posts. It routes supporters to approved HMSI actions while preserving first-party UTM attribution in the admin traffic analytics dashboard.

## Primary Instagram bio link

Use this URL in the official HMSI Instagram profile:

`https://www.hmsi.org.ng/instagram?utm_source=instagram&utm_medium=profile&utm_campaign=hmsi_ig_bio`

## Tracked campaign links

| Use | URL |
|---|---|
| Approved causes | `https://www.hmsi.org.ng/fundraise?utm_source=instagram&utm_medium=landing_cta&utm_campaign=hmsi_ig_fundraising` |
| Volunteer recruitment | `https://www.hmsi.org.ng/volunteer?utm_source=instagram&utm_medium=landing_cta&utm_campaign=hmsi_ig_volunteer` |
| Get Help | `https://www.hmsi.org.ng/get-help?utm_source=instagram&utm_medium=landing_cta&utm_campaign=hmsi_ig_get_help` |
| Fundraising and campaign support | `https://www.hmsi.org.ng/fundraising-growth?utm_source=instagram&utm_medium=landing_cta&utm_campaign=hmsi_ig_growth` |
| General contact | `https://www.hmsi.org.ng/contact?utm_source=instagram&utm_medium=footer_cta&utm_campaign=hmsi_ig_contact` |

## Measurement

The existing `PageViewTracker` records the public landing path, UTM source, medium, campaign, and referrer host through the privacy-safe page-view endpoint. The admin Traffic Analytics panel aggregates these events by source, campaign, visited page, clicked destination, and date. It does not expose IP addresses, emails, raw query strings, or raw visitor records.

## Publishing guidance

Instagram posts should use only approved HMSI copy, budgets, images, and programme updates. Posts should link to the most relevant tracked destination rather than always linking to the homepage. A donation post should use the approved-causes link, a volunteer post should use the volunteer link, and a support-request post should use the Get Help link.

Public content must not promise fundraising results, imply a personal financial return, publish private beneficiary information, or use a beneficiary’s image without appropriate authorization. The Instagram route is a traffic and action channel; it is not evidence that Meta direct donation tools are available in Nigeria.

## Admin workflow

An administrator can open the HMSI admin dashboard, find the promotion-links section, and copy the **Instagram traffic hub** URL. That link should be placed in the Instagram bio. The admin can use the Traffic Analytics panel to compare Instagram campaign performance over 7, 30, or 90 days and identify the most-visited pages and most-clicked destinations.
