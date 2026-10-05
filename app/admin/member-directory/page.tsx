import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import PeopleDirectory from '../../../components/PeopleDirectory';
import { ADMIN_SESSION_COOKIE, getAdminEmailFromCookie } from '../../../lib/adminSession';

export const metadata: Metadata = { title: 'Member Directory | HMSI Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function MemberDirectoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!getAdminEmailFromCookie(token ? `${ADMIN_SESSION_COOKIE}=${token}` : null)) redirect('/hmsi-control');
  return <PeopleDirectory title="Member directory" roleLabel="Members" endpoint="/api/admin/members" dataKey="members" description="Review approved HMSI members, including their verified contact details, location, active status, and onboarding record. Member task assignment and approval remain in the main admin workspace." />;
}
