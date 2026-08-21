import type { Metadata } from 'next';
import CreateFundraiserContent from './CreateFundraiserContent';

export const metadata: Metadata = {
  title: 'Get Financial Help | Start a Fundraiser on HMSI',
  description: 'Need help with medical bills, school fees, or emergency housing in Nigeria or Africa? Submit your help request with a cover image to the HMSI community and receive support from caring people.',
  keywords: ['get financial help Nigeria', 'NGO Africa', 'need money for medical bills', 'school fees assistance Nigeria', 'emergency housing help', 'HMSI get help'],
  openGraph: {
    title: 'Get Financial Help | Start a Fundraiser on HMSI',
    description: 'Need help with medical bills, school fees, or emergency housing in Nigeria or Africa? Submit your help request to the HMSI community with a cover image.',
    url: 'https://www.hmsi.org.ng/fundraise/create',
  },
  alternates: {
    canonical: 'https://www.hmsi.org.ng/fundraise/create',
  },
  robots: { index: false, follow: false },
};

export default function CreateFundraiserPage() {
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
      {
        '@type': 'ListItem',
        'position': 3,
        'name': 'Get Help',
        'item': 'https://www.hmsi.org.ng/fundraise/create',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <CreateFundraiserContent />
    </>
  );
}
