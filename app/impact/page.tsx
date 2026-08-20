import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import Footer from '../../components/Footer';
import FundraiserCard from '../../components/FundraiserCard';
import Navbar from '../../components/Navbar';
import { getFundraisers, getNewestFundraisers, getTopRaisedFundraisers } from '../../lib/fundraisers';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Top Impact Fundraisers in Nigeria | HMSI',
  description: 'Discover HMSI’s highest-raised approved fundraisers and newly posted verified causes across Nigeria and Africa.',
  keywords: ['top fundraisers Nigeria', 'high impact causes Nigeria', 'verified NGO fundraising Africa', 'donate to causes Nigeria', 'HMSI impact fundraisers'],
  openGraph: {
    title: 'Top Impact Fundraisers in Nigeria | HMSI',
    description: 'See the approved causes making the strongest fundraising progress and the newest ways to help through HMSI.',
    url: 'https://www.hmsi.org.ng/impact',
  },
  alternates: { canonical: 'https://www.hmsi.org.ng/impact' },
};

export default async function ImpactPage() {
  let fundraisers = [] as Awaited<ReturnType<typeof getFundraisers>>;
  let loadError = '';
  try {
    fundraisers = await getFundraisers();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Fundraisers are temporarily unavailable.';
  }

  const topRaised = getTopRaisedFundraisers(fundraisers, 6);
  const newest = getNewestFundraisers(fundraisers, 6);
  const itemList = [...topRaised, ...newest.filter((fundraiser) => !topRaised.some((top) => top.id === fundraiser.id))].map((fundraiser, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `https://www.hmsi.org.ng/fundraise/${fundraiser.id}`,
    name: fundraiser.title,
  }));

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'HMSI approved impact fundraisers', itemListElement: itemList }) }} />
      <Navbar />
      <main>
        <section className="bg-[#17221e] px-6 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl">
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#e1ad45]"><Sparkles size={14} aria-hidden="true" /> Approved impact fundraisers</p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">See where support is moving the needle.</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">Explore approved HMSI causes in two simple ways: follow the fundraisers with the strongest progress, or discover the newest verified requests posted by communities across Nigeria and Africa.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="#top-impact" className="inline-flex items-center gap-2 rounded-full bg-[#e1ad45] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#17221e]">Top impact <TrendingUp size={15} /></Link>
              <Link href="#newly-approved" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-xs font-black uppercase tracking-widest text-white">Newly approved <ArrowRight size={15} /></Link>
              <Link href="/fundraise" className="inline-flex items-center gap-2 rounded-full border border-[#e1ad45]/60 px-6 py-3 text-xs font-black uppercase tracking-widest text-[#e1ad45]">Browse all causes <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>

        {loadError && <div className="mx-auto max-w-7xl px-6 pt-10"><div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">Fundraisers are temporarily unavailable. Please try again shortly.</div></div>}

        <section id="top-impact" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-16 sm:py-24">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Highest raised</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Top impact fundraising</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#66716a]">These approved causes have raised the most so far. Your next donation can help them move closer to their target.</p>
            </div>
            <Link href="/fundraise" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">View every cause <ArrowRight size={15} /></Link>
          </div>
          {topRaised.length > 0 ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{topRaised.map((fundraiser, index) => <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} rankLabel={`#${index + 1} top raised`} />)}</div> : <div className="mt-10 rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-[#66716a]">Approved fundraisers will appear here as soon as they are published.</div>}
        </section>

        <section id="newly-approved" className="scroll-mt-24 border-y border-[#d9d6ce] bg-white px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Fresh opportunities to help</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Newly approved causes</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#66716a]">Start with the newest verified requests and be among the first people to support them.</p>
              </div>
            </div>
            {newest.length > 0 ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{newest.map((fundraiser) => <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} rankLabel="Newly approved" />)}</div> : <div className="mt-10 rounded-3xl border border-dashed border-[#d9d6ce] bg-[#f6f4ef] p-10 text-center text-[#66716a]">Newly approved fundraisers will appear here when they are published.</div>}
          </div>
        </section>

        <section className="bg-[#e9f0e9] px-6 py-16 sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Have a need?</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Start a verified fundraiser with HMSI.</h2></div>
            <Link href="/get-help" className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-white">Request support <ArrowRight size={15} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
