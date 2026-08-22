'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type Opportunity = { id: string; title: string; description: string; work_mode?: 'remote' | 'hybrid' | 'on_site' | null; category?: string; eligibility_note?: string | null; requires_hmsi_certificate?: boolean };

export default function MemberOpportunityFeed() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/member/opportunities', { cache: 'no-store' })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Member opportunities are unavailable.'); return result; })
      .then((result) => { setOpportunities(result.opportunities || []); setHasCertificate(Boolean(result.hasValidCertificate)); })
      .catch((error) => setStatus(error instanceof Error ? error.message : 'Member opportunities are unavailable.'));
  }, []);

  const expressInterest = async (opportunity: Opportunity) => {
    setBusy(opportunity.id); setStatus('');
    try {
      const response = await fetch(`/api/member/opportunities/${opportunity.id}/apply`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The expression of interest could not be submitted.');
      setStatus(result.message || 'Expression of interest submitted for administrator review.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'The expression of interest could not be submitted.'); }
    finally { setBusy(null); }
  };

  return <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Member pathways</p><h2 className="mt-2 text-2xl font-black">Core studies and leadership interest</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">Approved members can review suitable pathways here. A leadership interest request is not an appointment; administrators must review eligibility, safeguarding suitability, and any assignment.</p></div><Link href="/school" className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-4 py-3 text-xs font-black uppercase tracking-widest text-white">Open school <ArrowRight size={14} /></Link></div>{status && <p role="status" className="mt-5 rounded-2xl bg-[#fff8e8] p-4 text-sm leading-6 text-[#7a5b16]">{status}</p>}{opportunities.length === 0 && !status && <p className="mt-5 rounded-2xl bg-[#f6f4ef] p-4 text-sm text-[#66716a]">No member-visible pathways are currently open.</p>}<div className="mt-6 grid gap-4 md:grid-cols-2">{opportunities.map((opportunity) => { const certificateNeeded = Boolean(opportunity.requires_hmsi_certificate); const eligible = !certificateNeeded || hasCertificate; return <article key={opportunity.id} className="rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] p-5"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{certificateNeeded ? <ShieldCheck size={14} /> : <BookOpen size={14} />}{opportunity.category === 'leadership' ? 'Leadership pathway' : 'Core studies'}{opportunity.work_mode === 'remote' && <span className="rounded-full bg-[#e9f0e9] px-2 py-1 text-[10px] font-black tracking-widest text-[#1e5b49]">Remote work</span>}</div><h3 className="mt-4 text-lg font-black">{opportunity.title}</h3><p className="mt-2 text-sm leading-6 text-[#66716a]">{opportunity.description}</p>{opportunity.eligibility_note && <p className="mt-3 border-l-2 border-[#e1ad45] pl-3 text-xs leading-5 text-[#7a5b16]"><strong>Eligibility:</strong> {opportunity.eligibility_note}</p>}{certificateNeeded && <p className="mt-3 text-xs font-bold text-[#66716a]">Certificate status: {hasCertificate ? 'Valid HMSI completion certificate found.' : 'A valid HMSI completion certificate is required.'}</p>}<button disabled={!eligible || busy === opportunity.id} onClick={() => expressInterest(opportunity)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50">{busy === opportunity.id ? 'Sending…' : eligible ? 'Request administrator review' : 'Complete school first'} <ArrowRight size={14} /></button></article>; })}</div></section>;
}
