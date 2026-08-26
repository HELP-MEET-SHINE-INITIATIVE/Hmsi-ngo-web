'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Newspaper, Radio } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type NewsHeadline = { id: string; headline: string; summary: string; category: string; image_url: string | null; published_at: string | null; created_at: string };
const REFRESH_MS = 60 * 1000;

export default function NewsFlash() {
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);

  const loadNews = useCallback(async () => {
    try {
      const response = await fetch('/api/news?limit=1', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) return;
      setHeadlines(result.articles || []);
    } catch {
      // The homepage stays quiet when the optional newsroom migration is not installed.
    }
  }, []);

  useEffect(() => {
    loadNews();
    const refreshTimer = window.setInterval(loadNews, REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadNews]);

  if (headlines.length === 0) return null;
  const activeArticle = headlines[0];

  return <section aria-label="Latest HMSI news" className="relative isolate overflow-hidden border-y border-[#b56b3b]/30 bg-[#b56b3b] text-white">{activeArticle.image_url && <><Image src={activeArticle.image_url} alt="" fill sizes="100vw" className="-z-20 object-cover" /><div className="absolute inset-0 -z-10 bg-[#17221e]/80" /></>}<div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div className="flex min-w-0 items-start gap-4"><div className="mt-1 flex shrink-0 items-center gap-2 rounded-full bg-[#17221e]/90 px-3 py-2 text-[10px] font-black uppercase tracking-widest"><Radio size={14} className="animate-pulse text-[#e1ad45]" aria-hidden="true" /> Live news</div><div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/75"><Newspaper size={13} aria-hidden="true" /> {activeArticle.category} · latest published update</p><p className="mt-1 truncate text-lg font-black sm:text-xl" aria-live="polite">{activeArticle.headline}</p><p className="mt-1 line-clamp-2 text-sm text-white/80 lg:line-clamp-1">{activeArticle.summary}</p></div></div><Link href={`/news/${activeArticle.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-[#17221e] transition hover:bg-[#e9f0e9] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#b56b3b]">Read news <ArrowRight size={15} aria-hidden="true" /></Link></div></section>;
}
