import Link from 'next/link';
import ImpactGallery from '../components/ImpactGallery';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 1. HERO SECTION */}
      <section className="relative px-6 lg:px-16 py-20 lg:py-32 overflow-hidden flex flex-col items-center text-center">
        {/* Subtle background gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950 -z-10" />
        
        {/* Eyebrow Label */}
        <p className="text-blue-400 font-semibold tracking-widest uppercase text-sm mb-6">
          Help-Meet Shine Initiative (HMSI)
        </p>
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight max-w-5xl leading-[1.1]">
          Empowering Communities. <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Restoring Hope Across Nigeria.
          </span>
        </h1>
        
        {/* Sub-headline */}
        <p className="mt-8 text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed">
          We provide humanitarian support, equip individuals for sustainable wealth creation, and run community outreach programs for vulnerable groups.
        </p>

        {/* Action Buttons (The "Save the Children" approach) */}
        <div className="mt-10 flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
          <Link 
            href="/donate" 
            className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all shadow-lg shadow-red-600/20 text-lg w-full sm:w-auto"
          >
            Make a Donation
          </Link>
          <Link 
            href="/volunteer" 
            className="px-10 py-4 bg-transparent border-2 border-slate-600 hover:border-white hover:bg-white hover:text-slate-900 text-white font-bold rounded-full transition-all text-lg w-full sm:w-auto"
          >
            Become a Volunteer
          </Link>
        </div>

        {/* 2. IMPACT STATISTICS GRID */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-5xl border-t border-slate-800 pt-16">
          <div className="flex flex-col items-center">
            <span className="text-5xl md:text-6xl font-black text-white">1,000+</span>
            <span className="text-sm md:text-base text-slate-400 uppercase tracking-widest mt-3 font-medium">
              Families Supported
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-5xl md:text-6xl font-black text-white">500+</span>
            <span className="text-sm md:text-base text-slate-400 uppercase tracking-widest mt-3 font-medium">
              Youths Empowered
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-5xl md:text-6xl font-black text-white">20+</span>
            <span className="text-sm md:text-base text-slate-400 uppercase tracking-widest mt-3 font-medium">
              Community Drives
            </span>
          </div>
        </div>
      </section>

      {/* 3. GALLERY SECTION */}
      <section className="px-6 lg:px-16 py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <ImpactGallery />
        </div>
      </section>
      
    </div>
  );
}
