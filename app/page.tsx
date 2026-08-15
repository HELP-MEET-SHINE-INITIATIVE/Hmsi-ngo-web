import ImpactGallery from '@/components/ImpactGallery';

export const metadata = {
  title: 'Help-Meet Shine Initiative (HMSI) | Empowering Communities Across Nigeria',
  description: 'We provide humanitarian support, equip individuals for sustainable wealth creation, and run community outreach programs for vulnerable groups.',
};

export default function Home() {
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Global NGO Hero Section with Immersive Background */}
      <section className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-20 md:py-32 px-6 border-b border-slate-800/80 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-blue-950/80 border border-blue-800/60 px-4 py-1.5 rounded-full text-xs font-semibold text-blue-400 uppercase tracking-widest shadow-sm">
            <span>CAC Registration No: 125103</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-tight">
            Empowering Communities. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
              Restoring Hope Across Nigeria.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            We deliver critical humanitarian relief, fuel food security, and equip individuals with sustainable frameworks for long-term wealth creation.
          </p>

          {/* High-Impact CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a 
              href="/donate" 
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-center transition shadow-lg shadow-blue-600/30 transform hover:-translate-y-0.5"
            >
              Make a Donation
            </a>
            <a 
              href="/contact" 
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold rounded-xl text-center transition shadow-sm"
            >
              Become a Volunteer
            </a>
          </div>
        </div>
      </section>

      {/* Global Standard Trust Metrics Bar */}
      <section className="border-b border-slate-800/80 bg-slate-900/50 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-sm">
            <div className="text-4xl md:text-5xl font-black text-blue-400 mb-2">1,000+</div>
            <div className="text-sm font-medium uppercase tracking-wider text-slate-400">Families Supported</div>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-sm">
            <div className="text-4xl md:text-5xl font-black text-indigo-400 mb-2">500+</div>
            <div className="text-sm font-medium uppercase tracking-wider text-slate-400">Youths Empowered</div>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-sm">
            <div className="text-4xl md:text-5xl font-black text-sky-400 mb-2">20+</div>
            <div className="text-sm font-medium uppercase tracking-wider text-slate-400">Community Drives</div>
          </div>
        </div>
      </section>

      {/* Mission Pillar Highlights */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Our Core Pillars</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">Driving measurable, systemic change through targeted grassroots intervention.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4">
            <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-2xl">🌾</div>
            <h3 className="text-xl font-bold text-white">Food Security & Relief</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Direct distribution of staple foods and essential nutritional supplies to low-income households and vulnerable communities.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4">
            <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-2xl">💡</div>
            <h3 className="text-xl font-bold text-white">Wealth Creation Frameworks</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Equipping young adults and families with practical digital and vocational capabilities to achieve sustainable financial independence.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4">
            <div className="w-12 h-12 bg-sky-600/20 border border-sky-500/30 rounded-xl flex items-center justify-center text-2xl">🤝</div>
            <h3 className="text-xl font-bold text-white">Grassroots Partnerships</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Collaborating with local leaders and international volunteers to scale our humanitarian outreach across regions.</p>
          </div>
        </div>
      </section>

      {/* Impact Gallery Section */}
      <section className="py-12 px-6 max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-extrabold text-white">On-The-Ground Impact</h2>
          <p className="text-slate-400 text-sm">A visual glimpse into our active community outreaches and support programs.</p>
        </div>
        <ImpactGallery />
      </section>

    </div>
  );
}
