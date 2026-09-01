import Script from 'next/script';

const GREAT_NONPROFITS_PROFILE = 'https://greatnonprofits.org/org/help-meet-shine-initiative/?badge=1';

export default function GreatNonprofitsBadge() {
  return (
    <section aria-labelledby="greatnonprofits-heading" className="mt-8 max-w-sm border-t border-white/15 pt-6">
      <p id="greatnonprofits-heading" className="text-xs font-black uppercase tracking-[0.17em] text-[#e1ad45]">
        Independent review profile
      </p>
      <p className="mt-3 text-xs leading-5 text-white/60">
        Read or share community feedback about Help Meet Shine Initiative on GreatNonprofits.
      </p>
      <div id="greatnonprofits-badge" className="mt-4 min-h-10" aria-label="GreatNonprofits review badge">
        <Script id="greatnonprofits-badge-config" strategy="afterInteractive">
          {`window.gnp_url = 'help-meet-shine-initiative'; window.gnp_num = '1'; window.gnp_rating = '0.00';`}
        </Script>
        <Script id="greatnonprofits-badge-stars" src="https://greatnonprofits.org/js/api/badge_stars.js" strategy="afterInteractive" />
        <noscript>
          <a href={GREAT_NONPROFITS_PROFILE} rel="noopener noreferrer">
            <img
              alt="Review Help Meet Shine Initiative on GreatNonprofits"
              title="Review Help Meet Shine Initiative on GreatNonprofits"
              src="https://cdn.greatnonprofits.org/images/great-nonprofits.gif?id=997230981"
              width="180"
              height="48"
            />
          </a>
        </noscript>
        <a
          href={GREAT_NONPROFITS_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full border border-white/25 px-3 py-2 text-xs font-bold text-white/85 underline-offset-4 transition hover:border-[#e1ad45] hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-[#e1ad45]"
        >
          View HMSI on GreatNonprofits
        </a>
      </div>
    </section>
  );
}
