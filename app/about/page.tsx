export const metadata = {
  title: 'About Us | Help-Meet Shine Initiative (HMSI)',
  description: 'Learn about HMSI, our mission, legal compliance, and our commitment to sustainable community development and humanitarian support across Nigeria.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* Page Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            About Help-Meet Shine Initiative
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Equipping individuals for sustainable wealth creation and providing critical humanitarian support across Nigeria.
          </p>
        </div>

        {/* Mission & Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center">
              <span className="text-blue-500 mr-2">🎯</span> Our Mission
            </h2>
            <p className="text-slate-300 leading-relaxed">
              To alleviate poverty and empower vulnerable groups through targeted humanitarian aid, community outreach, and practical resources that foster long-term self-sufficiency.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center">
              <span className="text-blue-500 mr-2">🌍</span> Our Vision
            </h2>
            <p className="text-slate-300 leading-relaxed">
              A resilient society where every individual has access to basic human needs, sustainable economic opportunities, and the tools to build a thriving future.
            </p>
          </div>
        </div>

        {/* Legal & Institutional Transparency */}
        <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-900/50 p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-4">Governance & Legal Compliance</h2>
          <p className="text-slate-300 mb-6 leading-relaxed">
            Help-Meet Shine Initiative is fully registered and compliant with regulatory authorities in the Federal Republic of Nigeria. We maintain strict transparency regarding our operations and public donations.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Registration Status</p>
              <p className="text-white font-semibold">Registered NGO</p>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">CAC Registration No</p>
              <p className="text-white font-semibold">125103</p>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Incorporation Date</p>
              <p className="text-white font-semibold">Feb 21, 2019</p>
            </div>
          </div>
        </div>

        {/* Our Focus Areas */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white text-center">What We Do</h2>
          
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-2">1. Community Humanitarian Outreaches</h3>
              <p className="text-slate-300 leading-relaxed">
                Direct food distribution drives, resource allocation, and support initiatives designed to bring immediate relief to families and vulnerable segments of the population.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-2">2. Sustainable Wealth Creation</h3>
              <p className="text-slate-300 leading-relaxed">
                Providing education, skill-building framework, and empowerment resources aimed at helping youth and individuals break cycles of poverty.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-2">3. Transparency & Accountability</h3>
              <p className="text-slate-300 leading-relaxed">
                Ensuring that public donations and partnership resources are accounted for and channeled directly toward impactful grassroot interventions.
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
