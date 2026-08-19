import type { Metadata } from 'next';
import Image from 'next/image';
import HmsiHeader from '../../components/HmsiHeader';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Story & Mission',
  description: 'Learn about the Help Meet Shine Initiative (HMSI) story, our mission to restore hope, and how we empower communities across Nigeria.',
  openGraph: {
    title: 'Our Story & Mission | HMSI',
    description: 'Learn about the Help Meet Shine Initiative (HMSI) story, our mission to restore hope, and how we empower communities across Nigeria.',
    url: 'https://www.hmsi.org.ng/about',
  },
};

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans antialiased">
      <HmsiHeader />
      {/* PAGE HEADER */}
      <div className="bg-slate-50 py-16 md:py-24 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-slate-900 mb-6">
            Empowering Communities. <br/><span className="text-red-600">Restoring Hope.</span>
          </h1>
          <p className="text-lg md:text-xl font-medium text-slate-600 max-w-2xl mx-auto">
            We exist to bridge the gap for vulnerable demographics in Nigeria, offering a hand-up rather than just a hand-out through humanitarian aid and sustainable wealth creation.
          </p>
        </div>
      </div>
      {/* EDITORIAL STORY SECTION */}
      <section className="py-16 md:py-24 px-6 max-w-6xl mx-auto">
        <div className="prose prose-lg prose-slate max-w-none text-slate-700">          
          <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-8 border-l-8 border-red-600 pl-4">Our Story</h2>          
          <div className="clearfix">
            {/* FLOATING IMAGE - LEFT */}
            <div className="md:float-left md:w-[45%] md:mr-10 md:mb-6 mb-8">
              <div className="relative h-[400px] w-full bg-slate-200">
                <Image 
                  src="/images/outreach-6.png" 
                  alt="HMSI Core Mission" 
                  fill 
                  className="object-cover shadow-lg"
                />
              </div>
              <p className="text-xs font-bold uppercase text-slate-400 mt-3 tracking-widest text-center">
                HMSI Field Operations, Nigeria
              </p>
            </div>
            <p className="mb-6 leading-relaxed">
              The Help-Meet Shine Initiative (HMSI) was founded on the fundamental belief that every human being deserves dignity, access to basic necessities, and the opportunity to build a self-sustaining future. In regions severely affected by economic hardship and lack of infrastructure, we serve as a beacon of hope.
            </p>
            <p className="mb-6 leading-relaxed">
              Our approach is holistic. We do not stop at delivering emergency food supplies and medical interventions. We stay back to equip youths, mothers, and local entrepreneurs with the skills required for sustainable wealth creation. By addressing both the symptoms of poverty and its root causes, we create enduring change.
            </p>
            <p className="mb-6 leading-relaxed">
              From our administrative hubs to our front-line field volunteers, HMSI operates with transparency, urgency, and deep compassion. Over the years, we have grown from a localized effort into a highly coordinated non-governmental organization capable of executing massive community outreach programs across multiple states.
            </p>
          </div>
        </div>
      </section>
      {/* MISSION & VISION GRID */}
      <section className="bg-slate-900 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">          
          <div>
            <div className="w-12 h-1 bg-red-600 mb-6"></div>
            <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">Our Mission</h3>
            <p className="text-lg text-slate-300 leading-relaxed">
              To provide immediate humanitarian support to crisis-stricken areas while aggressively equipping individuals with educational materials, skills, and resources necessary for sustainable, long-term wealth creation.
            </p>
          </div>
          <div>
            <div className="w-12 h-1 bg-teal-500 mb-6"></div>
            <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">Our Vision</h3>
            <p className="text-lg text-slate-300 leading-relaxed">
              A Nigeria where no community is left vulnerable to extreme poverty, and where every youth and family has the capacity to shine and positively impact their local economy.
            </p>
          </div>
        </div>
      </section>
      {/* CTA SECTION */}
      <section className="py-24 px-6 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-6 text-slate-900">Join the Movement</h2>
        <p className="text-lg text-slate-600 mb-10">We cannot do this alone. Your financial support and your time are critical to our ongoing mission.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-10 rounded-sm uppercase tracking-widest transition-colors">
            Make a Donation
          </Link>
          <Link href="/volunteer" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-10 rounded-sm uppercase tracking-widest transition-colors">
            Become a Volunteer
          </Link>
        </div>
      </section>
    </div>
  );
}