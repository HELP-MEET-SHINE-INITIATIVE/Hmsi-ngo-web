'use client';

import Link from 'next/link';
import { Check, Copy, UserPlus, BriefcaseBusiness, LifeBuoy, Megaphone } from 'lucide-react';
import { useState } from 'react';

type PromotionLink = {
  id: 'volunteer' | 'worker' | 'get-help' | 'fundraising-growth';
  title: string;
  description: string;
  path: string;
  icon: typeof UserPlus;
  accent: string;
};

const links: PromotionLink[] = [
  {
    id: 'volunteer',
    title: 'Volunteer recruitment',
    description: 'Invite people to join HMSI as volunteers.',
    path: '/volunteer?utm_source=admin&utm_medium=recruitment_share&utm_campaign=volunteer_recruitment',
    icon: UserPlus,
    accent: 'bg-[#e9f0e9] text-[#1e5b49]',
  },
  {
    id: 'fundraising-growth',
    title: 'Fundraising growth team',
    description: 'Recruit ambassadors and campaign builders who can responsibly grow approved causes.',
    path: '/fundraising-growth?utm_source=admin&utm_medium=recruitment_share&utm_campaign=fundraising_growth_team',
    icon: Megaphone,
    accent: 'bg-[#fff3d7] text-[#916719]',
  },
  {
    id: 'worker',
    title: 'Worker and job applications',
    description: 'Promote paid, skilled, and field-work opportunities.',
    path: '/worker-apply?utm_source=admin&utm_medium=recruitment_share&utm_campaign=worker_applications',
    icon: BriefcaseBusiness,
    accent: 'bg-[#f7eadf] text-[#b56b3b]',
  },
  {
    id: 'get-help',
    title: 'Get Help requests',
    description: 'Help people request support for urgent needs, medical care, education, or housing.',
    path: '/get-help?utm_source=admin&utm_medium=help_share&utm_campaign=get_help_requests',
    icon: LifeBuoy,
    accent: 'bg-[#fff3d7] text-[#916719]',
  },
];

export default function AdminPromotionLinks() {
  const [copiedId, setCopiedId] = useState<PromotionLink['id'] | null>(null);

  const getUrl = (path: string) => `${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hmsi.org.ng')}${path}`;

  const copyLink = async (link: PromotionLink) => {
    const url = getUrl(link.path);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((current) => current === link.id ? null : current), 2500);
    } catch {
      window.prompt(`Copy this ${link.title} link:`, url);
    }
  };

  return <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6" aria-labelledby="admin-promotion-links-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Ready to promote</p><h2 id="admin-promotion-links-title" className="mt-2 text-xl font-black">Volunteer, worker, and Get Help links</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">Copy a tracked link and paste it into social media posts, WhatsApp messages, email, job announcements, or community support groups.</p></div><div className="flex items-center gap-2"><Link href="/gtm-preview" className="rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#17221e] hover:border-[#1e5b49]">GTM Debugger</Link><span className="hidden rounded-2xl bg-[#17221e] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white sm:inline-flex">Admin tools</span></div></div><div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">{links.map((link) => { const Icon = link.icon; const isCopied = copiedId === link.id; return <div key={link.id} className="rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] p-4"><div className="flex items-start gap-3"><span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${link.accent}`}><Icon size={19} aria-hidden="true" /></span><div><h3 className="text-sm font-black">{link.title}</h3><p className="mt-1 text-xs leading-5 text-[#66716a]">{link.description}</p></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><label htmlFor={`admin-promotion-${link.id}`} className="sr-only">{link.title} promotion link</label><input id={`admin-promotion-${link.id}`} readOnly value={getUrl(link.path)} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-[#d9d6ce] bg-white px-3 py-2 text-xs text-[#66716a] outline-none" /><button type="button" onClick={() => copyLink(link)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#17221e]">{isCopied ? <Check size={14} /> : <Copy size={14} />}{isCopied ? 'Copied' : 'Copy link'}</button></div></div>; })}</div></section>;
}
