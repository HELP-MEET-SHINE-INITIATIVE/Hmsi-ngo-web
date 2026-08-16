import Link from 'next/link';

export default function HmsiHeader() {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* NGO Brand / Logo Text */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xl">
            H
          </div>
          <div>
            <span className="block font-black text-lg md:text-xl tracking-tight leading-none text-slate-900">
              HELP-MEET SHINE
            </span>
            <span className="block text-xs font-bold text-red-600 uppercase tracking-widest mt-1">
              Initiative (HMSI)
            </span>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link 
            href="/donate" 
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-2.5 rounded-sm flex items-center gap-2 shadow-sm transition-colors text-sm md:text-base"
          >
            <span>♥</span> DONATE
          </Link>
          <button className="text-slate-700 hover:text-black p-2 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
}
