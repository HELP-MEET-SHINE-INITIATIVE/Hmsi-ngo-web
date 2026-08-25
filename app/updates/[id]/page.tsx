import { redirect } from 'next/navigation';

export default async function UpdateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/stories/${encodeURIComponent(id)}`);
}
