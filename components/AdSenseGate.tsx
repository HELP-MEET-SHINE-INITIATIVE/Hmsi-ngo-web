'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const PUBLISHER_ID = 'ca-pub-3311197406621859';
const CONSENT_KEY = 'hmsi-adsense-consent';

// Keep advertising away from donations, support requests, safeguarding, school,
// applications, rooms, dashboards, and other pages where ads could distract from
// a sensitive or consequential action.
const AD_SAFE_PATHS = new Set(['/about', '/impact', '/projects', '/partnerships', '/transparency']);

type ConsentState = 'pending' | 'accepted' | 'declined';

function removeAdScriptAndPlacements() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('script[data-hmsi-adsense="true"]').forEach((node) => node.remove());
  document.querySelectorAll('.google-auto-placed').forEach((node) => node.remove());
}

export default function AdSenseGate() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentState>('pending');
  const isAdSafePage = AD_SAFE_PATHS.has(pathname || '');

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === 'accepted' || saved === 'declined') setConsent(saved);
  }, []);

  useEffect(() => {
    if (!isAdSafePage || consent !== 'accepted') removeAdScriptAndPlacements();
  }, [consent, isAdSafePage]);

  if (!isAdSafePage) return null;

  const chooseConsent = (value: Exclude<ConsentState, 'pending'>) => {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    if (value === 'declined') removeAdScriptAndPlacements();
  };

  return (
    <>
      {consent === 'accepted' && (
        <Script
          id="hmsi-adsense"
          data-hmsi-adsense="true"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`}
          crossOrigin="anonymous"
        />
      )}
      {consent === 'pending' && (
        <aside
          aria-label="Advertising preference"
          className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-2xl rounded-2xl border border-[#d9d6ce] bg-white p-4 shadow-[0_16px_50px_rgba(23,34,30,0.18)] sm:flex sm:items-center sm:gap-5"
        >
          <p className="text-xs leading-5 text-[#66716a]">
            HMSI may show Google ads on selected informational pages. Google may use cookies and similar identifiers for ad delivery and measurement. Review the{' '}
            <a href="/privacy" className="font-bold text-[#1e5b49] underline">Privacy notice</a> before choosing.
          </p>
          <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
            <button type="button" onClick={() => chooseConsent('declined')} className="rounded-full border border-[#1e5b49] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">Decline</button>
            <button type="button" onClick={() => chooseConsent('accepted')} className="rounded-full bg-[#17221e] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white">Accept ads</button>
          </div>
        </aside>
      )}
    </>
  );
}
