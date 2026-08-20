import type { Metadata } from 'next';
import OpportunitiesContent from './OpportunitiesContent';

export const metadata: Metadata = {
  title: 'NGO Volunteer and Worker Opportunities in Nigeria | HMSI',
  description: 'Find volunteer opportunities, worker positions, and practical ways to contribute to Help Meet Shine Initiative across Nigeria and Africa.',
  openGraph: {
    title: 'NGO Volunteer and Worker Opportunities in Nigeria | HMSI',
    description: 'Find practical ways to volunteer, work, and contribute to HMSI community-led action across Nigeria and Africa.',
    url: 'https://www.hmsi.org.ng/opportunities',
  },
  alternates: { canonical: 'https://www.hmsi.org.ng/opportunities' },
};

export default function OpportunitiesPage() {
  return <OpportunitiesContent />;
}
