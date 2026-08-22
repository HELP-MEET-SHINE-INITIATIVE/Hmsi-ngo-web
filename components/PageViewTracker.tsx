'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { OnboardingCtaKey } from '../lib/onboardingCtas';

const EXCLUDED_PATHS = new Set(['/hmsi-control', '/gtm-preview', '/login', '/signup']);

function isTrackablePath(path: string) {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/api/') && !EXCLUDED_PATHS.has(path);
}

function cleanLabel(value: string | null, maxLength = 120) {
  if (!value) return undefined;
  const cleaned = value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
  return cleaned || undefined;
}

function getReferrerHost() {
  if (!document.referrer) return undefined;
  try {
    return cleanLabel(new URL(document.referrer).hostname.toLowerCase(), 180);
  } catch {
    return undefined;
  }
}

function getCtaKey(target: HTMLElement | null): OnboardingCtaKey | undefined {
  const value = target?.closest<HTMLElement>('[data-hmsi-cta]')?.dataset.hmsiCta;
  return value && /^[a-z0-9._-]{1,120}$/.test(value) ? value as OnboardingCtaKey : undefined;
}

function getUtmValues(url: URL) {
  return {
    utmSource: cleanLabel(url.searchParams.get('utm_source'), 100),
    utmMedium: cleanLabel(url.searchParams.get('utm_medium'), 100),
    utmCampaign: cleanLabel(url.searchParams.get('utm_campaign'), 160),
  };
}

function sendEvent(payload: {
  eventType: 'page_view' | 'link_click' | 'cta_impression' | 'cta_click';
  path: string;
  targetPath?: string;
  ctaKey?: OnboardingCtaKey;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: 'application/json' });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/pageview', blob);
    return;
  }

  void fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export default function PageViewTracker() {
  const pathname = usePathname() || '/';
  const lastPageView = useRef('');
  const recordedCtaImpressions = useRef(new Set<string>());

  useEffect(() => {
    if (!isTrackablePath(pathname) || lastPageView.current === pathname) return;
    lastPageView.current = pathname;

    const searchParams = new URLSearchParams(window.location.search);
    sendEvent({
      eventType: 'page_view',
      path: pathname,
      referrerHost: getReferrerHost(),
      utmSource: cleanLabel(searchParams.get('utm_source')),
      utmMedium: cleanLabel(searchParams.get('utm_medium')),
      utmCampaign: cleanLabel(searchParams.get('utm_campaign')),
    });
  }, [pathname]);

  useEffect(() => {
    if (!isTrackablePath(pathname) || typeof IntersectionObserver === 'undefined') return;

    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-hmsi-cta]'));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const ctaKey = getCtaKey(entry.target as HTMLElement);
        if (!ctaKey || recordedCtaImpressions.current.has(`${pathname}:${ctaKey}`)) return;
        recordedCtaImpressions.current.add(`${pathname}:${ctaKey}`);
        sendEvent({ eventType: 'cta_impression', path: pathname, ctaKey, referrerHost: getReferrerHost() });
      });
    }, { threshold: 0.5 });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a');
      if (!anchor || !anchor.href) return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      const ctaKey = getCtaKey(anchor);
      if (ctaKey && isTrackablePath(pathname)) {
        const utm = getUtmValues(destination);
        sendEvent({
          eventType: 'cta_click',
          path: pathname,
          targetPath: destination.origin === window.location.origin && isTrackablePath(destination.pathname) ? destination.pathname : undefined,
          ctaKey,
          referrerHost: getReferrerHost(),
          ...utm,
        });
        return;
      }

      if (destination.origin !== window.location.origin) return;
      const targetPath = destination.pathname;
      if (!isTrackablePath(targetPath) || !isTrackablePath(pathname)) return;
      if (anchor.hasAttribute('download') || anchor.getAttribute('target') === '_blank') return;

      sendEvent({
        eventType: 'link_click',
        path: pathname,
        targetPath,
        referrerHost: getReferrerHost(),
      });
    };

    document.addEventListener('click', handleClick, { passive: true });
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  return null;
}
