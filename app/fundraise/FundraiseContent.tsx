"use client";

import { useEffect, useState } from "react";
import { loadData } from "../../lib/data";
import Link from "next/link";
import Image from "next/image";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { 
  Heart, 
  Search, 
  Plus, 
  ArrowRight, 
  Activity,
  GraduationCap,
  Home,
  Stethoscope
} from "lucide-react";

const categories = [
  { id: 'all', label: 'All Causes', icon: Activity },
  { id: 'medical', label: 'Medical', icon: Stethoscope },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'housing', label: 'Housing', icon: Home },
  { id: 'emergency', label: 'Emergency', icon: Heart },
];

export default function FundraiseContent() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    setData(loadData());
    setIsLoading(false);
  }, []);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e5b49]"></div>
      </div>
    );
  }

  const filteredFundraisers = activeCategory === 'all' 
    ? data.fundraisers 
    : data.fundraisers.filter((f: any) => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="bg-[#17221e] text-white py-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-[#e1ad45] text-xs font-black uppercase tracking-[0.2em] mb-6">Help Me / Fundraising</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8">Every story deserves <br/><span className="text-[#e1ad45]">a better chapter.</span></h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
              Join a community of givers supporting individual needs across Nigeria. Transparent, direct, and life-changing.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/fundraise/create" className="px-10 py-4 rounded-full bg-[#e1ad45] text-[#17221e] font-black uppercase tracking-widest text-sm hover:bg-white transition-all flex items-center gap-2">
                <Plus size={18} /> Start a Fundraiser
              </Link>
              <Link href="#causes" className="px-10 py-4 rounded-full border border-white/30 text-white font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all">
                Browse Causes
              </Link>
            </div>
          </div>
        </section>

        {/* Categories & Search */}
        <section id="causes" className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                      activeCategory === cat.id 
                        ? "bg-[#1e5b49] text-white shadow-lg" 
                        : "bg-white border border-[#d9d6ce] text-[#66716a] hover:border-[#1e5b49]"
                    }`}
                  >
                    <Icon size={16} /> {cat.label}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} />
              <input 
                type="text" 
                placeholder="Search fundraisers..." 
                className="w-full pl-12 pr-4 py-4 rounded-full bg-white border border-[#d9d6ce] focus:border-[#1e5b49] outline-none text-sm shadow-sm"
              />
            </div>
          </div>

          {/* Fundraiser Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredFundraisers.map((f: any) => {
              const progress = Math.min(100, Math.round((f.raisedAmount / f.targetAmount) * 100));
              return (
                <Link key={f.id} href={`/fundraise/${f.id}`} className="group bg-white rounded-[32px] border border-[#d9d6ce] overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="relative h-64 overflow-hidden">
                    <Image src={f.image} alt={f.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">
                        {f.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-xl font-black tracking-tight mb-3 group-hover:text-[#1e5b49] transition-colors">{f.title}</h3>
                    <p className="text-sm text-[#66716a] line-clamp-2 mb-8 leading-relaxed">{f.description}</p>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-lg font-black text-[#17221e]">₦{f.raisedAmount.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-[#66716a] uppercase tracking-widest">Raised of ₦{f.targetAmount.toLocaleString()}</p>
                        </div>
                        <p className="text-sm font-black text-[#1e5b49]">{progress}%</p>
                      </div>
                      <div className="h-2 w-full bg-[#f6f4ef] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1e5b49] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#f6f4ef] flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#66716a] uppercase tracking-widest">124 Donors</span>
                      <span className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#1e5b49]">
                        Donate Now <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredFundraisers.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[40px] border border-[#d9d6ce] border-dashed">
              <p className="text-[#66716a] italic">No fundraisers found in this category.</p>
              <button onClick={() => setActiveCategory('all')} className="mt-4 text-[#1e5b49] font-black uppercase tracking-widest text-xs hover:underline">View all causes</button>
            </div>
          )}
        </section>

        {/* Trust Section */}
        <section className="bg-[#e9f0e9] py-20 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black tracking-tight mb-6">Safe, Secure and <br/><span className="text-[#1e5b49]">100% Transparent.</span></h2>
              <p className="text-[#66716a] text-lg leading-relaxed mb-10">
                HMSI ensures that every Naira donated goes directly to the cause. We verify every help request and provide regular updates on the progress of each fundraiser.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white shadow-sm">
                  <p className="text-2xl font-black text-[#1e5b49]">0%</p>
                  <p className="text-[10px] font-black uppercase text-[#66716a] tracking-widest">Platform Fees</p>
                </div>
                <div className="p-6 rounded-2xl bg-white shadow-sm">
                  <p className="text-2xl font-black text-[#1e5b49]">24h</p>
                  <p className="text-[10px] font-black uppercase text-[#66716a] tracking-widest">Verification</p>
                </div>
              </div>
            </div>
            <div className="relative h-[400px] rounded-[40px] overflow-hidden shadow-2xl">
              <Image src="/images/outreach-10.png" alt="Impact" fill className="object-cover" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
