import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, HeartHandshake, Camera, LifeBuoy, Megaphone, ShieldCheck, UsersRound } from 'lucide-react';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: 'HMSI on Instagram | Donate, Volunteer & Support Communities',
  description: 'Find clear ways to support Help Meet Shine Initiative through approved causes, volunteering, community support, and responsible fundraising.',
  alternates: { canonical: 'https://www.hmsi.org.ng/instagram' },
  openGraph: {
    title: 'Help Meet Shine Initiative | Start with HMSI on Instagram',
    description: 'Support approved HMSI causes, volunteer, request help, or join responsible fundraising outreach.',
    url: 'https://www.hmsi.org.ng/instagram',
    type: 'website',
  },
};

const actions = [
  {
    title: 'Support an approved cause',
    description: 'Browse current HMSI fundraising opportunities and choose a cause that matches how you want to help.',
    href: '/fundraise?utm_source=instagram&utm_medium=landing_cta&utm_campaign=hmsi_ig_fundraising',
    icon: HeartHandshake,
    label: 'Browse approved causes',
    tone: 'bg-[#e1ad45] text-[#17221e]',
  },
  {
    title: 'Volunteer with HMSI',
    description: 'Offer your time, skills, or community outreach support through the official volunteer application.',
    href: '/volunteer?utm_source=instagram&utm_medium=landing_cta&utm_campaign=hmsi_ig_volunteer',
    icon: UsersRound,
    label: 'Become a volunteer',
    tone: 'bg-[#1e5b49] text-white',
  },
  {
    title: 'Request community support',
    description: 'Use the secure Get Help page to share a support request for review by HMSI.',
    href: '/get-help?utm_source=instagram&utm_medium=landing_cta&utm_campaign=hmsi_ig_get_help',
    icon: LifeBuoy,
    label: 'Open Get Help',
    tone: 'bg-[#b56b3b] text-white',
  },
  {
    title: 'Help campaigns reach more people',
    description: 'Join the responsible fundraising and campaign-support pathway for approved HMSI work.',
    href: '/fundraising-growth?utm_source=instagram&utm_medium=landing_cta&utm_campaign=hmsi_ig_growth',
    icon: Megaphone,
    label: 'Explore campaign support',
    tone: 'bg-[#f6f4ef] text-[#17221e] border border-[#d9d6ce]',
  },
];

export default function InstagramTrafficPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <section className="bg-[#17221e] px-6 pb-20 pt-16 text-white sm:pb-28 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3 text-[#e1ad45]">
            <Camera size={22} aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-[0.22em]">HMSI from Instagram</p>
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-7xl">One clear next step can turn attention into action.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">Welcome to Help Meet Shine Initiative. Choose the path that fits how you want to support communities: donate to an approved cause, volunteer, request help, or join responsible campaign outreach.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/fundraise?utm_source=instagram&utm_medium=hero_cta&utm_campaign=hmsi_ig_fundraising" className="inline-flex items-center gap-2 rounded-full bg-[#e1ad45] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#17221e] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#e1ad45] focus:ring-offset-2 focus:ring-offset-[#17221e]">Support an approved cause <ArrowUpRight size={16} aria-hidden="true" /></Link>
            <a href="https://www.instagram.com/hmsinitiative/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#e1ad45]">Follow @hmsinitiative <Camera size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24" aria-labelledby="instagram-actions-title">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Choose your path</p>
          <h2 id="instagram-actions-title" className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Start with the action you came for.</h2>
          <p className="mt-5 text-lg leading-8 text-[#66716a]">These links are built for Instagram profile, story, Reel, and campaign traffic. They use privacy-safe campaign labels so HMSI can understand which public pages attract interest.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <article key={action.title} className="flex min-h-[250px] flex-col justify-between rounded-[30px] border border-[#d9d6ce] bg-white p-7">
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f0e9] text-[#1e5b49]"><Icon size={22} aria-hidden="true" /></span>
                  <h3 className="mt-6 text-2xl font-black tracking-tight">{action.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-7 text-[#66716a]">{action.description}</p>
                </div>
                <Link href={action.href} className={`mt-8 inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 text-xs font-black uppercase tracking-widest transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2 ${action.tone}`}>{action.label} <ArrowUpRight size={16} aria-hidden="true" /></Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#d9d6ce] bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Share responsibly</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">Clear information builds better support.</h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-[#66716a]">
            <p className="flex gap-3"><ShieldCheck className="mt-1 shrink-0 text-[#1e5b49]" size={19} aria-hidden="true" /><span>Use HMSI’s official links, approved campaign copy, and current updates when sharing from Instagram.</span></p>
            <p className="flex gap-3"><ShieldCheck className="mt-1 shrink-0 text-[#1e5b49]" size={19} aria-hidden="true" /><span>Do not publish private beneficiary information, promise fundraising results, or suggest that donations create a personal financial return.</span></p>
            <p className="flex gap-3"><ShieldCheck className="mt-1 shrink-0 text-[#1e5b49]" size={19} aria-hidden="true" /><span>HMSI’s first-party analytics reports aggregated traffic sources and page activity; it does not expose raw visitor identities in the admin view.</span></p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
        <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Ready to take the next step?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#66716a]">Visit the official HMSI page that matches your goal, then share the same trusted link with your community.</p>
        <Link href="/contact?utm_source=instagram&utm_medium=footer_cta&utm_campaign=hmsi_ig_contact" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#17221e] focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2">Contact HMSI <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </section>

      <Footer />
    </main>
  );
}
