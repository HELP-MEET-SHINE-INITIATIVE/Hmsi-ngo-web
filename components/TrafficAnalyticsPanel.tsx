'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BarChart3, FileText, Globe2, MousePointerClick, RefreshCw } from 'lucide-react';

type AnalyticsData = {
  periodDays: number;
  from: string;
  totals: { pageViews: number; linkClicks: number; origins: number; pages: number };
  trafficOrigins: Array<{ label: string; views: number; share: number }>;
  topReferrers: Array<{ host: string; views: number; share: number }>;
  topCampaigns: Array<{ campaign: string; views: number; share: number }>;
  topPages: Array<{ path: string; views: number; clicks: number; clickShare: number }>;
  topClickedPages: Array<{ path: string; views: number; clicks: number; clickShare: number }>;
  dailyTrend: Array<{ date: string; views: number }>;
  limited: boolean;
};

const numberFormat = new Intl.NumberFormat('en-NG');

export default function TrafficAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Traffic analytics is temporarily unavailable.');
      setAnalytics(result);
    } catch (loadError) {
      setAnalytics(null);
      setError(loadError instanceof Error ? loadError.message : 'Traffic analytics is temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const maxDailyViews = useMemo(() => Math.max(...(analytics?.dailyTrend.map((day) => day.views) || [0]), 1), [analytics]);
  const maxOriginViews = useMemo(() => Math.max(...(analytics?.trafficOrigins.map((origin) => origin.views) || [0]), 1), [analytics]);
  const mostClickedPage = analytics?.topClickedPages[0];
  const mostVisitedPage = analytics?.topPages[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Measurement for HMSI outreach</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Traffic analytics</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66716a]">See where visitors arrive from and which public HMSI pages attract the most attention. Reports use aggregate first-party events only; visitor names, email addresses, IP addresses, and raw query strings are not shown here.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="analytics-period">Analytics period</label>
          <select id="analytics-period" value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-full border border-[#d9d6ce] bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#17221e] outline-none focus:ring-2 focus:ring-[#1e5b49]">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button type="button" onClick={() => void loadAnalytics()} disabled={isLoading} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {isLoading && <div className="rounded-3xl border border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">Loading real traffic events…</div>}

      {!isLoading && error && <div className="rounded-3xl border border-[#e1ad45]/50 bg-[#fff8e8] p-6 text-sm leading-6 text-[#7a5b16]" role="alert"><p className="font-black uppercase tracking-widest">Traffic analytics setup needed</p><p className="mt-2">{error}</p><p className="mt-3 text-xs">Run <code className="rounded bg-white px-1.5 py-0.5 font-mono">supabase/traffic_analytics_patch.sql</code> in the Supabase SQL Editor, then refresh this panel.</p></div>}

      {!isLoading && !error && analytics && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Page views" value={analytics.totals.pageViews} icon={<FileText size={19} />} />
          <MetricCard label="Internal link clicks" value={analytics.totals.linkClicks} icon={<MousePointerClick size={19} />} />
          <MetricCard label="Traffic origins" value={analytics.totals.origins} icon={<Globe2 size={19} />} />
          <MetricCard label="Pages viewed" value={analytics.totals.pages} icon={<BarChart3 size={19} />} />
        </div>

        {analytics.totals.pageViews === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center"><p className="font-black">No traffic events in this period yet.</p><p className="mt-2 text-sm leading-6 text-[#66716a]">Once visitors view public HMSI pages, this area will show the real source mix and page rankings. No sample numbers are displayed.</p></div> : <>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
              <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">Traffic origin</h3><p className="mt-1 text-sm text-[#66716a]">How visitors reached HMSI during the selected period.</p></div><Globe2 size={22} className="text-[#1e5b49]" /></div>
              <div className="mt-6 space-y-4">{analytics.trafficOrigins.length === 0 ? <p className="text-sm text-[#66716a]">No source labels recorded yet.</p> : analytics.trafficOrigins.map((origin) => <div key={origin.label}><div className="flex items-center justify-between gap-4 text-sm"><span className="min-w-0 truncate font-bold" title={origin.label}>{origin.label}</span><span className="shrink-0 font-black text-[#1e5b49]">{numberFormat.format(origin.views)} · {origin.share}%</span></div><div className="mt-2 h-2 rounded-full bg-[#f0eee8]"><div className="h-2 rounded-full bg-[#1e5b49]" style={{ width: `${Math.max((origin.views / maxOriginViews) * 100, 3)}%` }} /></div></div>)}</div>
            </section>

            <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
              <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">Most clicked page</h3><p className="mt-1 text-sm text-[#66716a]">Internal link destinations clicked from public HMSI pages.</p></div><MousePointerClick size={22} className="text-[#b56b3b]" /></div>
              {mostClickedPage && mostClickedPage.clicks > 0 ? <div className="mt-8"><p className="break-all text-3xl font-black text-[#1e5b49]">{mostClickedPage.path}</p><p className="mt-3 text-sm font-bold text-[#66716a]">{numberFormat.format(mostClickedPage.clicks)} internal click{mostClickedPage.clicks === 1 ? '' : 's'} · {mostClickedPage.clickShare}% of recorded link clicks</p><p className="mt-5 border-t border-[#eeeae2] pt-4 text-xs leading-5 text-[#66716a]">Click reporting begins with this release. It does not backfill clicks from before the tracker was deployed.</p></div> : <div className="mt-8 rounded-2xl bg-[#f6f4ef] p-5 text-sm leading-6 text-[#66716a]">No internal page clicks have been recorded in this period yet. Page-view rankings remain available below.</div>}
            </section>
          </div>

          <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h3 className="text-xl font-black">Most visited public pages</h3><p className="mt-1 text-sm text-[#66716a]">Ranked by page views, with internal click destinations shown alongside each page.</p></div>{mostVisitedPage && <p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Most viewed: {mostVisitedPage.path}</p>}</div>
            <div className="mt-5 overflow-x-auto"><table className="min-w-[650px] w-full text-left text-sm"><thead className="border-b border-[#d9d6ce] text-[10px] font-black uppercase tracking-widest text-[#66716a]"><tr><th className="px-3 py-3">Page</th><th className="px-3 py-3">Views</th><th className="px-3 py-3">Internal clicks</th><th className="px-3 py-3">Click share</th></tr></thead><tbody className="divide-y divide-[#eeeae2]">{analytics.topPages.map((page) => <tr key={page.path}><td className="max-w-[300px] break-all px-3 py-4 font-bold">{page.path}</td><td className="px-3 py-4 font-black text-[#1e5b49]">{numberFormat.format(page.views)}</td><td className="px-3 py-4">{numberFormat.format(page.clicks)}</td><td className="px-3 py-4 text-[#66716a]">{page.clickShare}%</td></tr>)}</tbody></table></div>
          </section>

          {analytics.topCampaigns.length > 0 && <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><h3 className="text-xl font-black">Campaign sources</h3><p className="mt-1 text-sm text-[#66716a]">UTM campaign labels recorded on HMSI page views.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{analytics.topCampaigns.map((campaign) => <div key={campaign.campaign} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm"><span className="min-w-0 truncate font-bold" title={campaign.campaign}>{campaign.campaign}</span><span className="shrink-0 font-black text-[#1e5b49]">{numberFormat.format(campaign.views)} · {campaign.share}%</span></div>)}</div></section>}

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
              <h3 className="text-xl font-black">Daily page views</h3><p className="mt-1 text-sm text-[#66716a]">UTC day buckets for the selected period.</p>
              <div className="mt-6 flex h-48 items-end gap-1 border-b border-l border-[#d9d6ce] px-2 pb-0">{analytics.dailyTrend.map((day) => <div key={day.date} className="group flex h-full min-w-0 flex-1 items-end justify-center"><div className="w-full max-w-4 rounded-t bg-[#e1ad45]" style={{ height: `${day.views ? Math.max((day.views / maxDailyViews) * 100, 5) : 2}%` }} title={`${day.date}: ${numberFormat.format(day.views)} views`} /></div>)}</div>
              <div className="mt-3 flex justify-between gap-3 text-[10px] font-bold text-[#66716a]"><span>{analytics.dailyTrend[0]?.date}</span><span>{analytics.dailyTrend[analytics.dailyTrend.length - 1]?.date}</span></div>
            </section>

            <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
              <h3 className="text-xl font-black">Top referrer hosts</h3><p className="mt-1 text-sm text-[#66716a]">Hostname-only referrer summary. Direct visits have no referrer host.</p>
              <div className="mt-5 space-y-3">{analytics.topReferrers.length === 0 ? <p className="text-sm text-[#66716a]">No referrer information recorded yet.</p> : analytics.topReferrers.slice(0, 8).map((referrer) => <div key={referrer.host} className="flex items-center justify-between gap-3 border-b border-[#eeeae2] pb-3 text-sm"><span className="min-w-0 truncate font-bold" title={referrer.host}>{referrer.host}</span><span className="shrink-0 text-xs font-black text-[#1e5b49]">{numberFormat.format(referrer.views)} · {referrer.share}%</span></div>)}</div>
            </section>
          </div>

          <div className="text-xs leading-5 text-[#66716a]">Showing the last {analytics.periodDays} days{analytics.limited ? ' up to the 10,000-event reporting limit.' : '.'} Aggregates are calculated server-side for the authenticated HMSI administrator.</div>
        </>}
      </>}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><div className="flex items-center gap-2 text-[#1e5b49]">{icon}<p className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">{label}</p></div><p className="mt-4 text-3xl font-black">{numberFormat.format(value)}</p></div>;
}
