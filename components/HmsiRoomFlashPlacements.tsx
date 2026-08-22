'use client';

import Link from 'next/link';
import { ArrowRight, BellRing, CircleDollarSign, Megaphone, Newspaper, Radio } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Placement = { id: string; label: string; title: string; description: string; href: string; external?: boolean; tone: 'green' | 'gold' | 'rust' };

const REFRESH_MS = 45_000;
const ROTATION_MS = 12_000;

async function readJson(path: string) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) return {};
  return response.json();
}

export default function HmsiRoomFlashPlacements() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(async () => {
    const [sponsorResult, fundraiserResult, newsResult, storyResult] = await Promise.all([
      readJson('/api/sponsorships'),
      readJson('/api/fundraisers'),
      readJson('/api/news'),
      readJson('/api/stories'),
    ]);
    const sponsors: Placement[] = (sponsorResult.sponsorships || []).map((item: any) => ({ id: `sponsor-${item.id}`, label: `Paid sponsor placement · ${item.organisation_name || 'Partner'}`, title: item.title, description: item.description, href: item.target_url, external: true, tone: 'gold' }));
    const fundraisers: Placement[] = (fundraiserResult.fundraisers || []).map((item: any) => ({ id: `fundraiser-${item.id}`, label: 'Approved HMSI fundraising campaign', title: item.title, description: item.description, href: `/fundraise/${item.id}`, tone: 'green' }));
    const news: Placement[] = (newsResult.articles || []).slice(0, 8).map((item: any) => ({ id: `news-${item.id}`, label: `Published HMSI news · ${item.category || 'News'}`, title: item.headline, description: item.summary, href: `/news/${item.id}`, tone: 'rust' }));
    const stories: Placement[] = (storyResult.stories || []).slice(0, 8).map((item: any) => ({ id: `story-${item.id}`, label: `Published HMSI field update · ${item.category || 'Field update'}`, title: item.title, description: item.excerpt, href: `/stories/${item.id}`, tone: 'rust' }));
    setPlacements([...sponsors, ...fundraisers, ...news, ...stories]);
  }, []);

  useEffect(() => { load().catch(() => undefined); const timer = window.setInterval(() => { load().catch(() => undefined); }, REFRESH_MS); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => { setActiveIndex((current) => placements.length ? current % placements.length : 0); if (placements.length < 2) return; const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % placements.length), ROTATION_MS); return () => window.clearInterval(timer); }, [placements.length]);

  if (!placements.length) return null;
  const item = placements[activeIndex] || placements[0];
  const Icon = item.label.startsWith('Paid sponsor') ? Megaphone : item.label.startsWith('Approved HMSI fundraising') ? CircleDollarSign : item.label.startsWith('Published HMSI news') ? Newspaper : Radio;
  const tone = item.tone === 'gold' ? 'bg-[#7a5b16]' : item.tone === 'rust' ? 'bg-[#b56b3b]' : 'bg-[#1e5b49]';
  const content = <><div className="flex min-w-0 items-start gap-3"><div className="mt-1 shrink-0 rounded-full bg-white/15 p-2"><Icon size={16} aria-hidden="true" /></div><div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/75"><BellRing size={12} aria-hidden="true" /> {item.label} · rotating flash</p><p className="mt-1 truncate text-base font-black sm:text-lg" aria-live="polite">{item.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-white/80 sm:text-sm">{item.description}</p></div></div><span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#17221e]">View <ArrowRight size={14} /></span></>;
  return <section aria-label="HMSI approved room flash placements" className={`${tone} text-white`}><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">{item.external ? <a href={item.href} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-[#e1ad45]">{content}</a> : <Link href={item.href} className="flex min-w-0 flex-1 items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-[#e1ad45]">{content}</Link>}</div></section>;
}
