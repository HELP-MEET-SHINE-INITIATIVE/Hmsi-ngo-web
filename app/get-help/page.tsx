import type { Metadata } from 'next';
import CreateFundraiserContent from '../fundraise/create/CreateFundraiserContent';

export const metadata: Metadata = {
  title: 'Get Help from an NGO in Nigeria | HMSI',
  description: 'Request support for medical bills, education, housing, or an urgent need through Help Meet Shine Initiative (HMSI) in Nigeria.',
  openGraph: {
    title: 'Get Help from an NGO in Nigeria | HMSI',
    description: 'Share your need with HMSI and learn how to request support for medical, education, housing, and emergency needs.',
    url: 'https://www.hmsi.org.ng/get-help',
  },
  alternates: {
    canonical: 'https://www.hmsi.org.ng/get-help',
  },
};

export default function GetHelpPage() {
  return <CreateFundraiserContent mode="help" />;
}
