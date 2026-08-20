'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import type { Fundraiser } from '../lib/fundraisers';

type FundraiserCardProps = {
  fundraiser: Fundraiser;
  rankLabel?: string;
};

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export default function FundraiserCard({ fundraiser, rankLabel }: FundraiserCardProps) {
  const progress = fundraiser.targetAmount > 0
    ? Math.min(100, Math.round((fundraiser.raisedAmount / fundraiser.targetAmount) * 100))
    : 0;

  return (
    <Link
      href={`/fundraise/${fundraiser.id}`}
      className="group overflow-hidden rounded-[28px] border border-[#d9d6ce] bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-[#1e5b49] hover:shadow-xl"
    >
      <div className="relative h-56 overflow-hidden">
        <Image
          src={fundraiser.image}
          alt={fundraiser.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">
            Approved cause
          </span>
          {rankLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e1ad45] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#17221e]">
              <TrendingUp size={12} aria-hidden="true" /> {rankLabel}
            </span>
          )}
        </div>
      </div>
      <div className="p-6 sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b]">{fundraiser.category}</p>
        <h3 className="mt-2 text-xl font-black tracking-tight text-[#17221e] transition-colors group-hover:text-[#1e5b49]">{fundraiser.title}</h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#66716a]">{fundraiser.description}</p>
        <div className="mt-6 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-black text-[#17221e]">{naira.format(fundraiser.raisedAmount)}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#66716a]">raised of {naira.format(fundraiser.targetAmount)}</p>
            </div>
            <p className="text-sm font-black text-[#1e5b49]">{progress}%</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#f6f4ef]" aria-label={`${progress}% of fundraising target reached`}>
            <div className="h-full rounded-full bg-[#1e5b49]" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-[#f6f4ef] pt-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#66716a]">{fundraiser.donorCount.toLocaleString()} donor{fundraiser.donorCount === 1 ? '' : 's'}</span>
          <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Donate <ArrowRight size={14} aria-hidden="true" /></span>
        </div>
      </div>
    </Link>
  );
}

export type { FundraiserCardProps };

