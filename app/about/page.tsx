import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: 'Our Story & Mission | About HMSI',
  description: 'Learn about the Help Meet Shine Initiative (HMSI) story, our mission to restore hope, and how we empower communities across Nigeria through humanitarian aid and sustainable wealth creation.',
  openGraph: {
    title: 'Our Story & Mission | HMSI',
    description: 'Learn about the Help Meet Shine Initiative (HMSI) story, our mission to restore hope, and how we empower communities across Nigeria.',
    url: 'https://www.hmsi.org.ng/about',
  },
  alternates: {
    canonical: 'https://www.hmsi.org.ng/about',
  },
};

export default function AboutPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': 'https://www.hmsi.org.ng',
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'About Us',
        'item': 'https://www.hmsi.org.ng/about',
      },
    ],
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    'name': 'Help Meet Shine Initiative',
    'legalName': 'The Incorporated Trustees of HELP-MEET SHINE INITIATIVE',
    'url': 'https://www.hmsi.org.ng/about',
    'logo': 'https://www.hmsi.org.ng/logo.png',
    'description': 'HMSI provides humanitarian assistance, education, empowerment, livelihoods, and sustainable community development across Nigeria and Africa.',
    'foundingDate': '2019-02-21',
    'identifier': 'CAC/IT/NO 125103',
    'taxID': '21249981',
    'award': 'MEA Award for Most Productive NGO (2022)',
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': 'Benin City',
      'addressRegion': 'Edo State',
      'addressCountry': 'Nigeria',
    },
  };

  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      {/* PAGE HEADER */}
      <div className="bg-slate-50 py-16 md:py-24 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-slate-900 mb-6">
            Empowering Communities. <br/><span className="text-red-600">Restoring Dignity.</span>
          </h1>
          <p className="text-lg md:text-xl font-medium text-slate-600 max-w-2xl mx-auto">
            We exist to support vulnerable and underserved communities in Nigeria through humanitarian assistance, education, empowerment, livelihoods, and sustainable community development.
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
      <section className="bg-slate-50 border-y border-slate-200 py-16 px-6 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600 mb-4">Trust & accountability</p>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-4">Built to serve responsibly.</h2>
            <p className="text-lg leading-relaxed text-slate-600">HMSI is committed to transparent governance, responsible stewardship, safeguarding, and measurable community outcomes. The information below is provided for partners, donors, volunteers, and community members.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white border border-slate-200 p-6 md:p-8">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-5">Legal & leadership</h3>
              <dl className="space-y-4 text-sm text-slate-600">
                <div><dt className="font-black uppercase tracking-widest text-slate-400">Registered name</dt><dd className="mt-1 text-slate-900">The Incorporated Trustees of HELP-MEET SHINE INITIATIVE</dd></div>
                <div><dt className="font-black uppercase tracking-widest text-slate-400">CAC registration</dt><dd className="mt-1 text-slate-900">CAC/IT/NO 125103 · Incorporated 21 February 2019</dd></div>
                <div><dt className="font-black uppercase tracking-widest text-slate-400">Headquarters</dt><dd className="mt-1 text-slate-900">Benin City, Edo State, Nigeria</dd></div>
                <div><dt className="font-black uppercase tracking-widest text-slate-400">Board of Trustees</dt><dd className="mt-1 text-slate-900">Mary Ogbeide; Godspower Folorunsho Adebusoye</dd></div>
                <div><dt className="font-black uppercase tracking-widest text-slate-400">Executive leadership</dt><dd className="mt-1 text-slate-900">Godspower Folorunsho Adebusoye, President</dd></div>
                <div><dt className="font-black uppercase tracking-widest text-slate-400">Tax identification</dt><dd className="mt-1 text-slate-900">TIN 21249981 · Federal Inland Revenue Service</dd></div>
              </dl>
            </div>
            <div className="bg-slate-900 text-white p-6 md:p-8">
              <h3 className="text-xl font-black uppercase tracking-tight mb-5">Capability at a glance</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><p className="text-3xl font-black text-teal-400">7 meals</p><p className="mt-1 text-sm text-slate-300">served per $1 donated, according to HMSI’s operating measure</p></div>
                <div><p className="text-3xl font-black text-teal-400">100+</p><p className="mt-1 text-sm text-slate-300">domestic and expatriate field team members</p></div>
                <div><p className="text-3xl font-black text-teal-400">2022</p><p className="mt-1 text-sm text-slate-300">MEA Award for Most Productive NGO</p></div>
                <div><p className="text-3xl font-black text-teal-400">5+</p><p className="mt-1 text-sm text-slate-300">cross-cutting intervention areas</p></div>
              </div>
              <p className="mt-7 border-t border-white/15 pt-5 text-sm leading-6 text-slate-300">Our focus includes food security and zero hunger, poverty alleviation and wealth creation, crisis response, agriculture, WASH, gender equality, youth empowerment, climate resilience, and peace and conflict resolution.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/transparency" className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-sm uppercase tracking-widest transition-colors">View transparency</Link>
            <Link href="/partnerships" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-sm uppercase tracking-widest transition-colors">Partner with HMSI</Link>
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
          <Link href="/donate" className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-10 rounded-sm uppercase tracking-widest transition-colors">
            Make a Donation
          </Link>
          <Link href="/volunteer" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-10 rounded-sm uppercase tracking-widest transition-colors">
            Become a Volunteer
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
