'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
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
  return <section aria-label="Approved HMSI field story flash" className="border-y border-[#cbd2ca] bg-[#e9f0e9] px-4 py-5 text-[#17221e] sm:px-6 sm:py-8 lg:px-10"><Link href={`/stories/${story.id}`} className="group mx-auto block max-w-[1440px] rounded-[28px] border border-[#cbd2ca] bg-white/55 px-6 py-7 shadow-[0_14px_40px_rgba(23,34,30,0.08)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_48px_rgba(23,34,30,0.12)] focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-4 focus:ring-offset-[#e9f0e9] sm:rounded-[36px] sm:px-10 sm:py-9 lg:px-14 lg:py-11"><div className="flex items-start gap-4 sm:gap-5"><span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f7eadf] text-[#b56b3b] shadow-sm sm:h-14 sm:w-14"><BookOpen size={24} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-2"><p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#b56b3b]">Approved field story</p><span className="h-1 w-1 rounded-full bg-[#b56b3b]/50" aria-hidden="true" /><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#66716a]">{story.category}</p></div><h2 className="mt-4 max-w-5xl text-3xl font-black leading-[1.04] tracking-[-0.045em] transition-colors group-hover:text-[#1e5b49] sm:text-5xl lg:text-6xl">{story.title}</h2><p className="mt-4 max-w-4xl line-clamp-3 text-base leading-7 text-[#66716a] sm:text-xl sm:leading-8">{story.excerpt}</p><div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#d9d6ce] pt-5 text-xs font-black uppercase tracking-[0.14em] text-[#66716a]"><span>By {story.author_name}</span><span className="hidden h-1 w-1 rounded-full bg-[#66716a]/50 sm:block" aria-hidden="true" /><span className="text-[#1e5b49]">Read the full story</span></div></div></div></Link></section>;
}
