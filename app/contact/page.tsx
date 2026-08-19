import type { Metadata } from 'next';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Help Meet Shine Initiative (HMSI). We are here to answer your questions and explore partnership opportunities.',
  openGraph: {
    title: 'Contact Us | HMSI',
    description: 'Get in touch with the Help Meet Shine Initiative (HMSI). We are here to answer your questions and explore partnership opportunities.',
    url: 'https://www.hmsi.org.ng/contact',
  },
};

export default function ContactPage() {
  return <ContactForm />;
}
