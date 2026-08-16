use client";
export const metadata = {
  title: 'Support Our Cause & Donate | Help-Meet Shine Initiative',
  description: 'Partner with Help-Meet Shine Initiative (HMSI) to fund community outreaches, food distribution drives, and sustainable wealth creation programs in Nigeria.',
};
export default function DonatePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-16">        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Support Our Mission
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Your contribution directly powers our community humanitarian outreaches, youth empowerment frameworks, and family support drives across Nigeria.
          </p>
        </div>
        {/* Impact Transparency Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="text-3xl mb-2">🍞</div>
            <h3 className="text-white font-semibold text-lg mb-1">Food Security</h3>
            <p className="text-slate-400 text-sm">Directly supplying food packages to vulnerable households in need.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="text-3xl mb-2">💡</div>
            <h3 className="text-white font-semibold text-lg mb-1">Wealth Creation</h3>
            <p className="text-slate-400 text-sm">Equipping individuals with practical skills and resources to break poverty.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="text-3xl mb-2">🤝</div>
            <h3 className="text-white font-semibold text-lg mb-1">Direct Relief</h3>
            <p className="text-slate-400 text-sm">Deploying safe, organized community grassroots interventions.</p>
          </div>
        </div>
        {/* Secure Donation Channels */}
        <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-900/50 p-8 rounded-2xl space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Ways to Give</h2>
            <p className="text-slate-300 text-sm">Choose the most convenient transfer method for your location.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local / Bank Transfer */}
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🇳🇬</span>
                <h3 className="text-white font-bold text-lg">Bank Transfer (Nigeria)</h3>
              </div>
              <p className="text-slate-300 text-sm">
                Direct transfers are processed securely through our verified corporate NGO account.
              </p>
              <div className="space-y-2 text-sm bg-slate-950 p-4 rounded-lg border border-slate-800/60 font-mono">
                <p className="text-slate-400">Bank Name: <span className="text-white">Insert Bank Name</span></p>
                <p className="text-slate-400">Account Name: <span className="text-white">Help-Meet Shine Initiative</span></p>
                <p className="text-slate-400">Account Number: <span className="text-white">0123456789</span></p>
              </div>
            </div>

            {/* International / Online Gateway */}
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">🌍</span>
                  <h3 className="text-white font-bold text-lg">International & Card Support</h3>
                </div>
                <p className="text-slate-300 text-sm">
                  Support our global campaigns using secure online payment processors and cards.
                </p>
              </div>
              <a 
href="mailto:support@helpmeetshine.org" 
                className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-center rounded-xl transition shadow-lg"
              >
                Contact for International Giving
              </a>
            </div>
          </div>
        </div>
        {/* Accountability Statement */}
        <div className="text-center text-slate-400 text-xs max-w-xl mx-auto leading-relaxed border-t border-slate-900 pt-6">
          Help-Meet Shine Initiative (CAC/IT/125103) is committed to absolute transparency. All resources are utilized strictly for designated community projects and public welfare initiatives.
        </div>
      </div>
    </main>
  );
}