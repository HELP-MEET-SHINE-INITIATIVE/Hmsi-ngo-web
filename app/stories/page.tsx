import type { Metadata } from 'next';
import FieldStoriesArchive from '../../components/FieldStoriesArchive';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'HMSI Field Stories | Community Impact Across Nigeria',
  description: 'Read approved field stories from Help Meet Shine Initiative teams, volunteers, and community partners across Nigeria and Africa.',
  keywords: ['HMSI field stories', 'NGO stories Nigeria', 'community impact stories', 'Help Meet Shine Initiative'],
  openGraph: {
    type: 'website',
    title: 'HMSI Field Stories | Stories That Move Us',
    description: 'Explore approved field stories from HMSI teams, volunteers, and community partners.',
    url: 'https://www.hmsi.org.ng/stories',
    siteName: 'Help Meet Shine Initiative',
    images: [{ url: 'https://www.hmsi.org.ng/images/outreach-10.png', alt: 'HMSI volunteers working with a community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HMSI Field Stories | Stories That Move Us',
    description: 'Explore approved field stories from HMSI teams, volunteers, and community partners.',
    images: ['https://www.hmsi.org.ng/images/outreach-10.png'],
  },
  alternates: { canonical: 'https://www.hmsi.org.ng/stories' },
};

export default function StoriesPage() {
  return <FieldStoriesArchive />;
}
