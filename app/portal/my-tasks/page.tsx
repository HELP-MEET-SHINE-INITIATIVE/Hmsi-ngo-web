import type { Metadata } from 'next';
import PortalTasksContent from './PortalTasksContent';

export const metadata: Metadata = { title: 'My Tasks | HMSI Portal', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function PortalMyTasksPage() {
  return <PortalTasksContent />;
}
