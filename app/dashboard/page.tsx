import type { Metadata } from 'next';
import DashboardContent from './DashboardContent';

export const metadata: Metadata = {
  title: 'Dashboard | HMSI Portal',
  description: 'Manage your HMSI projects, tasks, and community activities.',
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardContent />;
}
