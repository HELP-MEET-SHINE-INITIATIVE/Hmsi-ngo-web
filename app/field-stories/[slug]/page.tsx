import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, Handshake } from 'lucide-react';
import Footer from '../../../components/Footer';
import { breadcrumbSchema, fieldStories, fieldStoryBySlug, organizationSchema, programmeBySlug, SITE_URL } from '../../../lib/seoContent';

export const revalidate = 3600;

export function generateStaticParams() {
  return fieldStories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const story = fieldStoryBySlug[(await params).slug];
  if (!story) return { title: 'Field story not found | HMSI', robots: { index: false, follow: false } };
  const url = `${SITE_URL}/field-stories/${story.slug}`;
  return {
    title: `${story.title} | HMSI Field Story`,
    description: story.dek,
    keywords: ['HMSI field story', story.category, 'Nigeria NGO', 'community development Nigeria'],
    alternates: { canonical: url },
    openGraph: { type: 'article', title: `${story.title} | HMSI Field Story`, description: story.dek, url, siteName: 'Help Meet Shine Initiative', locale: 'en_NG', publishedTime: '2026-11-26', authors: ['Help Meet Shine Initiative'], images: [{ url: `${SITE_URL}/images/outreach-10.png`, width: 1200, height: 630, alt: story.title }] },
    twitter: { card: 'summary_large_image', title: `${story.title} | HMSI Field Story`, description: story.dek, images: [`${SITE_URL}/images/outreach-10.png`] },
  };
}

export default async function FieldStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = fieldStoryBySlug[(await params).slug];
  if (!story) return <main className="min-h-[70vh] bg-[#f6f4ef] px-6 py-24 text-center"><h1 className="text-4xl font-black text-[#17221e]">Field story not found</h1><Link href="/field-stories" className="mt-6 inline-flex text-[#1e5b49]">Back to field stories</Link></main>;
  const programme = programmeBySlug[story.programmeSlug];
  const url = `${SITE_URL}/field-stories/${story.slug}`;
  const articleSchema = { '@context': 'https://schema.org', '@type': 'Article', headline: story.title, description: story.dek, url, mainEntityOfPage: { '@type': 'WebPage', '@id': url }, datePublished: '2026-11-26', dateModified: '2026-11-26', author: { '@type': 'Organization', name: 'Help Meet Shine Initiative', url: SITE_URL }, publisher: organizationSchema, articleSection: story.category, image: [`${SITE_URL}/images/outreach-10.png`] };
  return <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Field Stories', path: '/field-stories' }, { name: story.title, path: `/field-stories/${story.slug}` }])) }} /><main><section className="bg-[#17221e] px-6 py-16 text-white sm:py-24"><div className="mx-auto max-w-4xl"><Link href="/field-stories" className="inline-flex items-center gap-2 text-sm font-bold text-white/70 transition hover:text-white"><ArrowLeft size={16} /> Back to field stories</Link><p className="mt-10 text-xs font-black uppercase tracking-[0.22em] text-[#e1ad45]">{story.category} · {story.publishedLabel}</p><h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">{story.title}</h1><p className="mt-7 max-w-3xl text-xl leading-9 text-white/75">{story.dek}</p><p className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60"><CalendarDays size={14} /> Published as an HMSI editorial field note</p></div></section><article className="mx-auto max-w-4xl px-6 py-16 sm:py-24">{story.sections.map((section) => <section key={section.heading} className="mb-12"><h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-5 text-base leading-8 text-[#46574e]">{paragraph}</p>)}</section>)}<section className="rounded-3xl border border-[#cddbcf] bg-[#e9f0e9] p-7"><div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-[#1e5b49]"><Handshake size={16} /> Continue the conversation</div><h2 className="mt-4 text-2xl font-black">Explore the related HMSI programme</h2><p className="mt-3 text-sm leading-7 text-[#46574e]">{programme.description}</p><div className="mt-6 flex flex-wrap gap-4"><Link href={`/programmes/${programme.slug}`} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-white">Read programme page <ArrowRight size={15} /></Link><Link href="/volunteer" className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Volunteer your skills <ArrowRight size={15} /></Link><Link href="/partnerships" className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Partner with HMSI <ArrowRight size={15} /></Link></div></section></article></main><Footer /></div>;
}
