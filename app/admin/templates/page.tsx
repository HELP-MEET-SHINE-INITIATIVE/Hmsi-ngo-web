import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LaunchTemplatesContent from '../../../components/LaunchTemplatesContent';
import { ADMIN_SESSION_COOKIE, getAdminEmailFromCookie } from '../../../lib/adminSession';

export const metadata: Metadata = { title: 'Launch Templates | HMSI Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!getAdminEmailFromCookie(token ? `${ADMIN_SESSION_COOKIE}=${token}` : null)) redirect('/hmsi-control');
  return <LaunchTemplatesContent />;
}
