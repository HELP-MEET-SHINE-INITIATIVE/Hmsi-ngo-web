import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Megaphone } from 'lucide-react';
import SponsorForm from './SponsorForm';

export const metadata: Metadata = {
  title: 'Sponsor HMSI Community Rooms',
  description: 'Submit an HMSI sponsorship request for admin review and, if approved, secure NGN payment through Paystack.',
  robots: { index: false, follow: false },
};

export default async function SponsorPage({ searchParams }: { searchParams: Promise<{ sponsorship?: string }> }) {
  const params = await searchParams;
  return <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]"><main><section className="bg-[#17221e] px-6 py-20 text-white sm:px-8 sm:py-28 lg:px-12"><div className="mx-auto max-w-[1200px]"><Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-white/70 transition hover:text-white"><ArrowLeft size={16} /> Back to homepage</Link><p className="mt-14 flex items-center gap-3 text-xs font-black uppercase tracking-[0.24em] text-[#e1ad45]"><Megaphone size={16} /> HMSI sponsored placements</p><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl">Promote responsibly.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">Submit a sponsorship request for review. HMSI administrators control approval, payment verification, activation, and display windows.</p></div></section><section className="px-6 py-14 sm:px-8 sm:py-20 lg:px-12"><div className="mx-auto max-w-[1200px]"><SponsorForm approvedRequestId={params.sponsorship || ''} /><p className="mt-8 text-xs leading-6 text-[#66716a]">Sponsored content must not mislead, impersonate HMSI, expose private beneficiary information, or imply HMSI endorsement before written approval. Payment does not guarantee publication or continued display.</p></div></section></main></div>;
}
