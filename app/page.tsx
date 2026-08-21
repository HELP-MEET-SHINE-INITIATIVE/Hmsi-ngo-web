"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "../components/Footer";
import FundraiserCard from "../components/FundraiserCard";
import type { Fundraiser } from "../lib/fundraisers";
import OpportunityFlash from "../components/OpportunityFlash";
import NewsFlash from "../components/NewsFlash";
import FundraiserFlash from "../components/FundraiserFlash";
import FieldStoryFlash from "../components/FieldStoryFlash";
import HomepageFeaturedStoryCard from "../components/HomepageFeaturedStoryCard";
import HomepageHelpCta from "../components/HomepageHelpCta";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Globe2,
  HeartHandshake,
  Mail,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  HelpCircle,
  Info,
  CheckCircle2,
  Globe
} from "lucide-react";

const humanitarianBriefs = [
  {
    category: "Nigeria / Field desk",
    title: "A community-led response is helping families rebuild after the floods",
    excerpt:
      "Local volunteers are pairing emergency relief with practical recovery support so families can move from survival to stability.",
    image: "/images/outreach-8.png",
    href: "/outreach/1",
    accent: "bg-[#e9f3ee] text-[#1e5b49]",
  },
  {
    category: "Global / Humanitarian brief",
    title: "Why dignity belongs at the centre of every relief response",
    excerpt:
      "Across crisis settings, the strongest interventions listen first, act locally, and stay long enough to see change take root.",
    image: "/images/outreach-2.png",
    href: "/about",
    accent: "bg-[#f7eadf] text-[#a4512e]",
  },
  {
    category: "Youth / Opportunity",
    title: "Skills, solidarity and the next generation of community leaders",
    excerpt:
      "Young people are transforming neighbourhoods when they have the tools, trust and networks to lead from where they are.",
    image: "/images/outreach-5.png",
    href: "/volunteer",
    accent: "bg-[#e9eef8] text-[#294d83]",
  },
];

const waysToHelp = [
  {
    icon: HeartHandshake,
    number: "01",
    title: "Give with purpose",
    text: "Your gift helps put essentials, opportunity and dignity within reach.",
    href: "/donate",
  },
  {
    icon: Users,
    number: "02",
    title: "Volunteer your time",
    text: "Bring your skills to the field and join people building change locally.",
    href: "/volunteer",
  },
  {
    icon: Globe2,
    number: "03",
    title: "Partner for impact",
    text: "Connect your organisation to a focused, accountable community network.",
    href: "/contact",
  },
  {
    icon: Sparkles,
    number: "04",
    title: "Share the story",
    text: "Help more people see what is possible when communities lead together.",
    href: "/contact",
  },
];

const storyCards = [
  {
    quote:
      "The support did not stop at a food package. We were listened to, respected and given a path forward.",
    name: "Amina, community member",
    place: "Northern Nigeria",
    image: "/images/outreach-4.png",
  },
  {
    quote:
      "I came to volunteer for one weekend. I stayed because I saw how much changes when people work side by side.",
    name: "Daniel, HMSI volunteer",
    place: "Lagos, Nigeria",
    image: "/images/outreach-7.png",
  },
];

function ImpactCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let current = 0;
    const step = Math.max(1, Math.ceil(target / 36));
    const timer = window.setInterval(() => {
      current = Math.min(target, current + step);
      setValue(current);
      if (current >= target) window.clearInterval(timer);
    }, 32);

    return () => window.clearInterval(timer);
  }, [target]);

  return (
    <span>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterError, setNewsletterError] = useState('');
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [approvedFundraisers, setApprovedFundraisers] = useState<Fundraiser[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/fundraisers', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Fundraisers are temporarily unavailable.');
        if (isMounted) setApprovedFundraisers(result.fundraisers || []);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  const topImpactFundraisers = [...approvedFundraisers]
    .sort((first, second) => second.raisedAmount - first.raisedAmount || new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 3);

  const handleNewsletterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewsletterBusy(true);
    setNewsletterError('');
    try {
      const response = await fetch('/api/newsletter/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newsletterEmail }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Newsletter signup is temporarily unavailable.');
      setSubscribed(true);
      setNewsletterEmail('');
    } catch (error) {
      setNewsletterError(error instanceof Error ? error.message : 'Newsletter signup is temporarily unavailable.');
    } finally {
      setNewsletterBusy(false);
    }
  };

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
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': 'How do I get financial help from HMSI?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'You can get help by clicking the "Get Help Now" button and submitting a fundraiser request. Our team will verify your request and once approved, it will be live for donors to support.',
        },
      },
      {
        '@type': 'Question',
        'name': 'Is it free to post a help request?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Yes, HMSI is a non-profit platform. We do not charge any fees for posting help requests or receiving donations.',
        },
      },
      {
        '@type': 'Question',
        'name': 'How are donations processed?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'All donations are processed securely through Paystack. Funds are then disbursed directly to the verified cause or service provider (e.g., hospital for medical bills).',
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#17221e] selection:bg-[#e1ad45] selection:text-[#17221e]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#17221e] focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>

      <header className="absolute inset-x-0 top-0 z-50 border-b border-white/15 text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-center gap-3" aria-label="HMSI home">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#272178] shadow-sm transition-transform duration-200 group-hover:scale-105"><Image src="/logo.png" alt="HMSI logo" width={48} height={48} priority className="h-full w-full object-cover" /></span>
            <span className="hidden border-l border-white/30 pl-3 text-[11px] font-bold uppercase leading-tight tracking-[0.2em] sm:block">
              Help-Meet Shine
              <br />
              Initiative
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex" aria-label="Primary navigation">
            <Link className="transition-colors hover:text-[#e1ad45]" href="/donate">Donate</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="/fundraise">Support a cause</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="/impact">Top impact</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="/news">News</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="/volunteer">Volunteer</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="/worker-apply">Work with HMSI</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="/opportunities">Opportunities</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="/about">About us</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-full border border-white/35 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-white hover:bg-white/10 sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="hidden rounded-full bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#17221e] transition hover:bg-[#e1ad45] sm:inline-flex"
            >
              Sign up
            </Link>
            <Link
              href="/donate"
              className="hidden rounded-full bg-[#e1ad45] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#17221e] shadow-lg shadow-black/10 transition hover:bg-white sm:inline-flex"
            >
              Donate now
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="homepage-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full border border-white/30 p-3 transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="homepage-mobile-menu" className="border-t border-white/15 bg-[#17221e]/95 px-6 py-6 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col gap-5 text-sm font-semibold">
              <Link href="/donate" onClick={() => setMenuOpen(false)}>Donate</Link>
              <Link href="/fundraise" onClick={() => setMenuOpen(false)}>Support a cause</Link>
              <Link href="/impact" onClick={() => setMenuOpen(false)}>Top impact</Link>
              <Link href="/news" onClick={() => setMenuOpen(false)}>News</Link>
              <Link href="/volunteer" onClick={() => setMenuOpen(false)}>Volunteer</Link>
              <Link href="/worker-apply" onClick={() => setMenuOpen(false)}>Work with HMSI</Link>
              <Link href="/opportunities" onClick={() => setMenuOpen(false)}>Opportunities</Link>
              <Link href="#stories" onClick={() => setMenuOpen(false)}>Stories</Link>
              <Link href="#impact" onClick={() => setMenuOpen(false)}>Our impact</Link>
              <Link href="#start-here" onClick={() => setMenuOpen(false)}>How to help</Link>
              <Link href="/about" onClick={() => setMenuOpen(false)}>About us</Link>
              <div className="flex flex-wrap gap-3 border-t border-white/15 pt-5">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="inline-flex rounded-full border border-white/35 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">Log in</Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)} className="inline-flex rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#17221e]">Sign up</Link>
              </div>
              <Link href="/donate" onClick={() => setMenuOpen(false)} className="mt-2 inline-flex w-fit rounded-full bg-[#e1ad45] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#17221e]">Donate now</Link>
            </div>
          </nav>
        )}
      </header>

      <section className="relative isolate min-h-[720px] overflow-hidden bg-[#17221e] text-white lg:min-h-[790px]">
        <Image
          src="/images/outreach-1.png"
          alt="HMSI volunteers delivering support in a local community"
          fill
          priority
          className="object-cover object-center opacity-65"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#17221e] via-[#17221e]/75 to-[#17221e]/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#17221e] via-transparent to-[#17221e]/30" />
        <div className="relative mx-auto flex min-h-[720px] max-w-[1440px] items-end px-5 pb-16 pt-36 sm:px-8 lg:min-h-[790px] lg:px-12 lg:pb-24">
          <div className="max-w-3xl">
            <p className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.25em] text-[#e1ad45]">
              <span className="h-px w-10 bg-[#e1ad45]" /> Humanitarian news & action
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-[6.6rem]">
              Donate. Volunteer. <span className="text-[#e1ad45]">Help communities thrive.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/80 sm:text-xl">
              Help Meet Shine Initiative (HMSI) is an NGO in Nigeria and Africa. Donate to our work, support a verified cause, volunteer your skills, or partner with us to create lasting community change.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/donate" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#e1ad45] px-7 py-4 text-sm font-black uppercase tracking-[0.15em] text-[#17221e] transition hover:bg-white">
                Donate to HMSI <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
              <Link href="/fundraise" className="inline-flex items-center justify-center gap-3 rounded-full border border-white/40 px-7 py-4 text-sm font-bold text-white transition hover:border-white hover:bg-white/10">
                Support a verified cause <ArrowRight size={17} />
              </Link>
              <Link href="/volunteer" className="inline-flex items-center justify-center gap-3 rounded-full border border-[#e1ad45]/70 px-7 py-4 text-sm font-bold text-[#e1ad45] transition hover:border-[#e1ad45] hover:bg-[#e1ad45]/10">
                Volunteer with HMSI <Users size={17} />
              </Link>
            </div>
          </div>

          <div className="absolute bottom-10 right-6 hidden w-72 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md xl:block">
            <div className="mb-5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              <span>Field note / 01</span><span className="text-[#e1ad45]">Live</span>
            </div>
            <p className="text-xl font-bold leading-snug">&ldquo;The strongest response is one that leaves people stronger.&rdquo;</p>
            <div className="mt-5 flex items-center gap-3 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#e1ad45]" /> Community-led action, Nigeria
            </div>
          </div>
        </div>
      </section>

      <HomepageHelpCta />
      <OpportunityFlash />
      <FundraiserFlash />
      <FieldStoryFlash />
      <NewsFlash />

      <div className="border-b border-[#d9d6ce] bg-[#f6f4ef]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#d9d6ce] sm:grid-cols-4">
          {[
            ["12", "states reached"],
            ["48k+", "people supported"],
            ["100%", "community-led"],
            ["2018", "founded in Nigeria"],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-6 text-center sm:px-8 sm:py-8">
              <p className="text-2xl font-black tracking-tight text-[#1e5b49] sm:text-3xl">{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6c766f]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <section id="start-here" aria-labelledby="start-here-heading" className="border-b border-[#d9d6ce] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#b56b3b]">Choose your next step</p>
            <h2 id="start-here-heading" className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#17221e] sm:text-6xl">Find the clearest way to help.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#66716a]">Whether you want to donate to NGO work, support a verified person or cause, volunteer your skills, or partner with HMSI, start here.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { href: '/donate', label: 'Donate to NGO work', text: 'Give securely to HMSI’s humanitarian mission across Nigeria and Africa.', action: 'Make a donation' },
              { href: '/fundraise', label: 'Support a verified cause', text: 'Browse fundraising requests and choose a need you want to help solve.', action: 'Browse causes' },
              { href: '/volunteer', label: 'Volunteer with HMSI', text: 'Bring your time, skills, and local knowledge to community-led work.', action: 'Become a volunteer' },
              { href: '/contact', label: 'Partner with HMSI', text: 'Connect your organization, network, or resources to practical NGO work.', action: 'Start a conversation' },
            ].map((pathway) => (
              <Link key={pathway.href} href={pathway.href} className="group rounded-[28px] border border-[#d9d6ce] bg-[#f6f4ef] p-7 transition hover:-translate-y-1 hover:border-[#1e5b49] hover:bg-[#e9f0e9] hover:shadow-xl hover:shadow-[#1e5b49]/10">
                <h3 className="text-xl font-black tracking-tight text-[#17221e]">{pathway.label}</h3>
                <p className="mt-3 min-h-[72px] text-sm leading-6 text-[#66716a]">{pathway.text}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">{pathway.action} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div id="main-content">
        {/* HOW IT WORKS SECTION */}
        <section className="py-24 px-6 bg-white border-b border-[#d9d6ce]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <p className="text-[#b56b3b] text-xs font-black uppercase tracking-[0.25em] mb-4">The Process</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#17221e]">How It Works</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  step: "01",
                  title: "Submit Your Need",
                  desc: "Tell us your story. Whether it's medical bills, education support, or emergency housing, we are here to listen.",
                  icon: Info
                },
                {
                  step: "02",
                  title: "Verification",
                  desc: "Our field team verifies every request to ensure transparency and build trust with our global donor community.",
                  icon: ShieldCheck
                },
                {
                  step: "03",
                  title: "Receive Support",
                  desc: "Once approved, your fundraiser goes live. Donations are collected securely and disbursed directly to solve the problem.",
                  icon: CheckCircle2
                }
              ].map((item, i) => (
                <div key={i} className="relative p-10 rounded-[40px] bg-[#f6f4ef] border border-[#d9d6ce] group hover:border-[#1e5b49] transition-all">
                  <div className="text-6xl font-black text-[#1e5b49]/10 absolute top-8 right-10 group-hover:text-[#1e5b49]/20 transition-colors">{item.step}</div>
                  <item.icon size={40} className="text-[#e1ad45] mb-8" />
                  <h3 className="text-2xl font-black mb-4">{item.title}</h3>
                  <p className="text-[#66716a] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-16 text-center">
              <Link href="/fundraise/create" className="inline-flex items-center gap-2 text-[#1e5b49] font-black uppercase tracking-widest text-sm hover:underline">
                Start your help request today <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section id="impact" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Numbers with names behind them</p>
              <h2 className="max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-[#17221e] sm:text-6xl">Impact is more than a number. It is a life with more room to grow.</h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-[#66716a] lg:justify-self-end">We measure what matters: people reached, communities strengthened and the practical support that helps families move forward with dignity.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-[#cbd2ca] sm:grid-cols-2 lg:grid-cols-4">
            {[
              [48000, "+", "people supported"],
              [126, "", "community projects"],
              [12, "", "states reached"],
              [94, "%", "funds to programmes"],
            ].map(([target, suffix, label]) => (
              <div key={label as string} className="bg-[#e9f0e9] p-8 sm:p-10">
                <p className="text-5xl font-black tracking-[-0.06em] text-[#1e5b49] sm:text-6xl"><ImpactCounter target={target as number} suffix={suffix as string} /></p>
                <p className="mt-5 max-w-[140px] text-xs font-black uppercase leading-5 tracking-[0.14em] text-[#657169]">{label as string}</p>
              </div>
            ))}
          </div>
        </section>

        {topImpactFundraisers.length > 0 && <section id="top-impact-fundraisers" className="border-y border-[#d9d6ce] bg-[#f6f4ef]">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Top impact fundraising</p>
                <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">The causes moving furthest, together.</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#66716a]">Support the approved fundraisers with the strongest progress and help take their work the final mile.</p>
              </div>
              <Link href="/impact" className="group inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.13em] text-[#1e5b49]">See top impact causes <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{topImpactFundraisers.map((fundraiser, index) => <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} rankLabel={`#${index + 1} top raised`} />)}</div>
          </div>
        </section>}


        <section id="stories" className="border-y border-[#d9d6ce] bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">The HMSI field desk</p>
                <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">Stories that move us.</h2>
              </div>
              <Link href="#featured-stories" className="group inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.13em] text-[#1e5b49]">Explore field stories <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <HomepageFeaturedStoryCard />

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
                {humanitarianBriefs.map((brief) => (
                  <Link key={brief.title} href={brief.href} className="group grid grid-cols-[0.8fr_1.2fr] gap-4 rounded-3xl border border-[#deded7] bg-[#f6f4ef] p-3 transition hover:-translate-y-1 hover:border-[#1e5b49] sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-[0.8fr_1.2fr]">
                    <div className="relative min-h-[145px] overflow-hidden rounded-2xl">
                      <Image src={brief.image} alt="" fill className="object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-col py-2 pr-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#b56b3b]">{brief.category}</span>
                      <h4 className="mt-2 text-sm font-black leading-tight group-hover:text-[#1e5b49]">{brief.title}</h4>
                      <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-[#66716a]">{brief.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-24 px-6 bg-[#e9f0e9]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[#b56b3b] text-xs font-black uppercase tracking-[0.25em] mb-4">Common Questions</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#17221e]">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-6">
              {[
                {
                  q: "How do I get financial help from HMSI?",
                  a: "You can get help by clicking the 'Get Help Now' button and submitting a fundraiser request. Our team will verify your request and once approved, it will be live for donors to support."
                },
                {
                  q: "Is it free to post a help request?",
                  a: "Yes, HMSI is a non-profit platform. We do not charge any fees for posting help requests or receiving donations. We are committed to ensuring 100% of donations reach the intended cause."
                },
                {
                  q: "How are donations processed?",
                  a: "All donations are processed securely through Paystack. Funds are then disbursed directly to the verified cause or service provider (e.g., hospital for medical bills) to ensure proper usage."
                },
                {
                  q: "Can I volunteer for HMSI?",
                  a: "Absolutely! We are always looking for passionate individuals to join our field teams. Visit our Volunteer page to apply and become a force for good."
                }
              ].map((faq, i) => (
                <div key={i} className="bg-white p-8 rounded-[32px] border border-[#d9d6ce]">
                  <h3 className="text-lg font-black mb-4 flex items-center gap-3">
                    <HelpCircle size={20} className="text-[#e1ad45]" /> {faq.q}
                  </h3>
                  <p className="text-[#66716a] leading-relaxed pl-8">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ways-to-help" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Join the movement</p>
              <h2 className="text-4xl font-black leading-[1.02] tracking-[-0.04em] text-[#17221e] sm:text-6xl">There are many ways to stand with us.</h2>
              <p className="mt-8 max-w-lg text-lg leading-8 text-[#66716a]">Whether you give, volunteer or partner, your involvement helps communities move from crisis to possibility.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {waysToHelp.map((way) => (
                <Link key={way.title} href={way.href} className="group relative overflow-hidden rounded-[32px] border border-[#d9d6ce] bg-white p-8 transition hover:border-[#1e5b49] hover:shadow-xl hover:shadow-[#1e5b49]/5">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="rounded-2xl bg-[#f6f4ef] p-3 text-[#1e5b49] transition group-hover:bg-[#1e5b49] group-hover:text-white">
                      <way.icon size={24} />
                    </div>
                    <span className="text-xs font-black text-[#d9d6ce]">{way.number}</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{way.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#66716a]">{way.text}</p>
                  <div className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">
                    Learn more <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#17221e] py-20 text-white">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="flex flex-col items-center justify-between gap-10 rounded-[48px] bg-[#1e5b49] p-10 sm:p-16 lg:flex-row lg:p-20">
              <div className="max-w-xl text-center lg:text-left">
                <h2 className="text-4xl font-black leading-tight tracking-[-0.03em] sm:text-5xl">Stay informed on the impact we are making.</h2>
                <p className="mt-6 text-lg text-white/70">Join our newsletter for monthly field updates, success stories and ways to get involved.</p>
              </div>
              <div className="w-full max-w-md">
                {subscribed ? (
                  <div className="rounded-3xl bg-white/10 p-8 text-center backdrop-blur-md">
                    <Check className="mx-auto mb-4 text-[#e1ad45]" size={40} />
                    <p className="text-xl font-bold">Thank you for joining us!</p>
                    <p className="mt-2 text-sm text-white/60">You are now part of the HMSI community.</p>
                  </div>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(event) => setNewsletterEmail(event.target.value)}
                      placeholder="Email address"
                      className="flex-1 rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm font-medium text-white outline-none backdrop-blur-md transition focus:border-[#e1ad45] focus:bg-white/20"
                    />
                    <button disabled={newsletterBusy} type="submit" className="rounded-full bg-[#e1ad45] px-8 py-4 text-sm font-black uppercase tracking-widest text-[#17221e] transition hover:bg-white disabled:cursor-wait disabled:opacity-60">{newsletterBusy ? 'Joining…' : 'Join'}</button>
                  </form>
                )}
                {newsletterError && <p className="mt-3 text-sm font-bold text-[#ffd2c8]" role="alert">{newsletterError}</p>}
                <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/40 lg:text-left">No spam. Just hope. Unsubscribe anytime.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mb-16 text-center">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Radical transparency</p>
            <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">Your trust is our foundation.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Where the money goes", text: "94% of all donations go directly to our humanitarian programmes and community projects.", icon: ShieldCheck },
              { title: "Accountable to you", text: "We provide regular, detailed reports on every project, so you see the impact of your gift.", icon: Mail },
              { title: "Community-led", text: "We work with local leaders to ensure our interventions are relevant, effective and lasting.", icon: Users },
            ].map((item) => (
              <div key={item.title} className="rounded-[40px] border border-[#d9d6ce] bg-white p-10 text-center">
                <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9f0e9] text-[#1e5b49]">
                  <item.icon size={32} />
                </div>
                <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-[#66716a]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
