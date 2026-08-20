'use client';

import Link from 'next/link';
import { ArrowRight, CircleDollarSign } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type PublicFundraiser = {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  raisedAmount: number;
  donorCount?: number;
};

const ROTATION_MS = 2 * 60 * 1000;
const LIVE_REFRESH_MS = 30 * 1000;

function emergencyFirst(items: PublicFundraiser[]) {
  return [...items].sort((first, second) => {
    const firstIsEmergency = first.category.toLowerCase() === 'emergency';
    const secondIsEmergency = second.category.toLowerCase() === 'emergency';
    if (firstIsEmergency !== secondIsEmergency) return firstIsEmergency ? -1 : 1;
    return 0;
  });
}

export default function FundraiserFlash() {
  const [fundraisers, setFundraisers] = useState<PublicFundraiser[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadFundraisers = useCallback(async () => {
    try {
      const response = await fetch('/api/fundraisers', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) return;
      setFundraisers(emergencyFirst(result.fundraisers || []));
    } catch {
      // The homepage remains available when the fundraiser service is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    loadFundraisers();
    const refreshTimer = window.setInterval(loadFundraisers, LIVE_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadFundraisers]);

  useEffect(() => {
    setActiveIndex((current) => fundraisers.length === 0 ? 0 : current % fundraisers.length);
    if (fundraisers.length < 2) return;
    const rotationTimer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % fundraisers.length);
    }, ROTATION_MS);
    return () => window.clearInterval(rotationTimer);
  }, [fundraisers.length]);

  if (fundraisers.length === 0) return null;

  const fundraiser = fundraisers[activeIndex] || fundraisers[0];
  const progress = fundraiser.targetAmount > 0 ? Math.min(100, Math.round((fundraiser.raisedAmount / fundraiser.targetAmount) * 100)) : 0;

  return <section aria-label="Approved HMSI fundraiser flash" className="border-y border-[#1e5b49]/30 bg-[#1e5b49] text-white"><div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12"><div className="flex flex-col gap-6"><Link href={`/fundraise/${fundraiser.id}`} className="group block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#e1ad45] focus:ring-offset-2 focus:ring-offset-[#1e5b49]"><p className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.22em] text-[#e1ad45]"><CircleDollarSign size={22} aria-hidden="true" /> Approved fundraiser</p><h2 className="mt-5 max-w-5xl truncate text-3xl font-black tracking-[-0.04em] sm:text-5xl">{fundraiser.title}</h2><p className="mt-4 max-w-5xl line-clamp-2 text-lg leading-8 text-white/75 sm:text-2xl">{fundraiser.description}</p><div className="mt-6 flex flex-wrap items-center gap-3 text-base font-bold text-white/80"><span>₦{Number(fundraiser.raisedAmount).toLocaleString()} raised of ₦{Number(fundraiser.targetAmount).toLocaleString()}</span><span className="rounded-full bg-white/15 px-4 py-2">{progress}%</span><span className="text-white/70">{Number(fundraiser.donorCount || 0).toLocaleString()} donor{fundraiser.donorCount === 1 ? '' : 's'}</span></div></Link><Link href={`/fundraise/${fundraiser.id}`} className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#e1ad45] px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-[#17221e] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#e1ad45] focus:ring-offset-2 focus:ring-offset-[#1e5b49] sm:max-w-[420px]">Support this cause <ArrowRight size={21} aria-hidden="true" /></Link></div></div></section>;
}
