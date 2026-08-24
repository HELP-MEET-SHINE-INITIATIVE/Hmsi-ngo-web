import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import NewsSubmissionPortal from '../../../components/NewsSubmissionPortal';
import { getPortalIdentity } from '../../../lib/portalAuth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Submit News | HMSI Portal', robots: { index: false, follow: false } };

export default async function SubmitNewsPage() {
  const requestHeaders = await headers();
  const identity = await getPortalIdentity(new Request('https://www.hmsi.org.ng/portal/submit-news', { headers: { cookie: requestHeaders.get('cookie') || '' } }));
  if (!identity) redirect('/login');
  return <NewsSubmissionPortal name={identity.name} publisherRole={identity.publisherRole} />;
}
