import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DriveIntakeRouting from '../../../components/DriveIntakeRouting';
import { ADMIN_SESSION_COOKIE, getAdminEmailFromCookie } from '../../../lib/adminSession';

export const metadata: Metadata = { title: 'Drive Intake Routing | HMSI Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function IntakeRoutingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!getAdminEmailFromCookie(token ? `${ADMIN_SESSION_COOKIE}=${token}` : null)) redirect('/hmsi-control');
  return <DriveIntakeRouting />;
}

