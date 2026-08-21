import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const SEARCH_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'search.brave.'];
const SOCIAL_HOSTS = ['facebook.', 'instagram.', 'linkedin.', 'twitter.', 'x.com', 'tiktok.', 'youtube.', 'whatsapp.'];

type AnalyticsRow = {
  event_type: 'page_view' | 'link_click';
  path: string;
  target_path: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
};

function normalise(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function classifyOrigin(row: AnalyticsRow) {
  const source = normalise(row.utm_source);
  const medium = normalise(row.utm_medium);
  const referrer = normalise(row.referrer_host);

  if (medium.includes('cpc') || medium.includes('ppc') || medium.includes('paid') || medium.includes('display')) {
    return source ? `Paid · ${source}` : 'Paid traffic';
  }
  if (source) return medium ? `${source} · ${medium}` : source;
  if (!referrer) return 'Direct';
  if (SEARCH_HOSTS.some((host) => referrer.includes(host))) return 'Organic search';
  if (SOCIAL_HOSTS.some((host) => referrer.includes(host))) return 'Social';
  if (referrer.includes('hmsi.org.ng')) return 'HMSI internal';
  return `Referral · ${referrer}`;
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function share(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

export async function GET(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get('days') || 30);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.floor(requestedDays), 7), 90) : 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { data, error } = await admin
    .from('page_views')
    .select('event_type,path,target_path,referrer_host,utm_source,utm_medium,utm_campaign,created_at')
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: false })
    .limit(10000);

  if (error) {
    console.error('[Analytics] Failed to load page views:', error);
    return NextResponse.json({ error: 'Traffic analytics is not configured yet. Run supabase/traffic_analytics_patch.sql in Supabase SQL Editor.' }, { status: 503 });
  }

  const rows = (data || []) as AnalyticsRow[];
  const pageViews = rows.filter((row) => row.event_type === 'page_view');
  const linkClicks = rows.filter((row) => row.event_type === 'link_click');
  const totalViews = pageViews.length;
  const originCounts = new Map<string, number>();
  const referrerCounts = new Map<string, number>();
  const campaignCounts = new Map<string, number>();
  const pageViewCounts = new Map<string, number>();
  const clickCounts = new Map<string, number>();
  const dailyCounts = new Map<string, number>();

  pageViews.forEach((row) => {
    increment(originCounts, classifyOrigin(row));
    increment(referrerCounts, row.referrer_host || 'Direct');
    if (row.utm_campaign) increment(campaignCounts, row.utm_campaign);
    increment(pageViewCounts, row.path);
    increment(dailyCounts, row.created_at.slice(0, 10));
  });
  linkClicks.forEach((row) => {
    if (row.target_path) increment(clickCounts, row.target_path);
  });

  const trafficOrigins = Array.from(originCounts.entries())
    .map(([label, views]) => ({ label, views, share: share(views, totalViews) }))
    .sort((a, b) => b.views - a.views || a.label.localeCompare(b.label))
    .slice(0, 12);

  const topReferrers = Array.from(referrerCounts.entries())
    .map(([host, views]) => ({ host, views, share: share(views, totalViews) }))
    .sort((a, b) => b.views - a.views || a.host.localeCompare(b.host))
    .slice(0, 12);

  const pageRankings = Array.from(new Set([...pageViewCounts.keys(), ...clickCounts.keys()])).map((path) => ({
    path,
    views: pageViewCounts.get(path) || 0,
    clicks: clickCounts.get(path) || 0,
    clickShare: share(clickCounts.get(path) || 0, linkClicks.length),
  }));
  const topPages = pageRankings
    .slice()
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks || a.path.localeCompare(b.path))
    .slice(0, 10);
  const topClickedPages = pageRankings
    .slice()
    .sort((a, b) => b.clicks - a.clicks || b.views - a.views || a.path.localeCompare(b.path))
    .slice(0, 10);

  const topCampaigns = Array.from(campaignCounts.entries())
    .map(([campaign, views]) => ({ campaign, views, share: share(views, totalViews) }))
    .sort((a, b) => b.views - a.views || a.campaign.localeCompare(b.campaign))
    .slice(0, 10);

  const dailyTrend = Array.from({ length: days }, (_, index) => {
    const date = new Date(from);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, views: dailyCounts.get(key) || 0 };
  });

  return NextResponse.json({
    periodDays: days,
    from: from.toISOString(),
    totals: { pageViews: totalViews, linkClicks: linkClicks.length, origins: originCounts.size, pages: pageViewCounts.size },
    trafficOrigins,
    topReferrers,
    topCampaigns,
    topPages,
    topClickedPages,
    dailyTrend,
    limited: rows.length >= 10000,
  });
}
