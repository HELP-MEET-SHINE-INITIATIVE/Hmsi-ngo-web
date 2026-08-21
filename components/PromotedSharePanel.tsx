'use client';

import { Check, Copy, Link2, Share2 } from 'lucide-react';
import { useState } from 'react';

type PromotedSharePanelProps = {
  title: string;
  description: string;
  type: 'fundraiser' | 'story' | 'help';
  sharePath?: string;
};

export default function PromotedSharePanel({ title, description, type, sharePath }: PromotedSharePanelProps) {
  const [status, setStatus] = useState('');
  const shareLabel = type === 'fundraiser' ? 'Support this verified HMSI cause' : type === 'story' ? 'Read this HMSI field story' : 'Request support from HMSI';
  const shareCampaign = type === 'fundraiser' ? 'fundraiser_promotion' : type === 'story' ? 'featured_story_promotion' : 'get_help_promotion';
  const shareTypeLabel = type === 'fundraiser' ? 'fundraiser' : type === 'story' ? 'field story' : 'help request';

  const getShareUrl = () => {
    const url = sharePath ? new URL(sharePath, window.location.origin) : new URL(window.location.href);
    url.searchParams.set('utm_source', 'social');
    url.searchParams.set('utm_medium', 'organic_share');
    url.searchParams.set('utm_campaign', shareCampaign);
    return url.toString();
  };

  const copyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Promoted link copied. Paste it into any post, message, or story.');
    } catch {
      setStatus(`Copy this link: ${url}`);
    }
  };

  const openNetwork = async (network: 'facebook' | 'linkedin' | 'instagram') => {
    const url = getShareUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(`${shareLabel}: ${title} — ${description}`);
    if (network === 'instagram') {
      await copyLink();
      window.open('https://www.instagram.com/hmsinitiative/', '_blank', 'noopener,noreferrer');
      setStatus('Link copied. Instagram opened so you can paste this promoted post link into your caption or story.');
      return;
    }
    const shareUrl = network === 'facebook'
      ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`
      : `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=680,height=720');
    setStatus(`${network === 'facebook' ? 'Facebook' : 'LinkedIn'} share window opened.`);
  };

  return <section className="rounded-3xl border border-[#d9d6ce] bg-[#f6f4ef] p-5 sm:p-6" aria-label="Promote this HMSI post"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1e5b49] text-white"><Share2 size={18} aria-hidden="true" /></span><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#1e5b49]">Promote this {shareTypeLabel}</p><p className="mt-1 text-sm leading-6 text-[#66716a]">Share this verified HMSI post directly with your community.</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><button type="button" onClick={() => openNetwork('facebook')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1877f2] px-3 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#1877f2] focus:ring-offset-2"><span className="text-sm font-black" aria-hidden="true">f</span> Facebook</button><button type="button" onClick={() => openNetwork('instagram')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-3 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#fd1d1d] focus:ring-offset-2"><span className="text-[11px] font-black" aria-hidden="true">IG</span> Instagram</button><button type="button" onClick={() => openNetwork('linkedin')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a66c2] px-3 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#0a66c2] focus:ring-offset-2"><span className="text-[11px] font-black" aria-hidden="true">in</span> LinkedIn</button><button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1e5b49]/30 bg-white px-3 py-3 text-xs font-black uppercase tracking-wider text-[#1e5b49] transition hover:bg-[#e9f0e9] focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2"><Link2 size={16} aria-hidden="true" /> Copy link</button></div>{status && <p className="mt-4 flex items-start gap-2 text-xs font-bold leading-5 text-[#1e5b49]" role="status" aria-live="polite">{status.includes('copied') ? <Check size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Copy size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}{status}</p>}</section>;
}
