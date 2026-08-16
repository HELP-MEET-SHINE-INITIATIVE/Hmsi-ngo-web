"use client";
import Link from 'next/link';
import Image from 'next/image';
import HmsiHeader from './components/HmsiHeader';
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
    <div className="bg-white min-h-screen text-slate-900 pb-36 font-sans antialiased">      
      {/* Official HMSI Header Component */}
      <HmsiHeader />      
      {/* 1. HERO & DONATION WIDGET */}
      <section className="px-6 lg:px-16 pt-12 pb-16 max-w-4xl mx-auto">
        <h1 className="text-red-700 text-xl md:text-2xl font-bold mb-6 leading-snug">
          Donate today to help provide lifesaving support to vulnerable communities in Nigeria – and wherever the need is greatest.
        </h1>
        <p className="text-red-700 text-lg font-medium mb-10">
          Your gift could help save a life today.
        </p>
        <div className="w-full max-w-lg mx-auto">
          <h2 className="text-3xl md:text-4xl font-black uppercase text-center mb-6 tracking-tighter">
            Donate to Help in Crisis
          </h2>          
          <div className="flex w-full border-2 border-slate-200 mb-4 rounded-sm overflow-hidden">
            <button className="flex-1 bg-red-600 text-white font-bold py-3 text-lg transition-colors">ONE-TIME</button>
            <button className="flex-1 bg-white text-slate-700 font-bold py-3 text-lg hover:bg-slate-50 transition-colors">MONTHLY</button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button className="border-2 border-slate-200 py-3 font-bold text-lg hover:border-slate-400 transition-colors">₦5k</button>
            <button className="border-2 border-slate-200 py-3 font-bold text-lg hover:border-slate-400 transition-colors">₦10k</button>
            <button className="bg-red-600 border-2 border-red-600 text-white py-3 font-bold text-lg">₦20k</button>
            <button className="border-2 border-slate-200 py-3 font-bold text-lg hover:border-slate-400 transition-colors">₦50k</button>
          </div>
          <p className="text-sm text-slate-600 mb-4 text-center font-medium">
            ₦20,000 could purchase a mother and baby essentials kit.
          </p>
          <div className="flex border-2 border-slate-400 mb-6 rounded-sm overflow-hidden focus-within:border-slate-900 transition-colors">
            <span className="px-4 py-3 bg-slate-100 font-bold border-r-2 border-slate-400 text-slate-700">₦</span>
            <input type="text" placeholder="Enter other amount" className="w-full px-4 font-bold text-lg outline-none bg-transparent" />
          </div>
          <button className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-xl py-4 rounded-sm flex justify-center items-center gap-2 transition-colors shadow-sm">
            DONATE NOW
          </button>
        </div>
      </section>
      {/* 2. DYNAMIC OUTREACH GALLERY FROM PNG FILES */}
      <section className="px-6 lg:px-16 py-12 max-w-6xl mx-auto border-t border-slate-100">
        <div className="w-12 h-1 bg-red-600 mb-4"></div>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-8">
          Recent Field Outreaches
        </h2>        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {outreachItems.map((item) => (
            <div key={item.id} className="border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <div className="relative h-56 w-full bg-slate-100">
                <Image 
                  src={item.img} 
                  alt={item.title} 
                  fill 
                  className="object-cover" 
                />
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <p className="text-xs font-bold text-red-600 uppercase mb-1 tracking-wider">{item.category}</p>
                <h3 className="font-bold text-xl leading-snug mb-4 text-slate-900">{item.title}</h3>
                <Link 
                  href={`/outreach/${item.id}`} 
                  className="mt-auto text-red-600 font-bold text-sm uppercase tracking-tight flex items-center gap-1 hover:text-red-700 transition-colors"
                >
                  Learn More &gt;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* STICKY BOTTOM FOOTER */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-800 font-bold uppercase tracking-wide text-xs md:text-sm mb-3">
            HMSI OUTREACH: COMMUNITIES NEED YOUR HELP NOW
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-sm w-full sm:w-auto text-sm transition-colors">
              DONATE ONCE
            </button>
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-sm w-full sm:w-auto text-sm transition-colors">
              GIVE MONTHLY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
