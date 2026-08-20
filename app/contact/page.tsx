import type { Metadata } from 'next';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact Help Meet Shine Initiative (HMSI) in Nigeria and across Africa. Email support@hmsi.org.ng for questions, support, and partnership opportunities.',
  openGraph: {
    title: 'Contact Us | HMSI',
    description: 'Contact Help Meet Shine Initiative (HMSI) in Nigeria and across Africa. Email support@hmsi.org.ng for questions, support, and partnership opportunities.',
    url: 'https://www.hmsi.org.ng/contact',
  },
};

export default function ContactPage() {
  return <ContactForm />;
}
