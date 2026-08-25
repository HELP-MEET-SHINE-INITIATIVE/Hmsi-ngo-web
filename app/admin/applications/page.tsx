import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import ApplicationArchiveManager from '../../../components/ApplicationArchiveManager';
import { ADMIN_SESSION_COOKIE, getAdminEmailFromCookie } from '../../../lib/adminSession';

export const metadata: Metadata = { title: 'Application Inbox | HMSI Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!getAdminEmailFromCookie(token ? `${ADMIN_SESSION_COOKIE}=${token}` : null)) redirect('/hmsi-control');
  return <ApplicationArchiveManager />;
}
