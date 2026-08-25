import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PortalTasksContent from '../my-tasks/PortalTasksContent';
import { getPortalIdentity } from '../../../lib/portalAuth';

export const dynamic = 'force-dynamic';

export default async function VolunteerPortalPage() {
  const cookie = (await cookies()).toString();
  const identity = await getPortalIdentity(new Request('https://www.hmsi.org.ng/portal/volunteer', { headers: { cookie } }));
  if (!identity) redirect('/login');
  if (identity.role !== 'volunteer') redirect('/portal');
  return <PortalTasksContent expectedRole="volunteer" />;
}
