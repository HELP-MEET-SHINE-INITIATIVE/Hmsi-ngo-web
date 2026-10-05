import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import PeopleDirectory from '../../../components/PeopleDirectory';
import { ADMIN_SESSION_COOKIE, getAdminEmailFromCookie } from '../../../lib/adminSession';

export const metadata: Metadata = { title: 'Volunteer Directory | HMSI Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function VolunteerDirectoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!getAdminEmailFromCookie(token ? `${ADMIN_SESSION_COOKIE}=${token}` : null)) redirect('/hmsi-control');
  return <PeopleDirectory title="Volunteer directory" roleLabel="Volunteers" endpoint="/api/admin/volunteers" dataKey="volunteers" description="Review approved active volunteers, their contact details, location, onboarding state, and moderated publishing pathway before issuing work through the protected assignment workflow." />;
}
