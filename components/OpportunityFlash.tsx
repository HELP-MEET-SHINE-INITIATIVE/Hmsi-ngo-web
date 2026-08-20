'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, MapPin } from 'lucide-react';

type PublicOpportunity = {
  id: string;
  title: string;
  description: string;
  audience: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
};

const ROTATION_MS = 20 * 60 * 1000;

export default function OpportunityFlash() {
  const [opportunities, setOpportunities] = useState<PublicOpportunity[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadOpportunities = useCallback(async () => {
    try {
      const response = await fetch('/api/opportunities', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) return;
      setOpportunities(result.opportunities || []);
    } catch {
      // The homepage remains available if the opportunities service is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    loadOpportunities();
    const refreshTimer = window.setInterval(loadOpportunities, ROTATION_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadOpportunities]);

  useEffect(() => {
    if (opportunities.length < 2) {
      setActiveIndex(0);
      return;
    }
    const rotationTimer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % opportunities.length);
    }, ROTATION_MS);
    return () => window.clearInterval(rotationTimer);
  }, [opportunities.length]);

  if (opportunities.length === 0) return null;

  const opportunity = opportunities[activeIndex] || opportunities[0];
  const audienceLabel = opportunity.audience === 'both' ? 'Volunteers + workers' : opportunity.audience === 'worker' ? 'Workers' : 'Volunteers';

  return (
    <section aria-label="Public HMSI opportunity announcement" className="border-b border-[#d9a93d] bg-[#e1ad45] text-[#17221e]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-[#17221e] p-2 text-[#e1ad45] motion-safe:animate-pulse" aria-hidden="true"><Bell size={16} /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#17221e]/70">Public opportunity · updates every 20 minutes</p>
            <p className="mt-1 truncate text-base font-black sm:text-lg">Now open: {opportunity.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#17221e]/70"><span>{audienceLabel}</span><span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" /> {opportunity.location}</span></p>
          </div>
        </div>
        <Link href={`/opportunities#opportunity-${opportunity.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#17221e] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#1e5b49] focus:outline-none focus:ring-2 focus:ring-[#17221e] focus:ring-offset-2 focus:ring-offset-[#e1ad45]">View opportunity <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
