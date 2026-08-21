'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Calendar, RefreshCw } from 'lucide-react';
import Footer from './Footer';

type FieldStory = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image_url: string | null;
  author_name: string;
  published_at: string | null;
  created_at: string;
};

function newestFirst(items: FieldStory[]) {
  return [...items].sort((first, second) => new Date(second.published_at || second.created_at).getTime() - new Date(first.published_at || first.created_at).getTime());
}

export default function FieldStoriesArchive() {
  const [stories, setStories] = useState<FieldStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStories = useCallback(async () => {
    try {
      const response = await fetch('/api/stories', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Stories are temporarily unavailable.');
      setStories(newestFirst(Array.isArray(result.stories) ? result.stories : []));
      setLastUpdated(new Date());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Stories are temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
    const refreshTimer = window.setInterval(loadStories, 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [loadStories]);

  return <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]"><main><section className="border-b border-[#d9d6ce] bg-white px-5 py-16 sm:px-8 sm:py-24 lg:px-12"><div className="mx-auto max-w-[1440px]"><Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-[#66716a] transition hover:text-[#1e5b49]">Back to homepage <ArrowRight size={16} /></Link><div className="mt-12 max-w-4xl"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#b56b3b]">The HMSI field desk</p><h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl">Stories that move us.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[#66716a]">Explore every approved field story from HMSI teams, volunteers, and community partners. New stories are added here as soon as they are approved.</p><div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-[#66716a]"><span className="inline-flex items-center gap-2 rounded-full bg-[#e9f0e9] px-4 py-2 text-[#1e5b49]"><BookOpen size={15} /> {stories.length} approved {stories.length === 1 ? 'story' : 'stories'}</span>{lastUpdated && <span className="inline-flex items-center gap-2"><RefreshCw size={14} /> Updated {lastUpdated.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>}</div></div></div></section><section className="px-5 py-12 sm:px-8 sm:py-20 lg:px-12"><div className="mx-auto max-w-[1440px]">{isLoading ? <div className="grid gap-6 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-[32px] bg-white" /><div className="h-80 animate-pulse rounded-[32px] bg-white" /></div> : error ? <div className="rounded-[32px] border border-red-100 bg-red-50 p-8 text-sm text-red-700" role="alert">{error}<button type="button" onClick={loadStories} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#17221e] px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Try again <RefreshCw size={14} /></button></div> : stories.length === 0 ? <div className="rounded-[32px] border border-dashed border-[#cbd2ca] bg-white p-12 text-center"><BookOpen className="mx-auto text-[#b56b3b]" size={34} /><h2 className="mt-5 text-2xl font-black">No approved stories yet</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#66716a]">Approved HMSI field stories will appear here. Please check back soon.</p></div> : <div className="grid gap-6 lg:grid-cols-2">{stories.map((story) => <Link key={story.id} href={`/stories/${story.id}`} className="group overflow-hidden rounded-[32px] border border-[#d9d6ce] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#1e5b49] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-4"><div className="relative h-64 overflow-hidden bg-[#17221e]">{story.image_url ? <img src={story.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-white/80"><BookOpen size={42} /></div>}<div className="absolute inset-0 bg-gradient-to-t from-[#17221e]/70 to-transparent" /><span className="absolute bottom-5 left-5 rounded-full bg-[#e1ad45] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#17221e]">Approved field story</span></div><div className="p-7 sm:p-8"><div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#b56b3b]"><span>{story.category}</span><span className="h-1 w-1 rounded-full bg-[#b56b3b]/50" aria-hidden="true" /><span className="inline-flex items-center gap-1 text-[#66716a]"><Calendar size={12} /> {new Date(story.published_at || story.created_at).toLocaleDateString('en-NG')}</span></div><h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.03em] transition-colors group-hover:text-[#1e5b49] sm:text-3xl">{story.title}</h2><p className="mt-4 line-clamp-3 text-sm leading-7 text-[#66716a]">{story.excerpt}</p><div className="mt-6 flex items-center justify-between border-t border-[#f6f4ef] pt-5"><span className="text-xs font-bold uppercase tracking-widest text-[#66716a]">By {story.author_name}</span><span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Read full story <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span></div></div></Link>)}</div>}</div></section></main><Footer /></div>;
}
