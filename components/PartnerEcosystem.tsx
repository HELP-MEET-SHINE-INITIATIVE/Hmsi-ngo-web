import { ArrowUpRight, BookOpen, Globe2, Handshake, ShieldCheck } from 'lucide-react';

const partnerConnections = [
  {
    name: 'Nigeria Network of NGOs (NNNGO)',
    category: 'Network engagement evidenced',
    description: 'A national civil-society membership and advocacy network referenced in HMSI invitations, member materials, and civic-society learning correspondence.',
    href: 'https://nnngo.org/',
    icon: Handshake,
  },
  {
    name: 'West Africa Civil Society Institute (WACSI)',
    category: 'Learning and capacity connection',
    description: 'A regional civil-society learning hub referenced in HMSI training and newsletter materials. The public source lists programmes, publications, events, and capacity work.',
    href: 'https://wacsi.org/',
    icon: BookOpen,
  },
  {
    name: 'TechSoup',
    category: 'Learning resource referenced',
    description: 'Referenced through digital-safety and security learning materials. A WACSI public article describes a WACSI–TechSoup capacity-building collaboration; HMSI does not present this as a signed partnership.',
    href: 'https://wacsi.org/cyber-attacks-wacsi-techsoup-train-36-civic-actors-on-digital-security-and-safety/',
    icon: ShieldCheck,
  },
  {
    name: 'Global Call to Action Against Poverty (GCAP) Africa',
    category: 'Event and network connection referenced',
    description: 'Named in an HMSI-received invitation connected with a 2023 People’s Assembly. GCAP’s public regional page describes its Africa-wide civil-society network.',
    href: 'https://gcap.global/region/africa/',
    icon: Globe2,
  },
  {
    name: 'Small Media Foundation',
    category: 'Support referenced in correspondence',
    description: 'Named in correspondence about support for a Nigeria UPR process engagement workshop. The public organization profile focuses on research, advocacy, training, and human-rights mechanisms.',
    href: 'https://smallmedia.org.uk/',
    icon: Globe2,
  },
];

export default function PartnerEcosystem() {
  return (
    <section aria-labelledby="partner-ecosystem-heading" className="border-y border-[#d9d6ce] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Networks, learning &amp; civic-society connections</p>
          <h2 id="partner-ecosystem-heading" className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Organizations connected to HMSI’s learning and civic-society ecosystem.</h2>
          <p className="mt-5 text-base leading-7 text-[#66716a]">The entries below reflect relationships, invitations, learning connections, or support referenced in HMSI records. They are not all presented as current signed partnerships, endorsements, sponsors, or funders. Formal status should be confirmed through the relevant organization and an HMSI agreement register.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {partnerConnections.map(({ name, category, description, href, icon: Icon }) => (
            <article key={name} className="flex min-h-[250px] flex-col border border-[#d9d6ce] bg-[#f6f4ef] p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9f0e9] text-[#1e5b49]" aria-hidden="true"><Icon size={22} /></span>
                <span className="text-right text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-[#b56b3b]">{category}</span>
              </div>
              <h3 className="mt-6 text-xl font-black tracking-tight text-[#17221e]">{name}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#66716a]">{description}</p>
              <a href={href} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#1e5b49]">View public source <ArrowUpRight size={14} aria-hidden="true" /></a>
            </article>
          ))}
        </div>
        <p className="mt-8 text-xs leading-5 text-[#7a817a]">Relationship note: correspondence and public pages are retained as evidence references; they should not be interpreted as a substitute for a current memorandum of understanding, grant agreement, sponsorship agreement, or formal endorsement.</p>
      </div>
    </section>
  );
}

export { partnerConnections };
