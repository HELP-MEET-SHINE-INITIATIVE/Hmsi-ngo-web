export default function Home() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto text-center flex flex-col justify-center items-center">
      {/* Hero Badge */}
      <div className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-wider text-blue-400 bg-blue-950/60 rounded-full border border-blue-800">
        HELP MEET SHINE INITIATIVE (HMSI)
      </div>

      {/* Main Heading */}
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
        Empowering Communities. <br />
        <span className="text-blue-500">Restoring Hope Across Nigeria.</span>
      </h1>

      <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
        We provide humanitarian support, equip individuals for sustainable wealth creation, and run community outreach programs for vulnerable groups.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-16">
        <a href="#donate" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/30">
          Make a Donation
        </a>
        <a href="#volunteer" className="border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold py-3.5 px-8 rounded-xl transition-all">
          Become a Volunteer
        </a>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800">
          <h3 className="text-3xl font-black text-blue-400">1,000+</h3>
          <p className="text-gray-400 text-sm mt-1">Families Supported</p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800">
          <h3 className="text-3xl font-black text-blue-400">500+</h3>
          <p className="text-gray-400 text-sm mt-1">Youths Empowered</p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800">
          <h3 className="text-3xl font-black text-blue-400">20+</h3>
          <p className="text-gray-400 text-sm mt-1">Community Drives</p>
        </div>
      </div>
    </main>
  );
}
