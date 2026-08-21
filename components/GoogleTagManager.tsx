'use client';

import Script from 'next/script';
import { GOOGLE_ADS_CONVERSION_ID, GTM_ID } from '../lib/gtm';

export default function GoogleTagManager() {
  const hasGtm = Boolean(GTM_ID && GTM_ID !== 'GTM-XXXXXXX');
  const hasGoogleAds = Boolean(GOOGLE_ADS_CONVERSION_ID);

  if (!hasGtm && !hasGoogleAds) {
    return null;
  }

  return (
    <>
      {hasGoogleAds && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_CONVERSION_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads-tag" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GOOGLE_ADS_CONVERSION_ID}');
            `}
          </Script>
        </>
      )}
      {hasGtm && <Script id="google-tag-manager" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
