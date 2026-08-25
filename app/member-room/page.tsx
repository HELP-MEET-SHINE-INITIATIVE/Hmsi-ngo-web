import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import RoleRoom from '../../components/RoleRoom';
import { getPortalIdentity } from '../../lib/portalAuth';

export const metadata: Metadata = { title: 'HMSI Member Lounge | HMSI', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function MemberRoomPage() {
  const cookie = (await cookies()).toString();
  const identity = await getPortalIdentity(new Request('https://www.hmsi.org.ng/member-room', { headers: { cookie } }));
  if (!identity || identity.role !== 'member') redirect('/login');
  return <RoleRoom role="member" />;
}
