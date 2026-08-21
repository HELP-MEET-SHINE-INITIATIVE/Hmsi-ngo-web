'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '../../components/Footer';
import PromotedSharePanel from '../../components/PromotedSharePanel';
import FundraisingGrowthHub from '../../components/FundraisingGrowthHub';
import {
  Activity,
  ArrowRight,
  GraduationCap,
  Heart,
  Home,
  Plus,
  Search,
  Stethoscope,
  UsersRound,
} from 'lucide-react';

type Fundraiser = {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  raisedAmount: number;
  donorCount: number;
  image: string;
};

const categories = [
  { id: 'all', label: 'All Causes', icon: Activity },
  { id: 'medical', label: 'Medical', icon: Stethoscope },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'housing', label: 'Housing', icon: Home },
  { id: 'emergency', label: 'Emergency', icon: Heart },
  { id: 'community', label: 'Community Support', icon: UsersRound },
];

function displayCategory(category: string) {
  return category.toLowerCase() === 'community' ? 'Community Support' : category;
}

export default function FundraiseContent() {
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadFundraisers = async () => {
      try {
        const response = await fetch('/api/fundraisers', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Fundraisers are temporarily unavailable.');
        if (isMounted) setFundraisers(result.fundraisers || []);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Fundraisers are temporarily unavailable.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadFundraisers();
    const refreshTimer = window.setInterval(loadFundraisers, 30 * 1000);
    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const filteredFundraisers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return fundraisers.filter((fundraiser) => {
      const matchesCategory = activeCategory === 'all' || fundraiser.category === activeCategory;
      const matchesSearch = !normalizedSearch || `${fundraiser.title} ${fundraiser.description}`.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, fundraisers, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f4ef]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#1e5b49]" aria-label="Loading fundraisers" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <main>
        <section className="bg-[#17221e] px-6 py-20 text-white">
          <div className="mx-auto max-w-7xl text-center">
            <p className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-[#e1ad45]">Help Me / Fundraising</p>
            <h1 className="mb-8 text-5xl font-black tracking-tight md:text-7xl">Every story deserves <br /><span className="text-[#e1ad45]">a better chapter.</span></h1>
            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl">Join a community of givers supporting individual needs across Nigeria and Africa. Transparent, direct, and life-changing.</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/fundraise/create" className="flex items-center gap-2 rounded-full bg-[#e1ad45] px-10 py-4 text-sm font-black uppercase tracking-widest text-[#17221e] transition-all hover:bg-white"><Plus size={18} /> Start a Fundraiser</Link>
              <Link href="#causes" className="rounded-full border border-white/30 px-10 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-white/10">Browse Causes</Link>
              <Link href="/get-help?utm_source=fundraise&utm_medium=cta&utm_campaign=get_help_requests" className="rounded-full border border-[#e1ad45]/70 px-10 py-4 text-sm font-black uppercase tracking-widest text-[#e1ad45] transition-all hover:bg-[#e1ad45] hover:text-[#17221e]">Need help? Request support</Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pt-10"><PromotedSharePanel title="Support a verified HMSI cause" description="Discover transparent, community-led fundraising campaigns supporting individual needs across Nigeria and Africa." type="fundraiser" sharePath="/fundraise" /></section>

        <section id="causes" className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-12 flex flex-col items-center justify-between gap-8 lg:flex-row">
            <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-2 lg:w-auto">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeCategory === category.id ? 'bg-[#1e5b49] text-white shadow-lg' : 'border border-[#d9d6ce] bg-white text-[#66716a] hover:border-[#1e5b49]'}`}>
                    <Icon size={16} /> {category.label}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} />
              <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search fundraisers..." aria-label="Search fundraisers" className="w-full rounded-full border border-[#d9d6ce] bg-white py-4 pl-12 pr-4 text-sm shadow-sm outline-none focus:border-[#1e5b49]" />
            </div>
          </div>

          {error && <div className="mb-8 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredFundraisers.map((fundraiser) => {
              const progress = fundraiser.targetAmount > 0 ? Math.min(100, Math.round((fundraiser.raisedAmount / fundraiser.targetAmount) * 100)) : 0;
              return (
                <Link key={fundraiser.id} href={`/fundraise/${fundraiser.id}`} className="group overflow-hidden rounded-[32px] border border-[#d9d6ce] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-64 overflow-hidden">
                    <Image src={fundraiser.image} alt={fundraiser.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute left-4 top-4"><span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{displayCategory(fundraiser.category)}</span></div>
                  </div>
                  <div className="p-8">
                    <h3 className="mb-3 text-xl font-black tracking-tight transition-colors group-hover:text-[#1e5b49]">{fundraiser.title}</h3>
                    <p className="mb-8 line-clamp-2 text-sm leading-relaxed text-[#66716a]">{fundraiser.description}</p>
                    <div className="space-y-4">
                      <div className="flex items-end justify-between">
                        <div><p className="text-lg font-black text-[#17221e]">₦{fundraiser.raisedAmount.toLocaleString()}</p><p className="text-[10px] font-bold uppercase tracking-widest text-[#66716a]">Raised of ₦{fundraiser.targetAmount.toLocaleString()}</p></div>
                        <p className="text-sm font-black text-[#1e5b49]">{progress}%</p>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#f6f4ef]"><div className="h-full rounded-full bg-[#1e5b49] transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
                    </div>
                    <div className="mt-8 flex items-center justify-between border-t border-[#f6f4ef] pt-6"><span className="text-[10px] font-bold uppercase tracking-widest text-[#66716a]">{fundraiser.donorCount.toLocaleString()} donor{fundraiser.donorCount === 1 ? '' : 's'}</span><span className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Donate Now <ArrowRight size={14} /></span></div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredFundraisers.length === 0 && <div className="rounded-[40px] border border-dashed border-[#d9d6ce] bg-white py-20 text-center"><p className="text-[#66716a] italic">No fundraisers found for this search.</p><button onClick={() => { setActiveCategory('all'); setSearchTerm(''); }} className="mt-4 text-xs font-black uppercase tracking-widest text-[#1e5b49] hover:underline">View all causes</button></div>}
        </section>

        <FundraisingGrowthHub compact />

        <section className="bg-[#e9f0e9] px-6 py-20">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div><h2 className="mb-6 text-4xl font-black tracking-tight">Safe, Secure and <br /><span className="text-[#1e5b49]">100% Transparent.</span></h2><p className="mb-10 text-lg leading-relaxed text-[#66716a]">HMSI ensures that every Naira donated goes directly to the cause. We verify every help request and provide regular updates on the progress of each fundraiser.</p><div className="grid grid-cols-2 gap-6"><div className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-2xl font-black text-[#1e5b49]">0%</p><p className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">Platform Fees</p></div><div className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-2xl font-black text-[#1e5b49]">24h</p><p className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">Verification</p></div></div></div>
            <div className="relative h-[400px] overflow-hidden rounded-[40px] shadow-2xl"><Image src="/images/fundraise-community-hero.webp" alt="HMSI period hygiene outreach supporting young girls with menstrual health kits" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
