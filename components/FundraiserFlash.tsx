'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CircleDollarSign, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type PublicFundraiser = {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  raisedAmount: number;
  image: string;
};

const ROTATION_MS = 2 * 60 * 1000;

export default function FundraiserFlash() {
  const [fundraisers, setFundraisers] = useState<PublicFundraiser[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadFundraisers = useCallback(async () => {
    try {
      const response = await fetch('/api/fundraisers', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) return;
      const nextFundraisers = [...(result.fundraisers || [])].sort((first: PublicFundraiser, second: PublicFundraiser) => second.raisedAmount - first.raisedAmount);
      setFundraisers(nextFundraisers);
    } catch {
      // The homepage remains available when the fundraiser service is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    loadFundraisers();
    const refreshTimer = window.setInterval(loadFundraisers, ROTATION_MS);
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

  return <section aria-label="Approved HMSI fundraiser flash" className="border-y border-[#1e5b49]/30 bg-[#1e5b49] text-white"><div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div className="flex min-w-0 items-center gap-4"><div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#17221e] sm:block"><Image src={fundraiser.image || '/images/outreach-2.png'} alt="" fill sizes="96px" className="object-cover" /></div><div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#e1ad45]"><CircleDollarSign size={14} aria-hidden="true" /> Approved fundraiser · <RotateCw size={12} aria-hidden="true" /> rotates every 2 minutes</p><p className="mt-1 truncate text-lg font-black sm:text-xl" aria-live="polite">{fundraiser.title}</p><p className="mt-1 line-clamp-2 text-sm text-white/75 lg:line-clamp-1">{fundraiser.description}</p><div className="mt-2 flex items-center gap-3 text-xs font-bold text-white/75"><span>₦{Number(fundraiser.raisedAmount).toLocaleString()} raised of ₦{Number(fundraiser.targetAmount).toLocaleString()}</span><span className="rounded-full bg-white/15 px-2 py-1">{progress}%</span></div></div></div><Link href={`/fundraise/${fundraiser.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#e1ad45] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#17221e] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#e1ad45] focus:ring-offset-2 focus:ring-offset-[#1e5b49]">Support this cause <ArrowRight size={15} aria-hidden="true" /></Link></div></section>;
}
