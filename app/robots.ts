import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/hmsi-control',
        '/dashboard',
        '/worker-dashboard',
        '/volunteer-room',
        '/worker-room',
        '/login',
        '/signup',
        '/fundraise/create',
        '/gtm-preview',
      ],
    },
    sitemap: 'https://www.hmsi.org.ng/sitemap.xml',
  };
}
