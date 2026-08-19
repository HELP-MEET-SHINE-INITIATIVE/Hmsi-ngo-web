import Image from 'next/image';
import Link from 'next/link';
import HmsiHeader from '../../../components/HmsiHeader';
export default async function OutreachDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await params for Next.js 15 compatibility
  const resolvedParams = await params;
  const outreachId = resolvedParams.id;
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
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 md:px-16 pb-12">
          <span className="inline-block bg-red-600 text-white text-xs font-bold uppercase px-3 py-1 rounded-full mb-4">
            Outreach Impact Story
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight">
            Bringing Hope and Essential Relief to Vulnerable Communities.
          </h1>
        </div>
      </div>
      {/* MAIN CONTENT GRID */}
      <main className="max-w-7xl mx-auto px-6 md:px-16 pt-12 md:pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">        
        {/* LEFT ARTICLE BODY */}
        <div className="lg:col-span-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 leading-snug">
            In times of crisis, immediate action is required to restore dignity and provide sustainable aid.
          </h2>          
          <div className="text-lg text-slate-700 leading-relaxed space-y-6">
            <p>
              The Help-Meet Shine Initiative (HMSI) recently mobilized our field volunteers to deliver critical support items directly to families who need them the most. Through community-focused outreach, we aim to bridge the gap and ensure no one is left behind.
            </p>
            <p>
              We believe that empowering the youth and supporting rural families creates a ripple effect of positive change.
            </p>
          </div>
          {/* GALLERY */}
          <h3 className="text-2xl font-black uppercase mt-12 mb-6 border-b-2 border-slate-100 pb-3">
            Outreach Gallery
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative h-48 bg-slate-100 rounded-lg overflow-hidden">
              <Image src="/images/outreach-3.png" alt="Outreach photo 1" fill className="object-cover" />
            </div>
            <div className="relative h-48 bg-slate-100 rounded-lg overflow-hidden">
              <Image src="/images/outreach-4.png" alt="Outreach photo 2" fill className="object-cover" />
            </div>
          </div>
        </div>
        {/* RIGHT SIDEBAR: IMPACT & DONATION */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-50 p-8 border border-slate-200 rounded-2xl shadow-sm">
            <h3 className="font-black text-xl uppercase tracking-tight mb-6 text-slate-900">
              Quick Facts
            </h3>
            <ul className="space-y-4 text-slate-700 font-medium">
              <li className="flex justify-between border-b border-slate-200 pb-3">
                <span className="text-slate-500">Outreach ID:</span>
                <span className="font-bold text-slate-900">#{outreachId}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-3">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-green-600">Completed</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Initiative:</span>
                <span className="font-bold text-slate-900">HMSI Mission</span>
              </li>
            </ul>
          </div>
          <div className="bg-red-600 p-8 text-white rounded-2xl shadow-md">
            <h3 className="font-black text-2xl uppercase mb-3">Support Our Next Drive</h3>
            <p className="text-sm font-medium mb-6 leading-relaxed">
              Your donation ensures our trucks stay fueled and our volunteers can reach deeper into isolated communities.
            </p>
            <Link href="/donate" className="block text-center bg-white text-red-600 font-bold py-3 uppercase rounded-xl tracking-wider hover:bg-slate-100 transition">
              Donate Now
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
