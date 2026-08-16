// 🛑 The Fix: Using the relative path '../components/' instead of the alias '@/components/'
import ImpactGallery from '../components/ImpactGallery';

export default function Home() {
  return (
    <div className="min-h-screen p-6 md:p-12 lg:p-24">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header Section */}
        <header className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
            Help-Meet Shine Initiative
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Dedicated to uplifting communities, providing vital relief materials, and bringing hope to vulnerable households across Nigeria.
          </p>
        </header>

        {/* Gallery Section */}
        <section className="bg-slate-900/40 rounded-3xl p-6 md:p-10 border border-slate-800/60 shadow-2xl backdrop-blur-sm">
          <ImpactGallery />
        </section>

      </div>
    </div>
  );
}
