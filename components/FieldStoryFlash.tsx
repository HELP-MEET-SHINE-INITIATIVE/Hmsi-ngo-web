'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type PublishedStory = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
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
  return <section aria-label="Approved HMSI field story flash" className="border-y border-[#cbd2ca] bg-[#e9f0e9] text-[#17221e]"><div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12"><div className="flex flex-col gap-6"><Link href={`/stories/${story.id}`} className="group block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2 focus:ring-offset-[#e9f0e9]"><p className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]"><BookOpen size={22} aria-hidden="true" /> Approved field story <span className="inline-flex items-center gap-2"><RotateCw size={17} aria-hidden="true" /> rotates every 2 minutes</span></p><h2 className="mt-5 max-w-5xl truncate text-3xl font-black tracking-[-0.04em] sm:text-5xl">{story.title}</h2><p className="mt-4 max-w-5xl line-clamp-2 text-lg leading-8 text-[#66716a] sm:text-2xl">{story.excerpt}</p><p className="mt-6 text-base font-bold text-[#66716a]">{story.category} · By {story.author_name}</p></Link><Link href={`/stories/${story.id}`} className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#17221e] px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#1e5b49] focus:outline-none focus:ring-2 focus:ring-[#17221e] focus:ring-offset-2 focus:ring-offset-[#e9f0e9] sm:max-w-[420px]">Read full story <ArrowRight size={21} aria-hidden="true" /></Link></div></div></section>;
}
