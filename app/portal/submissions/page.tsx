import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import DriveSubmissionPortal from '../../../components/DriveSubmissionPortal';
import { getPortalIdentity } from '../../../lib/portalAuth';

export const metadata: Metadata = { title: 'Personal File Submissions | HMSI', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PortalSubmissionsPage() {
  const requestHeaders = await headers();
  const identity = await getPortalIdentity(new Request('https://www.hmsi.org.ng/portal/submissions', { headers: { cookie: requestHeaders.get('cookie') || '' } }));
  if (!identity) redirect('/login');
  return <DriveSubmissionPortal />;
}

