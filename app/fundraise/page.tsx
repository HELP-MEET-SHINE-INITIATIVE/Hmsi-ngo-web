import type { Metadata } from 'next';
import FundraiseContent from './FundraiseContent';
import fundraisersData from '../../data/fundraisers/fundraisers.json';

export const metadata: Metadata = {
  title: 'Get Help & Support Causes | HMSI Fundraising',
  description: 'Need financial help for medical bills, education, or housing in Nigeria? Post your problem on HMSI and receive donations from caring people. Browse and support verified causes today.',
  keywords: ['get help Nigeria', 'financial assistance Nigeria', 'medical bill help', 'education support', 'crowdfunding Nigeria', 'HMSI help me'],
  openGraph: {
    title: 'Get Help & Support Causes | HMSI Fundraising Platform',
    description: 'Directly support individual needs and community causes across Nigeria. Transparent, verified, and impactful.',
    url: 'https://www.hmsi.org.ng/fundraise',
  },
  alternates: {
    canonical: 'https://www.hmsi.org.ng/fundraise',
  },
};

export default function FundraisePage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': 'https://www.hmsi.org.ng',
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Fundraise',
        'item': 'https://www.hmsi.org.ng/fundraise',
      },
    ],
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': fundraisersData.map((f: any, index: number) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'url': `https://www.hmsi.org.ng/fundraise/${f.id}`,
      'name': f.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <FundraiseContent />
    </>
  );
}
