import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const outreachItems = [
    { id: 1, img: '/images/outreach-1.png', title: 'Community Support Drive', category: 'Humanitarian' },
    { id: 2, img: '/images/outreach-2.png', title: 'Youth Empowerment Initiative', category: 'Skills' },
    { id: 3, img: '/images/outreach-3.png', title: 'Medical Outreach Program', category: 'Healthcare' },
    { id: 4, img: '/images/outreach-4.png', title: 'Rural Family Relief', category: 'Welfare' },
    { id: 5, img: '/images/outreach-5.png', title: 'Educational Materials Distribution', category: 'Education' },
    { id: 6, img: '/images/outreach-6.png', title: 'Sustainable Development Workshop', category: 'Empowerment' },
  ];

  return (
    <div className="bg-white min-h-screen text-slate-900 pb-36 font-sans">
      
      {/* HEADER */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xl">
              H
            </div>
            <div>
              <span className="block font-black text-lg tracking-tight leading-none text-slate-900">
                HELP-MEET SHINE
              </span>
              <span className="block text-xs font-bold text-red-600 uppercase tracking-widest mt-1">
                Initiative (HMSI)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-teal-500 text-white font-bold px-5 py-2.5 rounded-sm text-sm">
              DONATE
            </span>
          </div>
        </div>
      </header>
      
      {/* HERO SECTION */}
      <section className="px-6 pt-12 pb-16 max-w-4xl mx-auto">
        <h1 className="text-red-700 text-2xl md:text-3xl font-bold mb-6 leading-snug">
          Donate today to help provide lifesaving support to vulnerable communities in Nigeria – and wherever the need is greatest.
        </h1>
        <p className="text-red-700 text-lg font-medium mb-10">
          Your gift could help save a life today.
        </p>

        <div className="w-full max-w-lg mx-auto bg-slate-50 p-6 border border-slate-200 rounded-sm shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black uppercase text-center mb-6 tracking-tighter text-slate-900">
            Donate to Help in Crisis
          </h2>
          
          <div className="flex w-full border-2 border-slate-200 mb-4 rounded-sm overflow-hidden bg-white">
            <button className="flex-1 bg-red-600 text-white font-bold py-3 text-sm">ONE-TIME</button>
            <button className="flex-1 bg-white text-slate-700 font-bold py-3 text-sm">MONTHLY</button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <button className="bg-white border-2 border-slate-200 py-3 font-bold text-sm">₦5k</button>
            <button className="bg-white border-2 border-slate-200 py-3 font-bold text-sm">₦10k</button>
            <button className="bg-red-600 border-2 border-red-600 text-white py-3 font-bold text-sm">₦20k</button>
            <button className="bg-white border-2 border-slate-200 py-3 font-bold text-sm">₦50k</button>
          </div>

          <button className="w-full bg-teal-500 text-white font-bold text-lg py-4 rounded-sm mt-4">
            DONATE NOW
          </button>
        </div>
      </section>

      {/* OUTREACH GRID */}
      <section className="px-6 py-12 max-w-6xl mx-auto border-t border-slate-200">
        <div className="w-12 h-1 bg-red-600 mb-4"></div>
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-8 text-slate-900">
          Recent Field Outreaches
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {outreachItems.map((item) => (
            <div key={item.id} className="border border-slate-200 overflow-hidden bg-white shadow-sm">
              <div className="relative h-56 w-full bg-slate-100">
                <Image src={item.img} alt={item.title} fill className="object-cover" />
              </div>
              <div className="p-5">
                <p className="text-xs font-bold text-red-600 uppercase mb-1">{item.category}</p>
                <h3 className="font-bold text-xl text-slate-900">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-900 font-bold uppercase text-xs md:text-sm mb-3">
            HMSI OUTREACH: COMMUNITIES NEED YOUR HELP NOW
          </p>
          <div className="flex gap-3 justify-center">
            <button className="bg-red-600 text-white font-bold py-2 px-6 text-sm rounded-sm">DONATE ONCE</button>
            <button className="bg-red-600 text-white font-bold py-2 px-6 text-sm rounded-sm">GIVE MONTHLY</button>
          </div>
        </div>
      </div>

    </div>
  );
}
