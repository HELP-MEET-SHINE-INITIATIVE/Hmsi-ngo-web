import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Handshake, HeartHandshake, Sprout, Users } from 'lucide-react';
import Footer from '../../../components/Footer';
import { breadcrumbSchema, organizationSchema, programmeBySlug, programmes, SITE_URL } from '../../../lib/seoContent';

export const revalidate = 3600;

export function generateStaticParams() {
  return programmes.map((programme) => ({ slug: programme.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const programme = programmeBySlug[(await params).slug];
  if (!programme) return { title: 'Programme not found | HMSI', robots: { index: false, follow: false } };
  const url = `${SITE_URL}/programmes/${programme.slug}`;
  return {
    title: `${programme.title} | HMSI`,
    description: programme.description,
    keywords: programme.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: `${programme.title} | HMSI`,
      description: programme.description,
      url,
      siteName: 'Help Meet Shine Initiative',
      locale: 'en_NG',
      images: [{ url: `${SITE_URL}/images/outreach-10.png`, width: 1200, height: 630, alt: `${programme.shortTitle} community programme` }],
    },
    twitter: { card: 'summary_large_image', title: `${programme.title} | HMSI`, description: programme.description, images: [`${SITE_URL}/images/outreach-10.png`] },
  };
}

export default async function ProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
  const programme = programmeBySlug[(await params).slug];
  if (!programme) return <main className="min-h-[70vh] bg-[#f6f4ef] px-6 py-24 text-center"><h1 className="text-4xl font-black text-[#17221e]">Programme not found</h1><Link href="/programmes" className="mt-6 inline-flex text-[#1e5b49]">View HMSI programmes</Link></main>;
  const url = `${SITE_URL}/programmes/${programme.slug}`;
  const related = programmes.filter((item) => item.slug !== programme.slug);
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: programme.title,
    description: programme.description,
    url,
    about: organizationSchema,
    isPartOf: { '@type': 'WebSite', name: 'Help Meet Shine Initiative', url: SITE_URL },
  };
  return <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Programmes', path: '/programmes' }, { name: programme.shortTitle, path: `/programmes/${programme.slug}` }])) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
    <main>
      <section className="bg-[#17221e] px-6 py-20 text-white sm:py-28"><div className="mx-auto max-w-5xl"><p className="text-xs font-black uppercase tracking-[0.22em] text-[#e1ad45]">HMSI programme in Nigeria</p><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">{programme.title}</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-white/75">{programme.intro}</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/volunteer" className="inline-flex items-center gap-2 rounded-full bg-[#e1ad45] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#17221e]">Volunteer your skills <Users size={15} /></Link><Link href="/partnerships" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-xs font-black uppercase tracking-widest text-white">Partner with HMSI <Handshake size={15} /></Link></div></div></section>
      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-[1fr_280px]"><article className="space-y-12">{programme.sections.map((section) => <section key={section.heading} aria-labelledby={section.heading.toLowerCase().replaceAll(' ', '-')}><h2 id={section.heading.toLowerCase().replaceAll(' ', '-')} className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-5 text-base leading-8 text-[#46574e]">{paragraph}</p>)}{section.bullets && <ul className="mt-6 space-y-3">{section.bullets.map((bullet) => <li key={bullet} className="flex gap-3 text-sm leading-7 text-[#46574e]"><CheckCircle2 className="mt-1 shrink-0 text-[#1e5b49]" size={18} aria-hidden="true" />{bullet}</li>)}</ul>}</section>)}</article><aside className="h-fit rounded-3xl border border-[#cddbcf] bg-[#e9f0e9] p-6 lg:sticky lg:top-28"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#1e5b49]">Who this page is for</p><p className="mt-4 text-sm leading-7 text-[#3c5148]">{programme.audience}</p><div className="mt-7 border-t border-[#cddbcf] pt-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#1e5b49]">Take a next step</p><div className="mt-4 flex flex-col gap-3 text-sm font-bold"><Link href="/get-help" className="inline-flex items-center gap-2 text-[#1e5b49]">Request support <HeartHandshake size={16} /></Link><Link href="/donate" className="inline-flex items-center gap-2 text-[#1e5b49]">Support an approved cause <ArrowRight size={16} /></Link><Link href="/contact" className="inline-flex items-center gap-2 text-[#1e5b49]">Contact HMSI <ArrowRight size={16} /></Link></div></div></aside></section>
      <section className="border-y border-[#d9d6ce] bg-white px-6 py-16 sm:py-20"><div className="mx-auto max-w-5xl"><div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]"><Sprout size={15} /> Explore related work</div><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">More from HMSI programmes</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{related.map((item) => <Link key={item.slug} href={`/programmes/${item.slug}`} className="group rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] p-5 transition hover:-translate-y-1 hover:border-[#1e5b49]"><h3 className="text-xl font-black group-hover:text-[#1e5b49]">{item.shortTitle}</h3><p className="mt-3 text-sm leading-6 text-[#66716a]">{item.description}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Read programme <ArrowRight size={14} /></span></Link>)}</div><div className="mt-10 flex flex-wrap gap-4"><Link href="/field-stories" className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-6 py-3 text-xs font-black uppercase tracking-widest text-white">Read field stories <ArrowRight size={15} /></Link><Link href="/transparency" className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Review transparency <ArrowRight size={15} /></Link></div></div></section>
    </main><Footer />
  </div>;
}
