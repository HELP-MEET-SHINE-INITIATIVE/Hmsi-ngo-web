'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type PublishedStory = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image_url: string | null;
  author_name: string;
  published_at: string | null;
};

const ROTATION_MS = 2 * 60 * 1000;

export default function FieldStoryFlash() {
  const [stories, setStories] = useState<PublishedStory[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadStories = useCallback(async () => {
    try {
      const response = await fetch('/api/stories', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) return;
      setStories(result.stories || []);
    } catch {
      // The homepage stays available when the optional stories migration is unavailable.
    }
  }, []);

  useEffect(() => {
    loadStories();
    const refreshTimer = window.setInterval(loadStories, ROTATION_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadStories]);

  useEffect(() => {
    setActiveIndex((current) => stories.length === 0 ? 0 : current % stories.length);
    if (stories.length < 2) return;
    const rotationTimer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % stories.length);
    }, ROTATION_MS);
    return () => window.clearInterval(rotationTimer);
  }, [stories.length]);

  if (stories.length === 0) return null;

  const story = stories[activeIndex] || stories[0];
  return <section aria-label="Approved HMSI field story flash" className="border-y border-[#cbd2ca] bg-[#e9f0e9] text-[#17221e]"><div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><Link href={`/stories/${story.id}`} className="group flex min-w-0 items-center gap-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2"><div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#17221e] sm:block">{story.image_url ? <img src={story.image_url} alt="" className="h-full w-full object-cover" /> : <Image src="/images/outreach-10.png" alt="" fill sizes="96px" className="object-cover" />}</div><div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#b56b3b]"><BookOpen size={14} aria-hidden="true" /> Approved field story · <RotateCw size={12} aria-hidden="true" /> rotates every 2 minutes</p><p className="mt-1 truncate text-lg font-black sm:text-xl" aria-live="polite">{story.title}</p><p className="mt-1 line-clamp-2 text-sm text-[#66716a] lg:line-clamp-1">{story.excerpt}</p><p className="mt-2 text-xs font-bold text-[#66716a]">{story.category} · By {story.author_name}</p></div></Link><Link href="/#featured-stories" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#17221e] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#1e5b49] focus:outline-none focus:ring-2 focus:ring-[#17221e] focus:ring-offset-2 focus:ring-offset-[#e9f0e9]">Read field stories <ArrowRight size={15} aria-hidden="true" /></Link></div></section>;
}
