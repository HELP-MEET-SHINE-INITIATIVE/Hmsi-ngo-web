import type { Metadata } from 'next';
import DashboardContent from '../dashboard/DashboardContent';

export const metadata: Metadata = {
  title: 'Worker Dashboard | HMSI',
  description: 'HMSI worker coordination dashboard for assignments, opportunities, and worker collaboration.',
};

export default function WorkerDashboardPage() {
  return <DashboardContent />;
}
