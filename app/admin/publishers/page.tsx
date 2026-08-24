import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PublisherRoleManager from '../../../components/PublisherRoleManager';
import { ADMIN_SESSION_COOKIE, getAdminEmailFromCookie } from '../../../lib/adminSession';

export const metadata: Metadata = { title: 'Publisher Pathways | HMSI Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PublisherRolesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!getAdminEmailFromCookie(token ? `${ADMIN_SESSION_COOKIE}=${token}` : null)) redirect('/hmsi-control');
  return <PublisherRoleManager />;
}
