import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import RoleRoom from '../../components/RoleRoom';
import { getPortalIdentity } from '../../lib/portalAuth';

export const metadata: Metadata = {
  title: 'Volunteer Community Room | HMSI',
  description: 'Restricted collaboration room for active HMSI volunteers.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function VolunteerRoomPage() {
  const cookie = (await cookies()).toString();
  const identity = await getPortalIdentity(new Request('https://www.hmsi.org.ng/volunteer-room', { headers: { cookie } }));
  if (!identity || identity.role !== 'volunteer') redirect('/login');
  return <RoleRoom role="volunteer" />;
}
