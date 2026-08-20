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
    '/fundraise/create',
    '/volunteer',
    '/login',
    '/signup',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
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
