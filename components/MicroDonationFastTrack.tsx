import Link from 'next/link';
import { ArrowRight, HeartHandshake } from 'lucide-react';
import type { Fundraiser } from '../lib/fundraisers';

const amounts = [500, 1000, 5000] as const;

export default function MicroDonationFastTrack({ campaign }: { campaign: Fundraiser | undefined }) {
  if (!campaign) return null;
  const campaignHref = `/donate?fundraiser_id=${encodeURIComponent(campaign.id)}`;
  return <section aria-labelledby="micro-donation-title" className="border-y border-[#d9d6ce] bg-[#17221e] text-white"><div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#e1ad45]">Micro-donation fast track</p><h2 id="micro-donation-title" className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Support {campaign.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Choose an amount to continue to HMSI’s secure donation form. You will enter and confirm all payment details directly with Paystack. Campaign progress remains at ₦0 until a verified donation is recorded.</p></div><div className="flex flex-wrap gap-3"><>{amounts.map((amount) => <Link key={amount} href={`${campaignHref}&amount=${amount}`} className="rounded-full bg-[#e1ad45] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#17221e] transition hover:bg-white">Give ₦{amount.toLocaleString()}</Link>)}</><Link href={campaignHref} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10">Custom amount <ArrowRight size={15} /></Link></div></div></section>;
}
