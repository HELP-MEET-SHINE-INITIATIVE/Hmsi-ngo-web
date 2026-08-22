'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type ViewerRole = 'volunteer' | 'worker';
type Opportunity = {
  id: string;
  title: string;
  description: string;
  audience: string;
  location: string;
  starts_at: string;
  category?: string;
  eligibility_note?: string | null;
  requires_hmsi_certificate?: boolean;
};

const categoryLabels: Record<string, string> = {
  general: 'Open opportunity',
  core_studies: 'Core studies',
  leadership: 'Leadership pathway',
};

export default function WorkspaceOpportunities({ viewerRole }: { viewerRole: ViewerRole }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/opportunities', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load opportunities.')))
      .then((result) => {
        const visible = (result.opportunities || []).filter((item: Opportunity) => item.audience === viewerRole || item.audience === 'both');
        setOpportunities(visible);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [viewerRole]);

  return <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Approved openings</p><h2 className="mt-2 text-2xl font-black">Opportunities for {viewerRole}s</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">Review current openings and express interest. Every application, assignment, and leadership decision remains subject to HMSI administrator review.</p></div><Link href="/opportunities" className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-3 text-xs font-black uppercase tracking-widest text-white">Browse all <ArrowRight size={14} /></Link></div>{state === 'loading' && <p className="mt-6 rounded-2xl bg-[#f6f4ef] p-4 text-sm text-[#66716a]">Loading approved openings…</p>}{state === 'error' && <p className="mt-6 rounded-2xl bg-[#fff8e8] p-4 text-sm text-[#7a5b16]">Current openings are temporarily unavailable. Use the opportunities directory to retry.</p>}{state === 'ready' && opportunities.length === 0 && <p className="mt-6 rounded-2xl bg-[#f6f4ef] p-4 text-sm text-[#66716a]">No current openings match this dashboard role. An administrator will publish suitable opportunities when confirmed.</p>}{state === 'ready' && opportunities.length > 0 && <div className="mt-6 grid gap-4 md:grid-cols-2">{opportunities.map((opportunity) => <article key={opportunity.id} className="rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] p-5"><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{opportunity.category === 'leadership' ? <ShieldCheck size={14} /> : opportunity.category === 'core_studies' ? <BookOpen size={14} /> : <BriefcaseBusiness size={14} />}{categoryLabels[opportunity.category || 'general']}</span><span className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b]">{opportunity.audience === 'both' ? 'Volunteer + worker' : opportunity.audience}</span></div><h3 className="mt-4 text-lg font-black">{opportunity.title}</h3><p className="mt-2 text-sm leading-6 text-[#66716a]">{opportunity.description}</p>{opportunity.eligibility_note && <p className="mt-3 border-l-2 border-[#e1ad45] pl-3 text-xs leading-5 text-[#7a5b16]"><strong>Eligibility:</strong> {opportunity.eligibility_note}</p>}<Link href={`/opportunities#opportunity-${opportunity.id}`} className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Review opening <ArrowRight size={14} /></Link></article>)}</div>}</section>;
}
