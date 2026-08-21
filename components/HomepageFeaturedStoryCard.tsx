'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type HomepageStory = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image_url: string | null;
  author_name: string;
  published_at: string | null;
  created_at?: string;
};

const ROTATION_MS = 2 * 60 * 1000;
const REFRESH_MS = 30 * 1000;
const fallbackStory: HomepageStory = {
  id: '10',
  title: 'When a community leads, relief becomes resilience.',
  excerpt: 'From urgent essentials to skills that last, our teams work alongside local leaders to build the next chapter together.',
  category: 'Featured story',
  image_url: '/images/outreach-10.png',
  author_name: 'HMSI field team',
  published_at: null,
};

function newestFirst(items: HomepageStory[]) {
  return [...items].sort((first, second) => new Date(second.published_at || second.created_at || 0).getTime() - new Date(first.published_at || first.created_at || 0).getTime());
}

export default function HomepageFeaturedStoryCard() {
  const [stories, setStories] = useState<HomepageStory[]>([fallbackStory]);
  const [activeIndex, setActiveIndex] = useState(0);
  const storyIdsRef = useRef<string[]>([]);

  const loadStories = useCallback(async () => {
    try {
      const response = await fetch('/api/stories', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.stories) || result.stories.length === 0) return;
      const nextStories = newestFirst(result.stories);
      const newStoryArrived = nextStories.some((story) => !storyIdsRef.current.includes(story.id));
      storyIdsRef.current = nextStories.map((story) => story.id);
      setStories(nextStories);
      if (newStoryArrived) setActiveIndex(0);
    } catch {
      // Keep the editorial fallback visible if the optional stories service is unavailable.
    }
  }, []);

  useEffect(() => {
    loadStories();
    const refreshTimer = window.setInterval(loadStories, REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadStories]);

  useEffect(() => {
    setActiveIndex((current) => stories.length === 0 ? 0 : current % stories.length);
    if (stories.length < 2) return;
    const rotationTimer = window.setInterval(() => setActiveIndex((current) => (current + 1) % stories.length), ROTATION_MS);
    return () => window.clearInterval(rotationTimer);
  }, [stories.length]);

  const story = stories[activeIndex] || fallbackStory;
  const image = story.image_url || '/images/outreach-10.png';
  const isFallback = story.id === fallbackStory.id && storyIdsRef.current.length === 0;
  const storyHref = isFallback ? '/outreach/10' : `/stories/${story.id}`;

  return <Link id="featured-stories" href={storyHref} aria-label={`Read full featured story: ${story.title}`} className="group relative block min-h-[520px] scroll-mt-24 overflow-hidden rounded-3xl bg-[#17221e] text-white focus:outline-none focus:ring-2 focus:ring-[#e1ad45] focus:ring-offset-4 focus:ring-offset-white"><img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-[#17221e] via-[#17221e]/45 to-transparent" aria-hidden="true" /><span className="absolute inset-x-0 bottom-0 z-10 block p-7 sm:p-10"><span className="inline-block rounded-full bg-[#e1ad45] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#17221e]">Featured story</span><span className="mt-4 block text-[10px] font-black uppercase tracking-[0.18em] text-white/65">{story.category}</span><span className="mt-3 block max-w-2xl text-3xl font-black leading-tight tracking-[-0.03em] sm:text-5xl">{story.title}</span><span className="mt-4 block max-w-xl text-sm leading-6 text-white/75">{story.excerpt}</span><span className="mt-5 inline-flex text-xs font-black uppercase tracking-widest text-[#e1ad45]">Read full story <span className="ml-2" aria-hidden="true">→</span></span></span></Link>;
}
