import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '../../components/Footer';
import AwardRecognition from '../../components/AwardRecognition';

export const metadata: Metadata = {
  title: 'Our Story & Mission | About HMSI',
  description: 'Learn about Help Meet Shine Initiative (HMSI), its stated activities, governance, public registration information, and 2020 Entrepreneurship Support NGO of the Year – West Africa recognition.',
  openGraph: {
    title: 'Our Story & Mission | HMSI',
    description: 'Public information about Help Meet Shine Initiative (HMSI), including its stated activities, governance, location in Nigeria, and 2020 Entrepreneurship Support NGO of the Year – West Africa recognition.',
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
    'description': 'HMSI describes its activities as humanitarian assistance, education, empowerment, livelihoods, and community development in Nigeria and Africa.',
    'foundingDate': '2019-02-21',
    'identifier': 'CAC/IT/NO 125103',
    'taxID': '21249981',
    'award': '2020 Entrepreneurship Support NGO of the Year – West Africa',
    'sameAs': [
      'https://www.instagram.com/hmsinitiative/',
      'https://www.facebook.com/@hmsinitiative/',
      'https://www.linkedin.com/company/help-meet-shine-initiative/',
    ],
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
            Help Meet Shine Initiative
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
              Help Meet Shine Initiative (HMSI) describes its work as supporting vulnerable and underserved communities through humanitarian assistance, education, empowerment, livelihoods, and community development.
            </p>
            <p className="mb-6 leading-relaxed">
              HMSI states that its approach combines humanitarian assistance with social-development, livelihoods, and community-participation activities, adapted to the needs of the communities with which it works.
            </p>
            <p className="mb-6 leading-relaxed">
              HMSI publishes information about its governance, partnerships, safeguarding arrangements, and programme documentation. The organization states that these materials are intended to support due diligence by partners and communities.
            </p>
          </div>
        </div>
      </section>
      <section aria-labelledby="name-meaning-heading" className="bg-white border-b border-slate-200 py-16 px-6 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600 mb-4">Why the name matters</p>
            <h2 id="name-meaning-heading" className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-4">Help Meet. Shine. Initiative.</h2>
            <p className="text-lg leading-relaxed text-slate-600">Our name is a statement of how we serve: by walking alongside people, helping potential become visible, and organizing practical support for lasting community impact.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <article className="border-t-4 border-red-600 bg-slate-50 p-6 md:p-8">
              <p className="text-4xl font-black text-red-600">01</p>
              <h3 className="mt-5 text-xl font-black uppercase tracking-tight text-slate-900">Help Meet</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Drawn from the Biblical framing of a suitable helper, partner, or companion, “Help Meet” reflects collaboration, support, upliftment, and walking alongside people rather than acting from above them.</p>
            </article>
            <article className="border-t-4 border-teal-500 bg-slate-50 p-6 md:p-8">
              <p className="text-4xl font-black text-teal-600">02</p>
              <h3 className="mt-5 text-xl font-black uppercase tracking-tight text-slate-900">Shine</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">“Shine” speaks of transformation, visibility, potential, and success: helping individuals and communities move from hardship or obscurity toward dignity, confidence, and recognized value.</p>
            </article>
            <article className="border-t-4 border-amber-500 bg-slate-50 p-6 md:p-8">
              <p className="text-4xl font-black text-amber-600">03</p>
              <h3 className="mt-5 text-xl font-black uppercase tracking-tight text-slate-900">Initiative</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">“Initiative” gives the vision an organized structure. It positions HMSI as a purposeful nonprofit and social-impact enterprise committed to responsible action, partnership, and sustainable service.</p>
            </article>
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
                <div><dt className="font-black uppercase tracking-widest text-slate-400">FIRS tax identification</dt><dd className="mt-1 text-slate-900">TIN 21249981 · FIRS taxpayer-results record; not a tax-exemption certificate</dd></div>
              </dl>
            </div>
            <div className="bg-slate-900 text-white p-6 md:p-8">
              <h3 className="text-xl font-black uppercase tracking-tight mb-5">Capability at a glance</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><p className="text-3xl font-black text-teal-400">7 meals</p><p className="mt-1 text-sm text-slate-300">HMSI-reported measure; reporting period and methodology require confirmation</p></div>
                <div><p className="text-3xl font-black text-teal-400">100+</p><p className="mt-1 text-sm text-slate-300">HMSI-reported field-team figure; category and reporting period require confirmation</p></div>
                <div><p className="text-3xl font-black text-teal-400">2022</p><p className="mt-1 text-sm text-slate-300">HMSI-reported award year; independent award evidence requires confirmation</p></div>
                <div><p className="text-3xl font-black text-teal-400">SDG 1 & 2</p><p className="mt-1 text-sm text-slate-300">core development alignment</p></div>
              </div>
              <p className="mt-7 border-t border-white/15 pt-5 text-sm leading-6 text-slate-300">Our focus includes food security and zero hunger, poverty alleviation and wealth creation, crisis response, agriculture, WASH, gender equality, youth empowerment, climate resilience, and peace and conflict resolution.</p>
              <p className="mt-5 text-sm leading-6 text-slate-300"><strong className="text-white">Registered objects include:</strong> empowerment and poverty alleviation; care for orphans, destitute and less privileged people; shelter, education, clothing and social amenities; scholarships; skills training; integrity, accountability and transparency; and fundraising through donations and contributions.</p>
              <p className="mt-4 text-xs leading-5 text-slate-400">The object summary is transcribed from a supplied CAC application scan. It is not a substitute for the full governing document.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/transparency" className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-sm uppercase tracking-widest transition-colors">View transparency</Link>
            <Link href="/partnerships" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-sm uppercase tracking-widest transition-colors">Partner with HMSI</Link>
          </div>
        </div>
      </section>
      <AwardRecognition />
      {/* MISSION & VISION GRID */}
      <section className="bg-slate-900 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">          
          <div>
            <div className="w-12 h-1 bg-red-600 mb-6"></div>
            <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">Our Mission</h3>
            <p className="text-lg text-slate-300 leading-relaxed">
              To strengthen people and communities through practical humanitarian, social-development and empowerment initiatives delivered responsibly and in partnership with relevant stakeholders.
            </p>
          </div>
          <div>
            <div className="w-12 h-1 bg-teal-500 mb-6"></div>
            <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">Our Vision</h3>
            <p className="text-lg text-slate-300 leading-relaxed">
              A stronger and more resilient society where vulnerable people and communities have improved opportunities, dignity and pathways to sustainable wellbeing.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-6 md:py-20">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600 mb-4">Core values</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-8">How we aim to work.</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[['Integrity', 'We act honestly and responsibly with people, partnerships and resources.'], ['Dignity', 'We treat every beneficiary and stakeholder with respect and compassion.'], ['Accountability', 'We accept responsibility for decisions, resources, programmes and results.'], ['Inclusion', 'We promote participation and opportunity without discrimination.'], ['Service', 'We are committed to meaningful community service and sustainable social impact.'], ['Partnership', 'We believe lasting impact is strengthened through collaboration.'], ['Stewardship', 'We manage resources responsibly and respect donor and community trust.'], ['Compassion', 'We respond to community needs with empathy and practical action.']].map(([title, text]) => <article key={title} className="bg-white border border-slate-200 p-6"><h3 className="font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
          </div>
        </div>
      </section>
      {/* CTA SECTION */}
      <section className="py-24 px-6 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-6 text-slate-900">Ways to support HMSI</h2>
        <p className="text-lg text-slate-600 mb-10">Visitors can learn about HMSI’s work, make a donation, or apply to volunteer.</p>
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
