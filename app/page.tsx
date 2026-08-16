import Image from 'next/image';
import Link from 'next/link';
import HmsiHeader from '@/components/HmsiHeader';
export default function Home() {
  const donationAmounts = ['₦5,000', '₦10,000', '₦20,000', '₦50,000']; 
  const outreachItems = [
    {
      id: 1,
      img: '/images/outreach-1.png',
      title: 'Community Support Drive',
      category: 'Humanitarian'
    },
    {
      id: 2,
      img: '/images/outreach-2.png',
      title: 'Youth Empowerment Initiative',
      category: 'Skills'
    },
    {
      id: 3,
      img: '/images/outreach-3.png',
      title: 'Medical Outreach Program',
      category: 'Healthcare'
    },
    {
      id: 4,
      img: '/images/outreach-4.png',
      title: 'Rural Family Relief',
      category: 'Welfare'
    },
    {
      id: 5,
      img: '/images/outreach-5.png',
      title: 'Educational Materials Distribution',
      category: 'Education'
    },
    {
      id: 6,
      img: '/images/outreach-6.png',
      title: 'Sustainable Development Workshop',
      category: 'Empowerment'
    }
  ];
  return (
    <div className="bg-white min-h-screen text-slate-900 pb-36 font-sans antialiased">
      <HmsiHeader />
      {/* 1. HERO & DONATION WIDGET */}
      <section className="px-6 lg:px-16 pt-12 pb-16 max-w-4xl mx-auto">
        <h1 className="text-red-700 text-xl md:text-2xl font-bold mb-6 leading-snug">
          Donate today to help provide lifesaving support to vulnerable communities in Nigeria.
        </h1>
        <p className="text-red-700 text-lg font-medium mb-10">
          Your gift could help save a life today.
        </p>
        <div className="w-full max-w-lg mx-auto bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-3xl md:text-4xl font-black uppercase text-center mb-6 tracking-tight text-slate-900">
            Donate to Help in Crisis
          </h2>
          <div className="flex w-full border-2 border-slate-200 mb-4 rounded-xl overflow-hidden bg-slate-100">
            <button className="flex-1 bg-red-600 text-white font-bold py-3 text-lg transition">
              DONATE ONCE
            </button>
            <button className="flex-1 bg-white text-slate-700 font-bold py-3 text-lg hover:bg-slate-100 transition">
              GIVE MONTHLY
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {donationAmounts.map((amount, idx) => (
              <button 
                key={idx} 
                className={`py-3 font-bold text-lg rounded-xl border-2 transition ${
                  idx === 2 
                    ? 'bg-red-600 border-red-600 text-white shadow-md' 
                    : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-600 mb-6 text-center font-medium">
            ₦20,000 could purchase a mother and baby essentials kit.
          </p>
          <div className="flex border-2 border-slate-300 mb-6 rounded-xl overflow-hidden focus-within:border-red-600 transition">
            <span className="px-4 py-3 bg-slate-100 font-bold border-r-2 border-slate-300 text-slate-600 flex items-center">
              ₦
            </span>
            <input 
              type="text" 
              placeholder="Enter other amount" 
              className="w-full px-4 font-bold text-slate-900 focus:outline-none"
            />
          </div>
          <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xl py-4 rounded-xl uppercase tracking-wider shadow-lg transition">
            DONATE NOW
          </button>
        </div>
      </section>
      {/* 2. DYNAMIC OUTREACH GALLERY */}
      <section className="px-6 lg:px-16 py-12 max-w-6xl mx-auto border-t border-slate-100">
        <div className="w-12 h-1 bg-red-600 mb-4" />
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-8 text-slate-900">
          Recent Field Outreaches
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {outreachItems.map((item) => (
            <div 
              key={item.id} 
              className="border border-slate-200 overflow-hidden bg-white rounded-2xl shadow-sm hover:shadow-md flex flex-col transition"
            >
              <div className="relative h-56 w-full bg-slate-100">
                <Image 
                  src={item.img} 
                  alt={item.title} 
                  fill 
                  className="object-cover"
                />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <p className="text-xs font-bold text-red-600 uppercase mb-1 tracking-wider">
                  {item.category}
                </p>
                <h3 className="font-bold text-xl leading-snug mb-6 text-slate-900">
                  {item.title}
                </h3>
                <Link 
                  href={`/outreach/${item.id}`}
                  className="mt-auto text-red-600 font-bold text-sm uppercase tracking-tight flex items-center gap-1 hover:text-red-700 transition"
                >
                  Learn More &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
