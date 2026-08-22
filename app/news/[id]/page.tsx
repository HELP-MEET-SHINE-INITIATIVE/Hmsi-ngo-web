import type { Metadata } from 'next';
import Footer from '../../../components/Footer';
import NewsArticleContent from '../../../components/NewsArticleContent';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'HMSI News Update | Help-Meet Shine Initiative',
    description: 'Read a published humanitarian or community update from Help-Meet Shine Initiative.',
    alternates: { canonical: `https://www.hmsi.org.ng/news/${id}` },
  };
}

export default function NewsArticlePage() {
  return <div className="min-h-screen bg-[#f6f4ef]"><NewsArticleContent /><Footer /></div>;
}
