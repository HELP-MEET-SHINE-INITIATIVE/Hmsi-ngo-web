import type { Metadata } from 'next';
import FundraiseContent from './FundraiseContent';
import { getFundraisers } from '../../lib/fundraisers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support Verified NGO Causes in Nigeria | HMSI',
  description: 'Browse verified fundraising causes and support people facing medical, education, housing, and emergency needs across Nigeria and Africa through HMSI.',
  keywords: ['support verified causes Nigeria', 'donate to verified fundraiser Nigeria', 'charity fundraising Africa', 'medical bill fundraiser Nigeria', 'education support Nigeria', 'HMSI fundraisers'],
  openGraph: {
    type: 'website',
    title: 'Support Verified NGO Causes in Nigeria | HMSI Fundraising',
    description: 'Directly support verified individual needs and community causes across Nigeria and Africa.',
    siteName: 'Help Meet Shine Initiative',
    images: [{ url: 'https://www.hmsi.org.ng/images/fundraise-community-hero.webp', alt: 'HMSI period hygiene outreach supporting young girls with menstrual health kits' }],
    url: 'https://www.hmsi.org.ng/fundraise',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support Verified NGO Causes in Nigeria | HMSI Fundraising',
    description: 'Directly support verified individual needs and community causes across Nigeria and Africa.',
    images: ['https://www.hmsi.org.ng/images/fundraise-community-hero.webp'],
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
