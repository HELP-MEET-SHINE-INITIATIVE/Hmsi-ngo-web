import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPortalIdentity } from '../../lib/portalAuth';

export const dynamic = 'force-dynamic';

const destination = {
  worker: '/portal/worker',
  volunteer: '/portal/volunteer',
  member: '/portal/member',
} as const;

export default async function PortalEntryPage() {
  const cookie = (await cookies()).toString();
  const identity = await getPortalIdentity(new Request('https://www.hmsi.org.ng/portal', { headers: { cookie } }));
  if (!identity) redirect('/login');
  redirect(destination[identity.role]);
}
