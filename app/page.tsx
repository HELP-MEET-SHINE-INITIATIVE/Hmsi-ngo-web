import ImpactGallery from '@/components/ImpactGallery';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-20 px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
          Empowering Communities. <br />Restoring Hope Across Nigeria.
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
          Help-Meet Shine Initiative (HMSI) provides humanitarian support and equips individuals for sustainable wealth creation.
        </p>
      </section>

      {/* Impact Gallery Section */}
      <ImpactGallery />
    </div>
  );
}
