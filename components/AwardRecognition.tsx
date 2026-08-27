import { ArrowUpRight, Award } from 'lucide-react';

const AWARD_TITLE = '2020 Entrepreneurship Support NGO of the Year – West Africa';
const AWARD_SOURCE = 'African Excellence Awards';
const AWARD_SOURCE_URL = 'https://meamarkets.digital/winners/help-meet-shine-initiative-2/';

export default function AwardRecognition({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs leading-5 text-white/65">
        <Award size={17} className="shrink-0 text-[#e1ad45]" aria-hidden="true" />
        <span>
          <strong className="text-white">2020 {AWARD_SOURCE} winner</strong> · {AWARD_TITLE.replace('2020 ', '')}
        </span>
      </div>
    );
  }

  return (
    <section aria-labelledby="award-recognition-heading" className="border-y border-[#d9d6ce] bg-[#f3eee2]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.8fr_auto] lg:items-center lg:px-12 lg:py-14">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#17221e] text-[#e1ad45]" aria-hidden="true">
            <Award size={27} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Recognition</p>
            <h2 id="award-recognition-heading" className="mt-1 text-xl font-black tracking-tight text-[#17221e]">A milestone we are proud to share.</h2>
          </div>
        </div>
        <div>
          <p className="text-2xl font-black leading-tight tracking-[-0.02em] text-[#17221e] sm:text-3xl">{AWARD_TITLE}</p>
          <p className="mt-2 text-sm leading-6 text-[#66716a]">Recognized through the {AWARD_SOURCE}. This recognition is presented as an organizational milestone and does not replace current programme evidence or independent due diligence.</p>
        </div>
        <a href={AWARD_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#1e5b49] transition hover:bg-[#e9f0e9]">
          View listing <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

export { AWARD_TITLE, AWARD_SOURCE, AWARD_SOURCE_URL };
