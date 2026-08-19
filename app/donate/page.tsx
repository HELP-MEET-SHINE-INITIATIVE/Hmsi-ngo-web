import type { Metadata } from 'next';
import DonateForm from './DonateForm';

export const metadata: Metadata = {
  title: 'Support Our Mission',
  description: 'Make room for possibility. Your gift helps HMSI respond to urgent needs and support local solutions across Nigeria.',
  openGraph: {
    title: 'Support Our Mission | HMSI',
    description: 'Make room for possibility. Your gift helps HMSI respond to urgent needs and support local solutions across Nigeria.',
    url: 'https://www.hmsi.org.ng/donate',
  },
};

export default function DonatePage() {
  return <DonateForm />;
}
