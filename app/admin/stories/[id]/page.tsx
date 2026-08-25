import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import OutreachGalleryManager from '../../../../components/OutreachGalleryManager';
import { ADMIN_SESSION_COOKIE, getAdminEmailFromCookie } from '../../../../lib/adminSession';

export const metadata: Metadata = { title: 'Story Gallery | HMSI Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function StoryGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!getAdminEmailFromCookie(token ? `${ADMIN_SESSION_COOKIE}=${token}` : null)) redirect('/hmsi-control');
  const { id } = await params;
  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-12"><div className="mx-auto max-w-6xl"><OutreachGalleryManager storyId={id} /></div></main>;
}
