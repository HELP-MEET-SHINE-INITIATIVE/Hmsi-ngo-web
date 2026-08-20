import type { Metadata } from 'next';
import FeaturedStoryContent from '../../../components/FeaturedStoryContent';

export const metadata: Metadata = {
  title: 'HMSI Field Story',
  description: 'Read an approved field story from Help Meet Shine Initiative communities.',
};

export default function FeaturedStoryPage() {
  return <FeaturedStoryContent />;
}
