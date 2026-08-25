import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import RoleRoom from '../../components/RoleRoom';
import { getPortalIdentity } from '../../lib/portalAuth';

export const metadata: Metadata = {
  title: 'Worker Operations & Daily Activities | HMSI',
  description: 'Restricted operations room for active HMSI workers.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function WorkerRoomPage() {
  const cookie = (await cookies()).toString();
  const identity = await getPortalIdentity(new Request('https://www.hmsi.org.ng/worker-room', { headers: { cookie } }));
  if (!identity || identity.role !== 'worker') redirect('/login');
  return <RoleRoom role="worker" />;
}
