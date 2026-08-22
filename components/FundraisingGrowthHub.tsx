'use client';

import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, HandCoins, Megaphone, UsersRound } from 'lucide-react';

const campaignPathways = [
  {
    icon: HandCoins,
    eyebrow: 'For donors',
    title: 'Support approved causes',
    text: 'Support HMSI work or choose an approved fundraising cause. Every campaign page explains its purpose and progress.',
    href: '/fundraise',
    action: 'Browse causes',
    accent: 'bg-[#fff3d7] text-[#916719]',
  },
  {
    icon: Megaphone,
    eyebrow: 'For fundraisers',
    title: 'Fundraising ambassador role',
    text: 'Use your network, community group, school, faith community, or workplace to share an approved HMSI campaign responsibly.',
    href: '/volunteer?interest=Fundraising ambassador and donor outreach&utm_source=site&utm_medium=growth_hub&utm_campaign=fundraising_ambassadors',
    action: 'Join the ambassador team',
    accent: 'bg-[#e9f0e9] text-[#1e5b49]',
  },
  {
    icon: UsersRound,
    eyebrow: 'For volunteers',
    title: 'Campaign support volunteer role',
    text: 'Help shape realistic campaign plans, write donor updates, coordinate outreach, and report results back to HMSI.',
    href: '/volunteer?interest=Campaign planning and community outreach&utm_source=site&utm_medium=growth_hub&utm_campaign=campaign_builders',
    action: 'Volunteer your skills',
    accent: 'bg-[#e9eef8] text-[#294d83]',
  },
  {
    icon: BriefcaseBusiness,
    eyebrow: 'For workers',
    title: 'Fundraising and partnerships work',
    text: 'Support partnerships, donor communications, campaign reporting, and field coordination as an approved HMSI worker.',
    href: '/worker-apply?interest=Fundraising, partnerships and campaign operations&utm_source=site&utm_medium=growth_hub&utm_campaign=campaign_workers',
    action: 'Apply to work with HMSI',
    accent: 'bg-[#f7eadf] text-[#b56b3b]',
  },
];

export default function FundraisingGrowthHub({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? 'border-y border-[#d9d6ce] bg-[#e9f0e9] px-6 py-16' : 'border-y border-[#d9d6ce] bg-[#e9f0e9] px-6 py-20 sm:py-24'} aria-labelledby="fundraising-growth-heading">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Campaign participation</p>
            <h2 id="fundraising-growth-heading" className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.04em] text-[#17221e] sm:text-5xl">Ways to participate in HMSI campaigns.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#66716a]">HMSI provides pathways for donors, volunteers, and workers who want to support approved campaigns. Use the information and materials approved for each campaign.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/fundraise" className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#17221e]">Support a cause <ArrowRight size={15} /></Link>
              <Link href="/opportunities" className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49] transition hover:bg-white">See opportunities <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {campaignPathways.map((pathway) => {
              const Icon = pathway.icon;
              return (
                <Link key={pathway.title} href={pathway.href} className="group rounded-[28px] border border-[#d9d6ce] bg-white p-6 transition hover:-translate-y-1 hover:border-[#1e5b49] hover:shadow-xl hover:shadow-[#1e5b49]/10">
                  <div className="flex items-start justify-between gap-4"><span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${pathway.accent}`}><Icon size={21} aria-hidden="true" /></span><ArrowRight size={17} className="mt-2 text-[#9aa59d] transition group-hover:translate-x-1 group-hover:text-[#1e5b49]" /></div>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#b56b3b]">{pathway.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-black tracking-tight text-[#17221e]">{pathway.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#66716a]">{pathway.text}</p>
                  <span className="mt-5 inline-flex text-xs font-black uppercase tracking-widest text-[#1e5b49]">{pathway.action}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mt-10 border-t border-[#cbd8cd] pt-5 text-xs leading-5 text-[#66716a]">Campaign teams should use only approved HMSI copy, budgets, images, and updates. Do not promise results, publish private beneficiary information, or collect donations outside HMSI’s approved channels.</div>
      </div>
    </section>
  );
}
