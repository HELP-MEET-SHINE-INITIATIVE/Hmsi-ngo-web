import type { Metadata } from 'next';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact Help Meet Shine Initiative (HMSI) in Nigeria and across Africa. Email support@hmsi.org.ng for support or contact@hmsi.org.ng for general enquiries and partnerships.',
  openGraph: {
    title: 'Contact Us | HMSI',
    description: 'Contact Help Meet Shine Initiative (HMSI) in Nigeria and across Africa. Email support@hmsi.org.ng for support or contact@hmsi.org.ng for general enquiries and partnerships.',
    url: 'https://www.hmsi.org.ng/contact',
  },
};

export default function ContactPage() {
  return <ContactForm />;
}
