import { MetadataRoute } from 'next';
import fundraisersData from '../data/fundraisers/fundraisers.json';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.hmsi.org.ng';

  // Static pages
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

  // Dynamic fundraiser pages
  const fundraiserPages = fundraisersData.map((f: any) => ({
    url: `${baseUrl}/fundraise/${f.id}`,
    lastModified: new Date(f.createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...fundraiserPages];
}
