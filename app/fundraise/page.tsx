import type { Metadata } from 'next';
import FundraiseContent from './FundraiseContent';
import { getFundraisers } from '../../lib/fundraisers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Get Help & Support Causes | HMSI Fundraising',
  description: 'Need financial help for medical bills, education, or housing in Nigeria and Africa? Share your story on HMSI and receive support from caring people. Browse verified causes today.',
  keywords: ['get help Nigeria', 'NGO Africa', 'financial assistance Nigeria', 'medical bill help', 'education support', 'crowdfunding Africa', 'HMSI help me'],
  openGraph: {
    title: 'Get Help & Support Causes | HMSI Fundraising Platform',
    description: 'Directly support individual needs and community causes across Nigeria and Africa. Transparent, verified, and impactful.',
    url: 'https://www.hmsi.org.ng/fundraise',
  },
  alternates: { canonical: 'https://www.hmsi.org.ng/fundraise' },
};

export default async function FundraisePage() {
  let fundraisers = [] as Array<{ id: string; title: string }>;
  try {
    fundraisers = (await getFundraisers()).map((fundraiser) => ({ id: fundraiser.id, title: fundraiser.title }));
  } catch (error) {
    console.error('[FundraisePage] Failed to load Supabase fundraisers:', error);
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.hmsi.org.ng' },
      { '@type': 'ListItem', position: 2, name: 'Fundraise', item: 'https://www.hmsi.org.ng/fundraise' },
    ],
  };
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: fundraisers.map((fundraiser, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `https://www.hmsi.org.ng/fundraise/${fundraiser.id}`,
      name: fundraiser.title,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <FundraiseContent />
    </>
  );
}
