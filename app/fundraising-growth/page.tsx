import type { Metadata } from 'next';
import Link from 'next/link';
import FundraisingGrowthHub from '../../components/FundraisingGrowthHub';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: 'Fundraising Growth and Campaign Volunteers | HMSI',
  description: 'Help HMSI reach more donors through approved community fundraising, campaign planning, partnerships, and volunteer outreach.',
  alternates: { canonical: 'https://www.hmsi.org.ng/fundraising-growth' },
};

const campaignIdeas = [
  ['Monthly giving circle', 'Invite a small group of recurring donors to support HMSI’s approved programme work. Use a clear monthly goal and share a short, verified update after each reporting period.'],
  ['Peer-to-peer cause drive', 'A volunteer or worker can choose an approved campaign, create a simple personal fundraising page or share plan, and invite friends, colleagues, or community members to support it through the official link.'],
  ['Workplace or community partnership', 'A company, school, faith community, association, or local group can sponsor an approved activity, provide in-kind support, or match donations under a documented agreement.'],
  ['Story-led donor update', 'Use an approved field story, image, and campaign progress update to explain the need, the response, and the next practical step without exposing private beneficiary information.'],
];

export default function FundraisingGrowthPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <section className="bg-[#17221e] px-6 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e1ad45]">HMSI growth team</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-7xl">Build campaigns people can trust.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">HMSI is building a practical network of donors, volunteers, workers, and partners who can help approved campaigns reach more people. The goal is not louder fundraising. It is clearer information, responsible outreach, and better follow-through.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/fundraise" className="rounded-full bg-[#e1ad45] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#17221e] transition hover:bg-white">Browse approved causes</Link>
            <Link href="/volunteer?interest=Fundraising ambassador and donor outreach&utm_source=growth_page&utm_medium=cta&utm_campaign=fundraising_ambassadors" className="rounded-full border border-white/30 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10">Become an ambassador</Link>
            <Link href="/worker-apply?interest=Fundraising, partnerships and campaign operations&utm_source=growth_page&utm_medium=cta&utm_campaign=campaign_workers" className="rounded-full border border-[#e1ad45]/70 px-6 py-3 text-xs font-black uppercase tracking-widest text-[#e1ad45] transition hover:bg-[#e1ad45]/10">Apply as a campaign worker</Link>
          </div>
        </div>
      </section>

      <FundraisingGrowthHub compact />

      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Campaign formats</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Reasonable campaigns start with a clear ask.</h2>
          <p className="mt-5 text-lg leading-8 text-[#66716a]">These are starting formats for HMSI’s approved campaign team. Each campaign should be reviewed internally before it is promoted, and every budget or outcome should come from current HMSI records.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {campaignIdeas.map(([title, text], index) => (
            <article key={title} className="rounded-[30px] border border-[#d9d6ce] bg-white p-7">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#1e5b49]">0{index + 1}</span>
              <h3 className="mt-4 text-2xl font-black tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#66716a]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d9d6ce] bg-white px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">What campaign teams receive</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">A clear brief, approved assets, and a reporting rhythm.</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-[#66716a]">
            <p><strong className="text-[#17221e]">Before launch:</strong> the campaign purpose, target, approved images and copy, donation link, owner, timeline, and escalation contact.</p>
            <p><strong className="text-[#17221e]">During outreach:</strong> tracked links, accurate progress updates, respectful donor responses, and a simple record of partner or community activity.</p>
            <p><strong className="text-[#17221e]">After the campaign:</strong> a close-out note, donor acknowledgement where appropriate, lessons learned, and evidence of how the campaign was communicated.</p>
            <p className="border-l-4 border-[#e1ad45] bg-[#fff8e8] p-4 text-[#6c571d]">HMSI does not guarantee fundraising results. Campaign teams must use official donation channels and must not make personal promises about beneficiaries, outcomes, or disbursement.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h2 className="text-4xl font-black tracking-tight">Ready to help HMSI reach the right supporters?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#66716a]">Start with an approved cause, join the volunteer network, or apply to support campaign operations as a worker.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/fundraise" className="rounded-full bg-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-white">Support a cause</Link>
          <Link href="/volunteer?interest=Campaign planning and community outreach" className="rounded-full border border-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Volunteer</Link>
          <Link href="/contact?topic=Fundraising%20partnership" className="rounded-full border border-[#d9d6ce] bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-[#17221e]">Discuss a partnership</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
