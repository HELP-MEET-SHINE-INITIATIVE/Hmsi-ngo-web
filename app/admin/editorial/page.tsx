import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EditorialWorkspace from '../../../components/EditorialWorkspace';
import { ADMIN_SESSION_COOKIE, getAdminEmailFromCookie } from '../../../lib/adminSession';

export const metadata: Metadata = { title: 'Editorial Queue | HMSI Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditorialPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const reviewerEmail = getAdminEmailFromCookie(token ? `${ADMIN_SESSION_COOKIE}=${token}` : null);
  if (!reviewerEmail) redirect('/hmsi-control');
  return <EditorialWorkspace view="editorial" reviewerEmail={reviewerEmail} />;
}

