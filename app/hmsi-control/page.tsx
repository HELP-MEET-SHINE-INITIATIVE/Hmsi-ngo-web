import type { Metadata } from 'next';
import AdminControlContent from './AdminControlContent';

export const metadata: Metadata = {
  title: 'Private Admin Control',
  description: 'Private HMSI administration workspace.',
  robots: { index: false, follow: false },
};

export default function HmsiControlPage() {
  return <AdminControlContent />;
}
