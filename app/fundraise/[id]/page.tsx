import type { Metadata, ResolvingMetadata } from 'next';
import FundraiserContent from './FundraiserContent';
import seedFundraisers from '../../../data/fundraisers/fundraisers.json';
import { getFundraiserById } from '../../../lib/fundraisers';

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

function absoluteImageUrl(image: string) {
  return image.startsWith('http') ? image : `https://www.hmsi.org.ng${image}`;
}

async function loadFundraiser(id: string) {
  try {
    return await getFundraiserById(id);
  } catch (error) {
    console.error('[FundraiserPage] Failed to load Supabase fundraiser:', error);
    return (seedFundraisers as Array<Record<string, unknown>>).find((fundraiser) => fundraiser.id === id) as any || null;
  }
}

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const id = (await params).id;
  const fundraiser = await loadFundraiser(id);

  if (!fundraiser) return { title: 'Fundraiser Not Found' };

  return {
    title: `${fundraiser.title} | Get Help on HMSI`,
    description: `Support this cause: ${fundraiser.description}. Help us raise ₦${Number(fundraiser.targetAmount).toLocaleString()} for ${fundraiser.category} needs in Nigeria and Africa.`,
    openGraph: {
      type: 'website',
      title: `${fundraiser.title} | HMSI Help Me`,
      description: fundraiser.description,
      siteName: 'Help Meet Shine Initiative',
      images: [{ url: absoluteImageUrl(fundraiser.image), alt: fundraiser.title }],
      url: `https://www.hmsi.org.ng/fundraise/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${fundraiser.title} | HMSI Help Me`,
      description: fundraiser.description,
      images: [absoluteImageUrl(fundraiser.image)],
    },
    alternates: { canonical: `https://www.hmsi.org.ng/fundraise/${id}` },
  };
}

export default async function FundraiserPage({ params }: Props) {
  const id = (await params).id;
  const fundraiser = await loadFundraiser(id);

  if (!fundraiser) return <FundraiserContent />;

  const image = absoluteImageUrl(fundraiser.image);
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.hmsi.org.ng' },
      { '@type': 'ListItem', position: 2, name: 'Fundraise', item: 'https://www.hmsi.org.ng/fundraise' },
      { '@type': 'ListItem', position: 3, name: fundraiser.title, item: `https://www.hmsi.org.ng/fundraise/${id}` },
    ],
  };
  const donateActionSchema = {
    '@context': 'https://schema.org',
    '@type': 'DonateAction',
    name: `Donate to ${fundraiser.title}`,
    description: fundraiser.description,
    image,
    recipient: { '@type': 'NGO', name: 'Help Meet Shine Initiative', url: 'https://www.hmsi.org.ng' },
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `https://www.hmsi.org.ng/fundraise/${id}`,
      actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'],
    },
  };
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: fundraiser.title,
    description: fundraiser.description,
    image,
    datePublished: fundraiser.createdAt,
    author: { '@type': 'Organization', name: 'HMSI' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(donateActionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <FundraiserContent />
    </>
  );
}
