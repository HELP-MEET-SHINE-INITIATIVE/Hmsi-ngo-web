import type { Metadata } from 'next';
import VolunteerForm from './VolunteerForm';

export const metadata: Metadata = {
  title: 'Volunteer with an NGO in Nigeria | HMSI',
  description: 'Volunteer with Help Meet Shine Initiative (HMSI) and bring your skills, time, and local knowledge to community-led work across Nigeria and Africa.',
  openGraph: {
    title: 'Volunteer with an NGO in Nigeria | HMSI',
    description: 'Join the HMSI volunteer network and help transform lives through community-led work across Nigeria and Africa.',
    url: 'https://www.hmsi.org.ng/volunteer',
  },
  alternates: { canonical: 'https://www.hmsi.org.ng/volunteer' },
};

export default function VolunteerPage() {
  return <VolunteerForm />;
}
