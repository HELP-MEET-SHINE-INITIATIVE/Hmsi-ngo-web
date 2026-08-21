'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Calendar, Newspaper } from 'lucide-react';
import { useEffect, useState } from 'react';

type NewsArticle = { id: string; headline: string; summary: string; body: string; category: string; image_url: string | null; author_name: string; published_at: string | null; created_at: string };

export default function NewsPageContent() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/news', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'News is temporarily unavailable.');
        setArticles(result.articles || []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'News is temporarily unavailable.'))
      .finally(() => setIsLoading(false));
  }, []);

  return <main className="min-h-screen bg-[#f6f4ef] text-[#17221e]"><section className="bg-[#17221e] px-6 py-20 text-white sm:py-28"><div className="mx-auto max-w-7xl"><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#e1ad45]"><Newspaper size={15} aria-hidden="true" /> HMSI newsroom</p><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">News from the work, the people, and the communities.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">Read verified HMSI updates, field reports, community milestones, and opportunities to understand how local action is creating practical change.</p></div></section><section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">{isLoading ? <div className="rounded-3xl bg-white p-12 text-center text-[#66716a]">Loading HMSI news…</div> : error ? <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm text-red-700" role="alert">{error}</div> : articles.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-12 text-center text-[#66716a]">No published news yet. Check back soon for the latest HMSI updates.</div> : <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{articles.map((article, index) => <Link key={article.id} href={`/news/${article.id}`} className={`group overflow-hidden rounded-3xl border border-[#d9d6ce] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#1e5b49] hover:shadow-xl ${index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}><div className="relative h-56 overflow-hidden bg-[#17221e]">{article.image_url ? <Image src={article.image_url} alt={article.headline} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" /> : <Image src="/images/outreach-10.png" alt="HMSI field work" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />}<span className="absolute left-5 top-5 rounded-full bg-[#e1ad45] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#17221e]">{article.category}</span></div><div className="p-6 sm:p-7"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#66716a]"><Calendar size={13} aria-hidden="true" /> {new Date(article.published_at || article.created_at).toLocaleDateString('en-NG')}</div><h2 className="mt-3 text-2xl font-black leading-tight transition-colors group-hover:text-[#1e5b49] sm:text-3xl">{article.headline}</h2><p className="mt-3 text-sm leading-6 text-[#66716a]">{article.summary}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Read full news <ArrowRight size={15} aria-hidden="true" /></span></div></Link>)}</div>}</section></main>;
}
