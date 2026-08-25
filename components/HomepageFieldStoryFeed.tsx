'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { trackStoryClick } from '../lib/storyAnalytics';

type Story = { id: string; title: string; excerpt: string; category: string; image_url: string | null; published_at: string | null; created_at: string };

export default function HomepageFieldStoryFeed() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/stories?limit=3', { cache: 'no-store' });
        const result = await response.json();
        if (active && response.ok && Array.isArray(result.stories)) setStories(result.stories.slice(0, 3));
      } catch {
        // The feed has an explicit empty state rather than a fabricated fallback story.
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  if (isLoading) return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1" aria-label="Loading field stories"><div className="h-44 animate-pulse rounded-3xl bg-[#f6f4ef]" /><div className="h-44 animate-pulse rounded-3xl bg-[#f6f4ef]" /></div>;
  if (!stories.length) return <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-[#f6f4ef] p-7 text-sm leading-6 text-[#66716a]">Approved field stories will appear here when HMSI editors publish them. <Link href="/stories" className="font-black text-[#1e5b49]">Explore the field-story archive</Link>.</div>;

  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
    {stories.map((story) => {
      const href = `/stories/${story.id}`;
      return <Link key={story.id} href={href} onClick={() => trackStoryClick(href)} className="group grid grid-cols-[0.8fr_1.2fr] gap-4 rounded-3xl border border-[#deded7] bg-[#f6f4ef] p-3 transition hover:-translate-y-1 hover:border-[#1e5b49] sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative min-h-[145px] overflow-hidden rounded-2xl bg-[#17221e]">
          <Image src={story.image_url || '/images/outreach-10.png'} alt={story.title} fill sizes="(max-width: 1024px) 45vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div className="flex flex-col py-2 pr-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#b56b3b]">{story.category}</span>
          <h4 className="mt-2 text-sm font-black leading-tight group-hover:text-[#1e5b49]">{story.title}</h4>
          <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#66716a]"><Calendar size={11} /> {new Date(story.published_at || story.created_at).toLocaleDateString('en-NG')}</p>
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[#66716a]">{story.excerpt}</p>
        </div>
      </Link>;
    })}
  </div>;
}
