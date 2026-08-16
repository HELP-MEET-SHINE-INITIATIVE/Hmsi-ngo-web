import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="bg-white min-h-screen text-slate-900 pb-32 font-sans">
      
      {/* 1. HERO & DONATION WIDGET */}
      <section className="px-6 lg:px-16 pt-12 pb-16 max-w-4xl mx-auto">
        <h1 className="text-red-700 text-xl md:text-2xl font-bold mb-6 leading-snug">
          Donate today to help provide lifesaving support to vulnerable communities in Nigeria – and wherever the need is greatest.
        </h1>
        <p className="text-red-700 text-lg font-medium mb-10">
          Your gift could help save a life today.
        </p>

        {/* Donation Calculator Block */}
        <div className="w-full max-w-lg mx-auto">
          <h2 className="text-3xl md:text-4xl font-black uppercase text-center mb-6 tracking-tighter">
            Donate to Help in Crisis
          </h2>
          
          {/* Tabs */}
          <div className="flex w-full border-2 border-slate-200 mb-4 rounded-sm overflow-hidden">
            <button className="flex-1 bg-red-600 text-white font-bold py-3 text-lg relative">
              ONE-TIME
            </button>
            <button className="flex-1 bg-white text-slate-700 font-bold py-3 text-lg hover:bg-slate-50">
              MONTHLY
            </button>
          </div>

          {/* Amount Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button className="border-2 border-slate-200 py-3 font-bold text-lg hover:border-slate-400">₦5k</button>
            <button className="border-2 border-slate-200 py-3 font-bold text-lg hover:border-slate-400">₦10k</button>
            <button className="bg-red-600 border-2 border-red-600 text-white py-3 font-bold text-lg">₦20k</button>
            <button className="border-2 border-slate-200 py-3 font-bold text-lg hover:border-slate-400">₦50k</button>
          </div>
          <p className="text-sm text-slate-600 mb-4 text-center">
            ₦20,000 could purchase a mother and baby essentials kit.
          </p>

          {/* Custom Amount & Submit */}
          <div className="flex border-2 border-slate-400 mb-6 rounded-sm overflow-hidden">
            <span className="px-4 py-3 bg-slate-100 font-bold border-r-2 border-slate-400">₦</span>
            <input type="text" placeholder="Enter other amount" className="w-full px-4 font-bold text-lg outline-none" />
          </div>

          <button className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-xl py-4 rounded-sm flex justify-center items-center gap-2 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            DONATE NOW
          </button>
          <div className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Your donation is processed securely
          </div>
        </div>
      </section>

      {/* 2. IMPACT STATISTICS GRID */}
      <section className="px-6 lg:px-16 py-12 max-w-4xl mx-auto">
        <div className="w-12 h-1 bg-red-600 mb-4"></div>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12">
          Our Impact for Communities in 2026
        </h2>
        
        <div className="grid grid-cols-2 gap-y-12 gap-x-8 text-center">
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black">1,000+</span>
            <span className="text-lg font-medium text-slate-700 mt-2">families reached</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black">6</span>
            <span className="text-lg font-medium text-slate-700 mt-2">states where we work</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black">20+</span>
            <span className="text-lg font-medium text-slate-700 mt-2">community drives</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black">500+</span>
            <span className="text-lg font-medium text-slate-700 mt-2">youths empowered</span>
          </div>
        </div>
      </section>

      {/* 3. FEATURED OUTREACH GALLERY SECTION (Using your actual public images) */}
      <section className="px-6 lg:px-16 py-12 max-w-4xl mx-auto">
        <div className="w-12 h-1 bg-red-600 mb-4"></div>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-8">
          Recent Field Outreaches
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="relative h-48 w-full">
              <Image src="/impact-1.jpg" alt="Impact 1" fill className="object-cover" />
            </div>
            <div className="p-4">
              <p className="text-xs font-bold text-red-600 uppercase mb-1">Community Drive</p>
              <h3 className="font-bold text-lg leading-snug">Empowering Rural Households</h3>
            </div>
          </div>

          <div className="border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="relative h-48 w-full">
              <Image src="/impact-2.jpg" alt="Impact 2" fill className="object-cover" />
            </div>
            <div className="p-4">
              <p className="text-xs font-bold text-red-600 uppercase mb-1">Youth Support</p>
              <h3 className="font-bold text-lg leading-snug">Skills Acquisition Program</h3>
            </div>
          </div>

          <div className="border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="relative h-48 w-full">
              <Image src="/impact-3.jpg" alt="Impact 3" fill className="object-cover" />
            </div>
            <div className="p-4">
              <p className="text-xs font-bold text-red-600 uppercase mb-1">Medical Aid</p>
              <h3 className="font-bold text-lg leading-snug">Healthcare Outreach Initiative</h3>
            </div>
          </div>
        </div>
      </section>

      {/* STICKY BOTTOM FOOTER */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-800 font-bold uppercase tracking-wide text-sm md:text-base mb-3">
            HMSI OUTREACH: COMMUNITIES NEED YOUR HELP NOW
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-sm w-full md:w-auto text-sm md:text-base">
              DONATE ONCE
            </button>
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-sm w-full md:w-auto text-sm md:text-base">
              GIVE MONTHLY
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
