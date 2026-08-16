"use client";
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
            Your contribution directly powers our community humanitarian outreaches, youth empowerment, and direct relief efforts.
          </p>
        </div>
        {/* Impact Transparency Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="text-3xl mb-2">🍞</div>
            <h3 className="text-white font-semibold text-lg mb-1">Food Security</h3>
            <p className="text-slate-400 text-sm">Directly supplying food packages to vulnerable households.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="text-3xl mb-2">💡</div>
            <h3 className="text-white font-semibold text-lg mb-1">Wealth Creation</h3>
            <p className="text-slate-400 text-sm">Equipping individuals with practical skills and resources.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="text-3xl mb-2">💎</div>
            <h3 className="text-white font-semibold text-lg mb-1">Direct Relief</h3>
            <p className="text-slate-400 text-sm">Deploying safe, organized community grassroots interventions.</p>
          </div>
        </div>
        {/* Secure Donation Channels */}
        <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-900/50 p-8 rounded-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Ways to Give</h2>
            <p className="text-slate-300 text-sm">Choose the most convenient transfer method for your region.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">            
            {/* Local / Bank Transfer */}
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">🇳🇬</span>
                <h3 className="text-white font-bold text-lg">Bank Transfer (Nigeria)</h3>
              </div>
              <div className="space-y-2 text-sm bg-slate-950 p-4 rounded-lg border border-slate-800/60">
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
                <p className="text-slate-300 text-sm mb-4">
                  For supporters outside Nigeria, please reach out to us directly for secure payment links or international routing.
                </p>
              </div>
              <a
                href="mailto:support@helpmeetshine.org"
                className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-center rounded-lg transition-colors"
              >
                Contact for International Giving
              </a>
            </div>           
          </div>
        </div>
        {/* Accountability Statement */}
        <div className="text-center text-slate-400 text-xs max-w-xl mx-auto leading-relaxed border-t border-slate-800/60 pt-8">
          Help-Meet Shine Initiative (CAC/IT/125103) is committed to absolute transparency. All resources are directly routed to project execution and verified beneficiaries.
        </div>
      </div>
    </main>
  );
}
