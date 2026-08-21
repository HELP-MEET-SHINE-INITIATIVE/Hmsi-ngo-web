'use client';

import { Check, Copy, ExternalLink, Link2 } from 'lucide-react';
import { useState } from 'react';

type Campaign = {
  id: string;
  title: string;
  status: string;
  category?: string;
};

export default function AdminCampaignLinks({ campaigns }: { campaigns: Campaign[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const linkFor = (campaign: Campaign) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hmsi.org.ng');
    return `${baseUrl}/fundraise/${campaign.id}?utm_source=social&utm_medium=admin_campaign_share&utm_campaign=fundraiser_${campaign.id}`;
  };

  const copyLink = async (campaign: Campaign) => {
    const link = linkFor(campaign);
    setError('');
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(campaign.id);
      window.setTimeout(() => setCopiedId((current) => current === campaign.id ? null : current), 2500);
    } catch {
      setError(`Copy failed. Select and copy the link manually: ${link}`);
    }
  };

  return <section className="rounded-3xl border-2 border-[#1e5b49]/20 bg-[#e9f0e9] p-6 shadow-sm" aria-labelledby="direct-campaign-links-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e5b49] text-white"><Link2 size={20} aria-hidden="true" /></span><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Copy and paste for promotion</p><h2 id="direct-campaign-links-title" className="mt-1 text-xl font-black text-[#17221e]">Direct campaign donation links</h2></div></div><p className="mt-4 max-w-2xl text-sm leading-6 text-[#66716a]">These links open the campaign’s donation page directly. Copy one and paste it into Facebook, Instagram, LinkedIn, WhatsApp, email, or any campaign announcement.</p></div><span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]"><ExternalLink size={13} aria-hidden="true" /> Ready to share</span></div>{campaigns.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-[#1e5b49]/30 bg-white/60 p-4 text-sm text-[#66716a]">Create a fundraiser campaign to generate its direct donation link here.</p> : <div className="mt-6 space-y-3">{campaigns.map((campaign) => <div key={campaign.id} className="rounded-2xl border border-[#cbd2ca] bg-white p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-[#17221e]">{campaign.title}</p><span className="rounded-full bg-[#f6f4ef] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[#66716a]">{campaign.status}</span>{campaign.category && <span className="rounded-full bg-[#f7eadf] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[#b56b3b]">{campaign.category}</span>}</div><label htmlFor={`direct-campaign-link-${campaign.id}`} className="sr-only">Direct donation link for {campaign.title}</label><input id={`direct-campaign-link-${campaign.id}`} readOnly value={linkFor(campaign)} onFocus={(event) => event.currentTarget.select()} className="mt-3 w-full rounded-xl border border-[#d9d6ce] bg-[#f6f4ef] px-3 py-2 text-xs text-[#66716a] outline-none focus:border-[#1e5b49]" /></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => copyLink(campaign)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e5b49] px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#17221e] focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2">{copiedId === campaign.id ? <Check size={15} /> : <Copy size={15} />}{copiedId === campaign.id ? 'Copied' : 'Copy link'}</button><a href={`/fundraise/${campaign.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-[#d9d6ce] bg-white px-3 py-3 text-[#1e5b49] hover:bg-[#f6f4ef]" aria-label={`Open ${campaign.title} donation page`}><ExternalLink size={16} aria-hidden="true" /></a></div></div></div>)}</div>}{error && <p className="mt-4 rounded-xl bg-[#fff8e8] p-3 text-xs font-bold leading-5 text-[#7a5b16]" role="alert">{error}</p>}</section>;
}
