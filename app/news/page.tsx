import type { Metadata } from 'next';
import Footer from '../../components/Footer';
import NewsPageContent from '../../components/NewsPageContent';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'HMSI News and Community Updates | Nigeria NGO',
  description: 'Read Help-Meet Shine Initiative news, field updates, community milestones, and verified humanitarian stories from Nigeria and Africa.',
  keywords: ['HMSI news', 'Nigeria NGO news', 'humanitarian updates Nigeria', 'community development stories Africa', 'NGO field reports'],
  openGraph: { title: 'HMSI News and Community Updates', description: 'Verified HMSI updates, community milestones, and humanitarian news from Nigeria and Africa.', url: 'https://www.hmsi.org.ng/news' },
  alternates: { canonical: 'https://www.hmsi.org.ng/news' },
};

export default function NewsPage() {
  return <div className="min-h-screen bg-[#f6f4ef]"><NewsPageContent /><Footer /></div>;
}
