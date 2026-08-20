import type { Metadata } from 'next';
import DonateForm from './DonateForm';

export const metadata: Metadata = {
  title: 'Donate to NGO Work in Nigeria | HMSI',
  description: 'Donate securely to Help Meet Shine Initiative (HMSI) and help fund humanitarian work, community support, and sustainable opportunity across Nigeria and Africa.',
  openGraph: {
    title: 'Donate to NGO Work in Nigeria | HMSI',
    description: 'Give securely to HMSI humanitarian work, community support, and opportunity across Nigeria and Africa.',
    url: 'https://www.hmsi.org.ng/donate',
  },
  alternates: { canonical: 'https://www.hmsi.org.ng/donate' },
};

export default function DonatePage() {
  return <DonateForm />;
}
