'use client';

export function trackStoryClick(targetPath: string) {
  if (typeof window === 'undefined' || !targetPath.startsWith('/stories/')) return;
  void fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      eventType: 'link_click',
      path: window.location.pathname,
      targetPath,
      referrerHost: window.location.hostname,
    }),
  }).catch(() => undefined);
}
