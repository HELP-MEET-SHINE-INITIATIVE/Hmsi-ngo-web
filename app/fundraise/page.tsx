import type { Metadata } from 'next';
import FundraiseContent from './FundraiseContent';

export const metadata: Metadata = {
  title: 'Help Me | Fundraising Platform',
  description: 'Directly support individual needs and community causes across Nigeria. Transparent, verified, and impactful.',
  openGraph: {
    title: 'Help Me | HMSI Fundraising Platform',
    description: 'Directly support individual needs and community causes across Nigeria. Transparent, verified, and impactful.',
    url: 'https://www.hmsi.org.ng/fundraise',
  },
};

export default function FundraisePage() {
  return <FundraiseContent />;
}
