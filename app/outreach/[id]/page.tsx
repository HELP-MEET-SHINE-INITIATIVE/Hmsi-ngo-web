import Image from 'next/image';
import Link from 'next/link';
import HmsiHeader from '../../components/HmsiHeader';

export default function OutreachDetail({ params }: { params: { id: string } }) {
  // Simulating database fetch based on the ID
  const outreachId = params.id;
  
  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans antialiased pb-20">
      <HmsiHeader />
      
      {/* IMMERSIVE HERO SECTION */}
      <div className="relative w-full h-[50vh] md:h-[65vh] bg-slate-900">
        <Image 
          src={`/images/outreach-${outreachId}.png`} 
          alt="Outreach Cover" 
          fill 
          className="object-cover opacity-60" 
          // Fallback if image 7-10 don't exist: fallback to 1
          onError={(e: any) => e.target.src = '/images/outreach-1.png'}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-16 max-w-7xl mx-auto">
          <span className="bg-red-600 text-white text-xs md:text-sm font-bold uppercase tracking-widest py-1 px-3 w-max mb-4">
            Field Report
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-4xl tracking-tighter">
            Bringing Hope and Essential Relief to Vulnerable Communities.
          </h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 md:px-16 pt-12 md:pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT ARTICLE BODY */}
        <div className="lg:col-span-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 leading-snug">
            In times of crisis, immediate action is required to restore dignity and provide sustainable pathways for survival.
          </h2>
          
          <div className="text-lg text-slate-700 leading-relaxed space-y-6">
            <p>
              The Help-Meet Shine Initiative (HMSI) recently mobilized our field volunteers to deliver critical support. By partnering with local community leaders, we identified the most vulnerable families who lacked access to basic humanitarian essentials, healthcare, and educational materials.
            </p>
            
            {/* FLOATING IMAGE IN TEXT */}
            <div className="md:float-right md:w-1/2 md:ml-8 md:mb-4 mt-4 relative h-64 md:h-80 border-l-4 border-red-600">
              <Image 
                src="/images/outreach-2.png" 
                alt="Community Support" 
                fill 
                className="object-cover" 
              />
            </div>
            
            <p>
              Our strategy is not just about short-term relief; it is about equipping individuals for sustainable wealth creation. During this outreach, we provided tailored aid packages that addressed both immediate nutritional needs and long-term skill development. 
            </p>
            <p>
              We believe that empowering the youth and supporting rural families creates a ripple effect that uplifts the entire nation. Through workshops, medical checks, and the distribution of educational materials, we are laying the foundation for a brighter, self-sufficient future.
            </p>
          </div>

          {/* GALLERY */}
          <h3 className="text-2xl font-black uppercase mt-12 mb-6 border-b-2 border-slate-100 pb-2">Outreach Gallery</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative h-48 bg-slate-100"><Image src="/images/outreach-3.png" alt="Gallery 1" fill className="object-cover" /></div>
            <div className="relative h-48 bg-slate-100"><Image src="/images/outreach-4.png" alt="Gallery 2" fill className="object-cover" /></div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: IMPACT & DONATION */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-50 p-8 border border-slate-200">
            <h3 className="font-black text-xl uppercase tracking-tight mb-6 text-slate-900">Outreach Impact</h3>
            <ul className="space-y-6">
              <li className="flex flex-col">
                <span className="text-4xl font-black text-red-600">500+</span>
                <span className="text-sm font-bold uppercase text-slate-600">Families Reached</span>
              </li>
              <li className="flex flex-col">
                <span className="text-4xl font-black text-red-600">1,200</span>
                <span className="text-sm font-bold uppercase text-slate-600">Relief Packs Distributed</span>
              </li>
              <li className="flex flex-col">
                <span className="text-4xl font-black text-red-600">35</span>
                <span className="text-sm font-bold uppercase text-slate-600">Volunteers Mobilized</span>
              </li>
            </ul>
          </div>

          <div className="bg-red-600 p-8 text-white">
            <h3 className="font-black text-2xl uppercase mb-3">Support Our Next Drive</h3>
            <p className="text-sm font-medium mb-6">Your donation ensures our trucks stay fueled and our relief supplies remain stocked for the next community in need.</p>
            <Link href="/" className="block text-center bg-white text-red-600 font-bold py-3 uppercase tracking-wide hover:bg-slate-100 transition-colors">
              Donate Now
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
