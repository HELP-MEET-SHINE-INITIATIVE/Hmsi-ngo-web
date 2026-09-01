# HMSI GreatNonprofits badge integration

## Prerequisites

HMSI must confirm that the GreatNonprofits profile at `https://greatnonprofits.org/org/help-meet-shine-initiative/` is the official HMSI profile and that the supplied badge identifier belongs to that profile. The normalized profile URL was checked publicly and resolves to a profile titled “Help meet shine initiative” in Benin, but the profile page did not expose a rating or review count in the fetched excerpt.

The supplied widget parameters are therefore treated as vendor configuration only. They must not be described on HMSI pages as an HMSI rating, testimonial, award, certification, endorsement, or “top-rated” status. The general badge is a link to an external community-review profile. HMSI should obtain the final code from the GreatNonprofits profile’s “Get link or badge” control if GreatNonprofits supplies a profile-specific revision.

## Placement

The badge is mounted once in `components/Footer.tsx` through `components/GreatNonprofitsBadge.tsx`. This makes it available in the shared public footer rather than adding repeated review claims to individual pages. The surrounding text says that visitors can read or share community feedback; it does not claim that HMSI has received a rating or award.

The component includes the official external script, a visible text link that remains available if JavaScript or the vendor script is blocked, and the supplied image inside a `noscript` fallback. The link uses the normalized profile slug and `rel="noopener noreferrer"` for the new-tab fallback.

## Privacy and security review

The widget is an optional third-party resource. Before enforcing a Content Security Policy, include only the required GreatNonprofits origins after reviewing the browser network behavior: `https://greatnonprofits.org` for the script and profile link, and `https://cdn.greatnonprofits.org` for the supplied fallback image if it is retained. The portal currently has no CSP header, so this change does not silently broaden an existing allowlist.

The implementation does not send HMSI donor, volunteer, member, worker, safeguarding, payment, or administrative data to GreatNonprofits. The vendor script may create its own browser request and should be documented in the cookie/privacy inventory if it sets optional storage or tracking identifiers. The badge must be removed or gated if the final privacy review does not approve that behavior.

## Verification procedure

Run the focused badge test, the complete Node test suite, lint, and the production build. Verify the footer on the homepage, About page, Partnerships page, and at least one donation or volunteer page. Confirm that the visible profile link remains usable if the third-party script is blocked, and that disabling JavaScript exposes the supplied `noscript` link/image without claiming a rating.

If the profile identity, badge ID, or widget output changes, pause publication and re-confirm the final code against the official GreatNonprofits profile. Do not hardcode reviews, ratings, review counts, testimonials, or top-rated language into the HMSI repository.

## Sources

- GreatNonprofits profile target: https://greatnonprofits.org/org/help-meet-shine-initiative/
- GreatNonprofits badge guidance: https://greatnonprofits.org/pages/about/great-nonprofit-badge/
