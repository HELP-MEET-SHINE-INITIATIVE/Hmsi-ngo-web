import type { Metadata } from 'next';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Partner with an NGO in Nigeria | Contact HMSI',
  description: 'Contact Help Meet Shine Initiative (HMSI) for NGO partnerships, support, volunteering, and general enquiries across Nigeria and Africa.',
  openGraph: {
    title: 'Partner with an NGO in Nigeria | Contact HMSI',
    description: 'Contact HMSI for NGO partnerships, support, volunteering, and general enquiries across Nigeria and Africa.',
    url: 'https://www.hmsi.org.ng/contact',
  },
  alternates: { canonical: 'https://www.hmsi.org.ng/contact' },
};

export default function ContactPage() {
  return <ContactForm />;
}
