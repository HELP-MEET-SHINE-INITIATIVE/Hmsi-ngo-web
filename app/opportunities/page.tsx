import type { Metadata } from 'next';
import OpportunitiesContent from './OpportunitiesContent';

export const metadata: Metadata = {
  title: 'Volunteer and Worker Opportunities | HMSI',
  description: 'Find open volunteer opportunities and worker positions with Help Meet Shine Initiative across Nigeria and Africa.',
};

export default function OpportunitiesPage() {
  return <OpportunitiesContent />;
}
