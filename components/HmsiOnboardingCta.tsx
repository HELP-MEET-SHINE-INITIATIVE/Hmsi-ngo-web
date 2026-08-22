'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Globe2,
  HandHeart,
  Laptop,
  MapPinned,
  Megaphone,
  Network,
  SearchCheck,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

const roles = [
  {
    title: 'Digital communications and storytelling',
    ctaKey: 'digital-communications',
    description: 'Create approved social content, campaign updates, visual briefs, and impact stories without exposing private beneficiary information.',
    href: '/volunteer?interest=Media and communications support&utm_source=onboarding&utm_medium=role_cta&utm_campaign=digital_communications',
    label: 'Apply as a volunteer',
    icon: Megaphone,
    tone: 'bg-[#e9eef8] text-[#294d83]',
  },
  {
    title: 'Website, analytics, and accessibility',
    ctaKey: 'website-accessibility',
    description: 'Help improve HMSI’s website experience, search visibility, accessibility checks, and aggregated traffic reporting.',
    href: '/volunteer?interest=Website, analytics and accessibility support&utm_source=onboarding&utm_medium=role_cta&utm_campaign=website_support',
    label: 'Apply as a volunteer',
    icon: Laptop,
    tone: 'bg-[#e9f0e9] text-[#1e5b49]',
  },
  {
    title: 'Grant and partnership research',
    ctaKey: 'grant-partnership-research',
    description: 'Research verified African funding, partnership, and supporter opportunities and maintain a clear eligibility tracker.',
    href: '/volunteer?interest=Partnerships and sponsorship support&utm_source=onboarding&utm_medium=role_cta&utm_campaign=grant_partnership_research',
    label: 'Apply as a volunteer',
    icon: SearchCheck,
    tone: 'bg-[#fff3d7] text-[#916719]',
  },
  {
    title: 'Monitoring, evaluation, and learning',
    ctaKey: 'mel-support',
    description: 'Support practical indicators, evidence registers, programme reporting, and learning reviews for approved HMSI activities.',
    href: '/volunteer?interest=Monitoring, evaluation and learning support&utm_source=onboarding&utm_medium=role_cta&utm_campaign=mel_support',
    label: 'Apply as a volunteer',
    icon: ShieldCheck,
    tone: 'bg-[#f7eadf] text-[#b56b3b]',
  },
  {
    title: 'Translation and regional outreach',
    ctaKey: 'translation-outreach',
    description: 'Support clear English, French, and other approved communications for African and diaspora audiences.',
    href: '/volunteer?interest=Translation and regional outreach&utm_source=onboarding&utm_medium=role_cta&utm_campaign=translation_outreach',
    label: 'Apply as a volunteer',
    icon: Globe2,
    tone: 'bg-[#f8e8ed] text-[#9d3159]',
  },
  {
    title: 'Community outreach and mobilisation',
    ctaKey: 'community-outreach',
    description: 'Help coordinate respectful, supervised outreach, referrals, attendance records, and community feedback in line with HMSI safeguards.',
    href: '/volunteer?interest=Campaign planning and community outreach&utm_source=onboarding&utm_medium=role_cta&utm_campaign=community_outreach',
    label: 'Apply as a volunteer',
    icon: MapPinned,
    tone: 'bg-[#e9f0e9] text-[#1e5b49]',
  },
  {
    title: 'Agriculture, food security, WASH, and livelihoods',
    ctaKey: 'technical-support',
    description: 'Offer technical guidance or field support for approved programmes in agriculture, food security, WASH, and community development.',
    href: '/volunteer?interest=Agriculture, food security, WASH and livelihoods support&utm_source=onboarding&utm_medium=role_cta&utm_campaign=technical_support',
    label: 'Apply as a volunteer',
    icon: HandHeart,
    tone: 'bg-[#fff3d7] text-[#916719]',
  },
  {
    title: 'Fundraising growth and donor communications',
    ctaKey: 'fundraising-growth',
    description: 'Help prepare accurate campaign information, donor updates, partnership briefs, and responsible community promotion using approved HMSI materials.',
    href: '/volunteer?interest=Fundraising ambassador and donor outreach&utm_source=onboarding&utm_medium=role_cta&utm_campaign=fundraising_growth',
    label: 'Join the support team',
    icon: UsersRound,
    tone: 'bg-[#e9eef8] text-[#294d83]',
  },
  {
    title: 'Worker and programme coordination',
    ctaKey: 'worker-coordination',
    description: 'Apply for skilled HMSI work involving field coordination, partnerships, donor communications, logistics, or campaign operations.',
    href: '/worker-apply?interest=Worker support and field operations&utm_source=onboarding&utm_medium=role_cta&utm_campaign=worker_coordination',
    label: 'Apply for worker review',
    icon: BriefcaseBusiness,
    tone: 'bg-[#f7eadf] text-[#b56b3b]',
  },
];

const platforms = [
  {
    name: 'UNV Online Volunteering',
    ctaKey: 'unv-online',
    detail: 'Remote, task-based assignments for eligible civil-society organizations.',
    href: 'https://app.unv.org/?type=online',
    label: 'Open UNV route',
  },
  {
    name: 'AIESEC Global Volunteer',
    ctaKey: 'aiesec-global-volunteer',
    detail: 'Structured youth volunteer projects and organization partnership enquiries.',
    href: 'https://aiesec.org/partners/global-volunteer',
    label: 'Open AIESEC route',
  },
  {
    name: 'Idealist',
    ctaKey: 'idealist',
    detail: 'Post HMSI volunteer opportunities for Africa, diaspora, and remote candidates.',
    href: 'https://www.idealist.org/sign-up-to-post',
    label: 'Open Idealist route',
  },
  {
    name: 'African Union Youth Volunteer Corps',
    ctaKey: 'au-yvc',
    detail: 'Request skilled African youth placements in approved non-profit settings.',
    href: 'https://au.yvc.africa-union.org/',
    label: 'Open AU-YVC route',
  },
  {
    name: 'GlobalGiving Pathway',
    ctaKey: 'globalgiving',
    detail: 'Begin fundraising-readiness and nonprofit due-diligence onboarding.',
    href: 'https://globalgiving.typeform.com/path2gg-survey',
    label: 'Start GlobalGiving',
  },
  {
    name: 'NNNGO membership',
    ctaKey: 'nnngo',
    detail: 'Connect HMSI with Nigeria’s civil-society membership and visibility network.',
    href: 'https://nnngo.org/membership-2/',
    label: 'Review NNNGO route',
  },
  {
    name: 'YALI / YALIServes',
    ctaKey: 'yali',
    detail: 'Reach young African leaders and community-service organizers.',
    href: 'https://yali.state.gov/serves/',
    label: 'Open YALI route',
  },
  {
    name: 'NYSC community development',
    ctaKey: 'nysc',
    detail: 'Explore the official route for permissible supervised local CDS collaboration.',
    href: 'https://www.nysc.gov.ng/cds.html',
    label: 'Review NYSC route',
  },
  {
    name: 'Africa Philanthropy Network',
    ctaKey: 'apn',
    detail: 'Submit an organizational membership enquiry for philanthropy-network access.',
    href: 'https://apn.or.tz/membership/join-us/',
    label: 'Review APN route',
  },
  {
    name: 'WACSI',
    ctaKey: 'wacsi',
    detail: 'Monitor West African civil-society learning, sustainability, and leadership calls.',
    href: 'https://wacsi.org/',
    label: 'Open WACSI route',
  },
  {
    name: 'Nigerian Red Cross',
    ctaKey: 'nigerian-red-cross',
    detail: 'Explore official volunteer and partner routes for relevant humanitarian work.',
    href: 'https://www.redcrossnigeria.org/get-involved/partner-us',
    label: 'Review partner route',
  },
  {
    name: 'Africans Rising',
    ctaKey: 'africans-rising',
    detail: 'Join the Pan-African movement and explore current solidarity opportunities.',
    href: 'https://www.africansrising.org/member/',
    label: 'Open movement route',
  },
];

export default function HmsiOnboardingCta({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? 'border-y border-[#d9d6ce] bg-[#f6f4ef] px-6 py-16' : 'border-y border-[#d9d6ce] bg-[#f6f4ef] px-6 py-20 sm:py-24'} aria-labelledby="hmsi-onboarding-heading">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">HMSI onboarding pathways</p>
            <h2 id="hmsi-onboarding-heading" className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.04em] text-[#17221e] sm:text-5xl">Choose the contribution that fits you.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#66716a]">Apply directly to HMSI for a defined volunteer or worker role, or use an official onboarding route to reach qualified African and diaspora candidates. Every application is reviewed against HMSI’s safeguarding, privacy, and programme standards.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link data-hmsi-cta="direct-volunteer" href="/volunteer?utm_source=onboarding&utm_medium=hub_cta&utm_campaign=direct_volunteer" className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#17221e]">Apply directly <ArrowUpRight size={15} /></Link>
              <Link data-hmsi-cta="direct-worker" href="/worker-apply?utm_source=onboarding&utm_medium=hub_cta&utm_campaign=direct_worker" className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49] transition hover:bg-white">Worker review <ArrowUpRight size={15} /></Link>
            </div>
            <div className="mt-8 flex items-start gap-3 border-t border-[#d9d6ce] pt-5 text-xs leading-5 text-[#66716a]"><Network size={16} className="mt-0.5 shrink-0 text-[#1e5b49]" /><span>External platforms are independent services. HMSI is not an approved partner of any platform until that platform confirms acceptance in writing.</span></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map((role) => {
              const Icon = role.icon;
              return <Link key={role.title} data-hmsi-cta={role.ctaKey} href={role.href} className="group rounded-[26px] border border-[#d9d6ce] bg-white p-5 transition hover:-translate-y-1 hover:border-[#1e5b49] hover:shadow-lg hover:shadow-[#1e5b49]/10"><div className="flex items-start justify-between gap-4"><span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${role.tone}`}><Icon size={21} aria-hidden="true" /></span><ArrowUpRight size={17} className="mt-2 text-[#9aa59d] transition group-hover:translate-x-1 group-hover:text-[#1e5b49]" /></div><h3 className="mt-5 text-lg font-black tracking-tight text-[#17221e]">{role.title}</h3><p className="mt-3 text-sm leading-6 text-[#66716a]">{role.description}</p><span className="mt-5 inline-flex text-xs font-black uppercase tracking-widest text-[#1e5b49]">{role.label}</span></Link>;
            })}
          </div>
        </div>
        <div className="mt-16 border-t border-[#d9d6ce] pt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Official external routes</p><h3 className="mt-3 text-3xl font-black tracking-tight text-[#17221e]">Reach the right onboarding network.</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-[#66716a]">These links take HMSI administrators and applicants to the relevant official platform. Platform approval, availability, fees, deadlines, and placement decisions remain with each platform.</p></div><Link href="/contact?utm_source=onboarding&utm_medium=platform_section&utm_campaign=partner_enquiry" className="inline-flex items-center gap-2 rounded-full bg-[#b56b3b] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#8f4e27]">Ask HMSI a question <ArrowUpRight size={15} /></Link></div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{platforms.map((platform) => <a key={platform.name} data-hmsi-cta={platform.ctaKey} href={platform.href} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-4 rounded-2xl border border-[#d9d6ce] bg-white p-4 transition hover:border-[#1e5b49] hover:shadow-md"><span><span className="block text-sm font-black text-[#17221e]">{platform.name}</span><span className="mt-1 block text-xs leading-5 text-[#66716a]">{platform.detail}</span><span className="mt-3 inline-flex text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{platform.label}</span></span><ArrowUpRight size={16} className="mt-1 shrink-0 text-[#9aa59d] transition group-hover:translate-x-1 group-hover:text-[#1e5b49]" /></a>)}</div></div>
        <p className="mt-10 border-t border-[#d9d6ce] pt-5 text-xs leading-5 text-[#66716a]">HMSI uses approved organizational information, approved campaign materials, and privacy-conscious application handling. Volunteers must not be asked to disclose private beneficiary information or make unapproved fundraising claims.</p>
      </div>
    </section>
  );
}
