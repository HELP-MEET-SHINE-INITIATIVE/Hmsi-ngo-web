import type { Metadata, ResolvingMetadata } from 'next';
import FundraiserContent from './FundraiserContent';
import fundraisersData from '../../../data/fundraisers/fundraisers.json';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = (await params).id;
  const fundraiser = fundraisersData.find((f: any) => f.id === id);

  if (!fundraiser) {
    return {
      title: 'Fundraiser Not Found',
    };
  }

  return {
    title: fundraiser.title,
    description: fundraiser.description,
    openGraph: {
      title: `${fundraiser.title} | HMSI Help Me`,
      description: fundraiser.description,
      images: [fundraiser.image],
      url: `https://www.hmsi.org.ng/fundraise/${id}`,
    },
  };
}

export default async function FundraiserPage({ params }: Props) {
  const id = (await params).id;
  const fundraiser = fundraisersData.find((f: any) => f.id === id);

  const jsonLd = fundraiser ? {
    '@context': 'https://schema.org',
    '@type': 'DonateAction',
    'name': fundraiser.title,
    'description': fundraiser.description,
    'image': fundraiser.image,
    'recipient': {
      '@type': 'NGO',
      'name': 'Help Meet Shine Initiative',
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <FundraiserContent />
    </>
  );
}
