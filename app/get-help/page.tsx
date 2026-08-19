import type { Metadata } from 'next';
import CreateFundraiserContent from '../fundraise/create/CreateFundraiserContent';

export const metadata: Metadata = {
  title: 'Get Financial Help in Nigeria | HMSI',
  description: 'Post your problem and receive donations from caring Nigerians. HMSI helps with medical bills, education, and emergency needs.',
  alternates: {
    canonical: 'https://www.hmsi.org.ng/fundraise/create',
  },
};

export default function GetHelpPage() {
  return <CreateFundraiserContent />;
}
