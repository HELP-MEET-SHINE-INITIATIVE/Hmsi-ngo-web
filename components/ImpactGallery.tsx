import Image from 'next/image';
const outreachMoments = [
  { src: '/images/outreach-1.png', alt: 'Community members gathered for the outreach' },
  { src: '/images/outreach-2.png', alt: 'Active food distribution and relief measurement' },
  { src: '/images/outreach-3.png', alt: 'Volunteers organizing food supply packs' },
  { src: '/images/outreach-4.png', alt: 'Mothers and children supported by our mission' },
  { src: '/images/outreach-5.png', alt: 'Child participating in our community day' },
  { src: '/images/outreach-6.png', alt: 'Elderly community member receiving assistance' },
  { src: '/images/outreach-7.png', alt: 'Grassroots engagement during outreach' },
  { src: '/images/outreach-8.png', alt: 'Direct family support package handover' },
  { src: '/images/outreach-9.png', alt: 'Relief distribution team in action' },
  { src: '/images/outreach-10.png', alt: 'Impacting vulnerable households across Nigeria' },
];
export default function ImpactGallery() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Field Missions & Outreaches</h3>
          <p className="text-xs text-slate-400">Captured moments from our on-the-ground interventions.</p>
        </div>
        <span className="text-xs font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60 px-3 py-1 rounded-full">
          Live Gallery
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {outreachMoments.map((img, index) => (
          <div 
            key={index} 
            className="relative group overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 aspect-square shadow-sm"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover group-hover:scale-105 transition duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4">
              <p className="text-xs text-slate-200 font-medium leading-snug">{img.alt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}