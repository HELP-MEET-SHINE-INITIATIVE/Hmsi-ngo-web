import { getFundraisers } from '../../lib/fundraisers';
import { fieldStories, programmes, SITE_URL } from '../../lib/seoContent';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const revalidate = 900;

const FEED_URL = `${SITE_URL}/rss.xml`;
const FEED_TITLE = 'Help Meet Shine Initiative (HMSI) | News, Field Stories and Initiatives';
const FEED_DESCRIPTION = 'Published HMSI field stories, programme updates, community initiatives, and active approved fundraising pages from Nigeria.';
const FUNDRAISER_FEED_DESCRIPTION = 'HMSI community fundraising initiative. Visit the public fundraiser page for current details and ways to support.';

type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string;
  guid?: string;
};

function cleanText(value: unknown, maxLength = 600) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' ')
    .replace(/[*_`#>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function validDate(value: unknown, fallback = new Date()) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function getPublishedNewsItems(): Promise<FeedItem[]> {
  if (!hasSupabaseConfig()) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data, error } = await admin
    .from('news_articles')
    .select('id,headline,summary,body,category,published_at,created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(25);
  if (error) {
    console.warn('[RSS] Published news unavailable:', error.message);
    return [];
  }
  return (data || []).map((article) => ({
    title: cleanText(article.headline, 180),
    link: `${SITE_URL}/news/${encodeURIComponent(article.id)}`,
    description: cleanText(article.summary || article.body),
    pubDate: validDate(article.published_at || article.created_at).toUTCString(),
    category: cleanText(article.category, 80) || 'HMSI news',
    guid: `${SITE_URL}/news/${encodeURIComponent(article.id)}`,
  }));
}

function getStaticItems(): FeedItem[] {
  const staticDate = new Date('2026-11-26T12:00:00.000Z');
  const storyItems = fieldStories.map((story) => ({
    title: story.title,
    link: `${SITE_URL}/field-stories/${story.slug}`,
    description: story.dek,
    pubDate: staticDate.toUTCString(),
    category: story.category,
    guid: `${SITE_URL}/field-stories/${story.slug}`,
  }));
  const programmeItems = programmes.map((programme) => ({
    title: programme.title,
    link: `${SITE_URL}/programmes/${programme.slug}`,
    description: programme.description,
    pubDate: staticDate.toUTCString(),
    category: 'HMSI programme',
    guid: `${SITE_URL}/programmes/${programme.slug}`,
  }));
  return [...storyItems, ...programmeItems];
}

async function getFundraiserItems(): Promise<FeedItem[]> {
  try {
    const fundraisers = await getFundraisers();
    return fundraisers.slice(0, 25).map((fundraiser) => ({
      title: fundraiser.title,
      link: `${SITE_URL}/fundraise/${encodeURIComponent(fundraiser.id)}`,
      // Do not syndicate user-submitted fundraiser narratives. They may contain
      // names, addresses, ages, medical details, or other identifying information.
      description: FUNDRAISER_FEED_DESCRIPTION,
      pubDate: validDate(fundraiser.createdAt).toUTCString(),
      category: cleanText(fundraiser.category, 80) || 'Approved HMSI fundraiser',
      guid: `${SITE_URL}/fundraise/${encodeURIComponent(fundraiser.id)}`,
    }));
  } catch (error) {
    console.warn('[RSS] Active fundraisers unavailable:', error instanceof Error ? error.message : 'unknown error');
    return [];
  }
}

function renderItem(item: FeedItem) {
  return `\n    <item>\n      <title>${escapeXml(item.title)}</title>\n      <link>${escapeXml(item.link)}</link>\n      <guid isPermaLink="true">${escapeXml(item.guid || item.link)}</guid>\n      <pubDate>${escapeXml(item.pubDate)}</pubDate>${item.category ? `\n      <category>${escapeXml(item.category)}</category>` : ''}\n      <description>${escapeXml(item.description)}</description>\n    </item>`;
}

export async function GET() {
  const [newsItems, fundraiserItems] = await Promise.all([getPublishedNewsItems(), getFundraiserItems()]);
  const items = [...newsItems, ...getStaticItems(), ...fundraiserItems]
    .filter((item) => item.title && item.link && item.description)
    .sort((first, second) => validDate(second.pubDate).getTime() - validDate(first.pubDate).getTime())
    .slice(0, 75);
  const lastBuildDate = items[0]?.pubDate || new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(FEED_TITLE)}</title>\n    <link>${SITE_URL}</link>\n    <description>${escapeXml(FEED_DESCRIPTION)}</description>\n    <language>en-NG</language>\n    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>\n    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${FEED_URL}" rel="self" type="application/rss+xml" />${items.map(renderItem).join('')}\n  </channel>\n</rss>\n`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}
