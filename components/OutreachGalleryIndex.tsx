'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Story = { id: string; title: string; category: string; status: string; published_at: string | null; created_at: string };

export default function OutreachGalleryIndex() {
  const [stories, setStories] = useState<Story[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/stories', { cache: 'no-store' }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to load stories.'); setStories(result.stories || []); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load stories.')); }, []);
  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-12 text-[#17221e]"><div className="mx-auto max-w-6xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Private administration</p><h1 className="mt-2 text-4xl font-black">Outreach Gallery</h1><p className="mt-3 max-w-2xl leading-7 text-[#66716a]">Choose a field story to add, caption, prioritise, or remove its outreach photos.</p>{error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="mt-8 grid gap-4 md:grid-cols-2">{stories.map((story) => <Link key={story.id} href={`/admin/stories/${story.id}`} className="rounded-3xl border border-[#d9d6ce] bg-white p-6 transition hover:border-[#1e5b49]"><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">{story.category} · {story.status}</p><h2 className="mt-2 text-xl font-black">{story.title}</h2><p className="mt-4 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Manage gallery →</p></Link>)}</div></div></main>;
}
