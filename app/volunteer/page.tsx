import type { Metadata } from 'next';
import VolunteerForm from './VolunteerForm';

export const metadata: Metadata = {
  title: 'Join Us as a Volunteer',
  description: 'Become a force for good. Join the Help Meet Shine Initiative (HMSI) volunteer network and help transform lives across Nigeria.',
  openGraph: {
    title: 'Join Us as a Volunteer | HMSI',
    description: 'Become a force for good. Join the Help Meet Shine Initiative (HMSI) volunteer network and help transform lives across Nigeria.',
    url: 'https://www.hmsi.org.ng/volunteer',
  },
};

export default function VolunteerPage() {
  return <VolunteerForm />;
}
