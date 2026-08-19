"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#17221e] selection:bg-[#e1ad45] selection:text-[#17221e]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#17221e] focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>

      <header className="absolute inset-x-0 top-0 z-50 border-b border-white/15 text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-center gap-3" aria-label="HMSI home">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e1ad45] text-xl font-black text-[#17221e] transition-transform duration-200 group-hover:rotate-6">
              H
            </span>
            <span className="hidden border-l border-white/30 pl-3 text-[11px] font-bold uppercase leading-tight tracking-[0.2em] sm:block">
              Help-Meet Shine
              <br />
              Initiative
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold lg:flex" aria-label="Primary navigation">
            <Link className="transition-colors hover:text-[#e1ad45]" href="#stories">Stories</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="#impact">Our impact</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="#ways-to-help">Get involved</Link>
            <Link className="transition-colors hover:text-[#e1ad45]" href="/about">About us</Link>
          </nav>

          <div className="flex items-center gap-3">
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
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-full border border-white/30 p-2.5 transition hover:border-white hover:bg-white/10 lg:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-white/15 bg-[#17221e]/95 px-6 py-6 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col gap-5 text-sm font-semibold">
              <Link href="#stories" onClick={() => setMenuOpen(false)}>Stories</Link>
              <Link href="#impact" onClick={() => setMenuOpen(false)}>Our impact</Link>
              <Link href="#ways-to-help" onClick={() => setMenuOpen(false)}>Get involved</Link>
              <Link href="/about" onClick={() => setMenuOpen(false)}>About us</Link>
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
              Hope is a practice. <span className="text-[#e1ad45]">We show up.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/80 sm:text-xl">
              HMSI stands with communities across Nigeria and beyond—responding to urgent needs, opening doors to opportunity, and helping people shape a future they can believe in.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/donate" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#e1ad45] px-7 py-4 text-sm font-black uppercase tracking-[0.15em] text-[#17221e] transition hover:bg-white">
                Donate now <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
              <Link href="#stories" className="inline-flex items-center justify-center gap-3 rounded-full border border-white/40 px-7 py-4 text-sm font-bold text-white transition hover:border-white hover:bg-white/10">
                See the impact <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className="absolute bottom-10 right-6 hidden w-72 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md xl:block">
            <div className="mb-5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              <span>Field note / 01</span><span className="text-[#e1ad45]">Live</span>
            </div>
            <p className="text-xl font-bold leading-snug">“The strongest response is one that leaves people stronger.”</p>
            <div className="mt-5 flex items-center gap-3 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#e1ad45]" /> Community-led action, Nigeria
            </div>
          </div>
        </div>
      </section>

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

      <div id="main-content">
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

        <section id="stories" className="border-y border-[#d9d6ce] bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">The HMSI field desk</p>
                <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">Stories that move us.</h2>
              </div>
              <Link href="/outreach/1" className="group inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.13em] text-[#1e5b49]">Explore field stories <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <article className="group relative min-h-[520px] overflow-hidden rounded-3xl bg-[#17221e] text-white">
                <Image src="/images/outreach-10.png" alt="HMSI volunteers working with a community" fill className="object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17221e] via-[#17221e]/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                  <span className="rounded-full bg-[#e1ad45] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#17221e]">Featured story</span>
                  <h3 className="mt-5 max-w-2xl text-3xl font-black leading-tight tracking-[-0.03em] sm:text-5xl">When a community leads, relief becomes resilience.</h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/75">From urgent essentials to skills that last, our teams work alongside local leaders to build the next chapter together.</p>
                </div>
              </article>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
                {humanitarianBriefs.map((brief) => (
                  <Link key={brief.title} href={brief.href} className="group grid grid-cols-[0.8fr_1.2fr] gap-4 rounded-3xl border border-[#deded7] bg-[#f6f4ef] p-3 transition hover:-translate-y-1 hover:border-[#1e5b49] sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-[0.8fr_1.2fr]">
                    <div className="relative min-h-[145px] overflow-hidden rounded-2xl">
                      <Image src={brief.image} alt="" fill className="object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-col py-2 pr-2">
                      <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${brief.accent}`}>{brief.category}</span>
                      <h3 className="mt-3 text-lg font-black leading-tight tracking-[-0.02em] text-[#17221e]">{brief.title}</h3>
                      <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-black uppercase tracking-[0.1em] text-[#1e5b49]">Read brief <ChevronRight size={14} /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div className="relative min-h-[520px] overflow-hidden rounded-3xl bg-[#e9f0e9]">
              <Image src="/images/outreach-6.png" alt="A community member participating in HMSI support activities" fill className="object-cover" />
              <div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 p-5 backdrop-blur-sm sm:bottom-8 sm:left-8">
                <p className="text-3xl font-black text-[#1e5b49]">01</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#66716a]">Listen first. Act together.</p>
              </div>
            </div>
            <div className="lg:pl-8">
              <p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Our way of working</p>
              <h2 className="text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-6xl">Local knowledge is the beginning of lasting change.</h2>
              <p className="mt-7 text-lg leading-8 text-[#66716a]">The people closest to a challenge are closest to the answer. HMSI partners with communities to respond to immediate needs while creating pathways to health, skills, education and sustainable livelihoods.</p>
              <div className="mt-9 space-y-4 border-t border-[#d9d6ce] pt-7">
                {["Community leadership at every stage", "Open, accountable use of every gift", "Practical support designed to last"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-bold text-[#17221e]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e1ad45] text-[#17221e]"><Check size={14} strokeWidth={3} /></span>{item}</div>
                ))}
              </div>
              <Link href="/about" className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#17221e] px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#1e5b49]">How we work <ArrowRight size={17} /></Link>
            </div>
          </div>
        </section>

        <section className="bg-[#e9f0e9]">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Voices from the movement</p>
                <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">Change sounds like this.</h2>
              </div>
              <div className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-[#66716a] sm:flex"><Play size={14} fill="currentColor" /> Stories from the field</div>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {storyCards.map((story) => (
                <article key={story.name} className="grid overflow-hidden rounded-3xl bg-white shadow-sm sm:grid-cols-[0.75fr_1.25fr]">
                  <div className="relative min-h-[250px] sm:min-h-full"><Image src={story.image} alt="" fill className="object-cover" /></div>
                  <div className="flex flex-col justify-between p-7 sm:p-9">
                    <div><p className="text-4xl font-serif leading-none text-[#e1ad45]">“</p><blockquote className="mt-2 text-xl font-bold leading-snug text-[#17221e]">{story.quote}</blockquote></div>
                    <div className="mt-8 border-t border-[#deded7] pt-4"><p className="text-sm font-black text-[#1e5b49]">{story.name}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a847c]">{story.place}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="ways-to-help" className="bg-[#17221e] text-white">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="max-w-2xl"><p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-[#e1ad45]">There is a place for you here</p><h2 className="text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-6xl">Ways to turn care into action.</h2></div>
            <div className="mt-14 grid border-l border-white/20 sm:grid-cols-2 lg:grid-cols-4">
              {waysToHelp.map(({ icon: Icon, number, title, text, href }) => (
                <Link key={title} href={href} className="group border-b border-r border-t border-white/20 p-6 transition hover:bg-white/10 sm:p-8 lg:border-b-0">
                  <div className="flex items-center justify-between"><Icon size={25} strokeWidth={1.5} className="text-[#e1ad45]" /><span className="text-xs font-black text-white/40">{number}</span></div>
                  <h3 className="mt-16 text-2xl font-black tracking-[-0.03em]">{title}</h3>
                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-white/65">{text}</p>
                  <span className="mt-7 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-[#e1ad45]">Take the next step <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-10 rounded-3xl bg-[#e1ad45] p-7 sm:p-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:p-16">
            <div><p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#6f4c13]">Every gift is a vote for possibility</p><h2 className="max-w-xl text-4xl font-black leading-[1.03] tracking-[-0.045em] text-[#17221e] sm:text-6xl">Give a little. Change what comes next.</h2><p className="mt-6 max-w-lg text-base leading-7 text-[#4f421f]">We make every contribution count—towards essentials today, opportunity tomorrow, and communities equipped to lead their own way forward.</p><div className="mt-8 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.1em] text-[#4f421f]"><span className="inline-flex items-center gap-2 rounded-full bg-white/40 px-4 py-2"><ShieldCheck size={15} /> Transparent</span><span className="inline-flex items-center gap-2 rounded-full bg-white/40 px-4 py-2"><Check size={15} /> Accountable</span><span className="inline-flex items-center gap-2 rounded-full bg-white/40 px-4 py-2"><Users size={15} /> Community-led</span></div></div>
            <div className="rounded-2xl bg-[#17221e] p-7 text-white sm:p-9"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1ad45]">Where your Paystack gift goes</p><div className="mt-7 space-y-5">{[["94%", "Programmes & direct support", "bg-[#e1ad45]"], ["4%", "Community accountability", "bg-[#6aa58c]"], ["2%", "Operations & learning", "bg-white/50"]].map(([value, label, color]) => <div key={label}><div className="flex justify-between text-sm font-bold"><span>{label}</span><span className="text-[#e1ad45]">{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${color}`} style={{ width: value }} /></div></div>)}</div><Link href="/donate" className="mt-8 flex items-center justify-center gap-2 rounded-full bg-[#e1ad45] px-5 py-4 text-sm font-black uppercase tracking-[0.13em] text-[#17221e] transition hover:bg-white">Give securely with Paystack <ArrowUpRight size={17} /></Link></div>
          </div>
        </section>

        <section className="border-t border-[#d9d6ce] bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <div className="max-w-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Stay close to the work</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Get the good news, straight from the field.</h2></div>
            {subscribed ? <div className="flex items-center gap-3 rounded-2xl bg-[#e9f0e9] px-5 py-4 text-sm font-bold text-[#1e5b49]"><Check size={18} /> You are on the list. Thank you for standing with us.</div> : <form onSubmit={(event) => { event.preventDefault(); setSubscribed(true); }} className="flex w-full max-w-lg flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="newsletter-email">Email address</label><div className="flex flex-1 items-center gap-3 rounded-full border border-[#cfd4ce] bg-[#f6f4ef] px-5"><Mail size={17} className="text-[#66716a]" /><input id="newsletter-email" type="email" required placeholder="Your email address" className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-[#8b958d]" /></div><button type="submit" className="rounded-full bg-[#17221e] px-6 py-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#1e5b49]">Subscribe</button></form>}
          </div>
        </section>
      </div>

      <footer className="bg-[#102019] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_0.6fr_0.6fr_1fr]">
            <div><Link href="/" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e1ad45] text-xl font-black text-[#17221e]">H</span><span className="text-sm font-black uppercase tracking-[0.17em]">HMSI</span></Link><p className="mt-6 max-w-xs text-sm leading-6 text-white/60">A community-rooted humanitarian initiative helping people move from crisis to possibility.</p></div>
            <div><p className="text-xs font-black uppercase tracking-[0.17em] text-[#e1ad45]">Explore</p><div className="mt-5 flex flex-col gap-3 text-sm text-white/70"><Link href="/about" className="transition hover:text-white">About us</Link><Link href="#stories" className="transition hover:text-white">Stories</Link><Link href="#impact" className="transition hover:text-white">Our impact</Link></div></div>
            <div><p className="text-xs font-black uppercase tracking-[0.17em] text-[#e1ad45]">Join in</p><div className="mt-5 flex flex-col gap-3 text-sm text-white/70"><Link href="/donate" className="transition hover:text-white">Donate</Link><Link href="/volunteer" className="transition hover:text-white">Volunteer</Link><Link href="/contact" className="transition hover:text-white">Partner with us</Link></div></div>
            <div><p className="text-xs font-black uppercase tracking-[0.17em] text-[#e1ad45]">Contact</p><p className="mt-5 text-sm leading-6 text-white/70">Lagos, Nigeria<br />support@helpmeetshine.org</p><Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#e1ad45]">Start a conversation <ArrowRight size={14} /></Link></div>
          </div>
          <div className="mt-14 flex flex-col justify-between gap-4 border-t border-white/15 pt-6 text-[11px] font-semibold text-white/40 sm:flex-row"><span>© 2026 Help-Meet Shine Initiative. All rights reserved.</span><span>Built for dignity, action and shared possibility.</span></div>
        </div>
      </footer>
    </main>
  );
}
