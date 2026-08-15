import ImpactGallery from '@/components/ImpactGallery';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero Section */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
          Empowering Communities. <br />Restoring Hope Across Nigeria.
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          Help-Meet Shine Initiative (HMSI) provides humanitarian support and equips individuals for sustainable wealth creation.
        </p>
      </section>

      {/* Impact Gallery Section */}
      <ImpactGallery />
    </main>
  );
}
