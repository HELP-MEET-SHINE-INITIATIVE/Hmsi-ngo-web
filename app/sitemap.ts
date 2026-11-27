import type { MetadataRoute } from 'next';
import { getFundraisers } from '../lib/fundraisers';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.hmsi.org.ng';
  const staticPages = [
    '',
    '/about',
    '/contact',
    '/donate',
    '/fundraise',
    '/impact',
    '/news',
    '/volunteer',
    '/fundraising-growth',
    '/instagram',
    '/opportunities',
    '/get-help',
    '/projects',
    '/programmes',
    '/programmes/project-feed-a-home',
    '/programmes/food-security-community-relief-edo',
    '/programmes/youth-empowerment-nigeria',
    '/programmes/climate-resilient-community-agriculture',
    '/stories',
    '/field-stories',
    '/field-stories/food-insecurity-edo-project-feed-a-home',
    '/field-stories/immediate-relief-to-climate-resilient-farms',
    '/field-stories/governance-and-scuml-compliance-nonprofits-nigeria',
    '/field-stories/grassroots-volunteerism-hmsi-model',
    '/partnerships',
    '/transparency',
    '/safeguarding',
    '/privacy',
    '/cookies',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : ['/donate', '/fundraise', '/impact', '/news', '/stories', '/field-stories', '/programmes', '/volunteer', '/fundraising-growth', '/instagram', '/opportunities', '/partnerships', '/transparency', '/safeguarding', '/privacy', '/cookies'].includes(route) ? 0.9 : 0.7,
  }));

  let fundraisers = [] as Awaited<ReturnType<typeof getFundraisers>>;
  try {
    fundraisers = await getFundraisers();
  } catch (error) {
    console.error('[Sitemap] Failed to load Supabase fundraisers:', error);
  }

  const fundraiserPages = fundraisers.map((fundraiser) => ({
    url: `${baseUrl}/fundraise/${fundraiser.id}`,
    lastModified: new Date(fundraiser.createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...fundraiserPages];
}
