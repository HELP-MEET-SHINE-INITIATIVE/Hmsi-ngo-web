'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Mail, MapPin, Phone, ShieldCheck, Users } from 'lucide-react';

type Person = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  status?: string | null;
  account_status?: string | null;
  onboarding_status?: string | null;
  applicant_role?: string | null;
  publisher_role?: string | null;
  purpose?: string | null;
  interest?: string | null;
  created_at?: string | null;
};

type PeopleDirectoryProps = {
  title: string;
  description: string;
  endpoint: string;
  roleLabel: string;
  dataKey: 'volunteers' | 'members';
};

export default function PeopleDirectory({ title, description, endpoint, roleLabel, dataKey }: PeopleDirectoryProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(endpoint, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `${title} is temporarily unavailable.`);
        const records = dataKey === 'members' ? result.members : result.volunteers;
        setPeople(Array.isArray(records) ? records : []);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : `${title} is temporarily unavailable.`))
      .finally(() => setLoading(false));
  }, [dataKey, endpoint, title]);

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-10 text-[#17221e] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/hmsi-control" className="text-sm font-black text-[#1e5b49] hover:underline">← Admin control center</Link>
        <header className="mt-8 rounded-[32px] bg-[#17221e] p-7 text-white sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e1ad45]">Private administration · {roleLabel}</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em]">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">{description} Records are loaded through an administrator-only route and are not exposed to public visitors or search crawlers.</p>
        </header>
        {error && <p role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading ? <p className="mt-8 text-sm text-[#66716a]">Loading approved {roleLabel.toLowerCase()} records…</p> : people.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-12 text-center text-sm text-[#66716a]">No approved active {roleLabel.toLowerCase()} records are available.</div> : <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label={`${roleLabel} directory`}>
          {people.map((person) => <article key={person.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">{person.name}</h2><p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#b56b3b]">{person.applicant_role || roleLabel}</p></div><Users className="shrink-0 text-[#1e5b49]" size={22} aria-hidden="true" /></div>
            <div className="mt-5 space-y-3 text-sm text-[#66716a]">
              <p className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0 text-[#1e5b49]" /><a className="break-all hover:text-[#1e5b49] hover:underline" href={`mailto:${person.email}`}>{person.email}</a></p>
              {person.phone && <p className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-[#1e5b49]" />{person.phone}</p>}
              {person.location && <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-[#1e5b49]" />{person.location}</p>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[#1e5b49]">{person.status || 'active'}</span>{person.account_status && <span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[#66716a]">account: {person.account_status}</span>}{person.onboarding_status && <span className="rounded-full bg-[#fff8e8] px-3 py-1 text-[#7a5b16]">onboarding: {person.onboarding_status}</span>}</div>
            {person.interest && <p className="mt-5 border-l-2 border-[#e1ad45] pl-3 text-sm leading-6">{person.interest}</p>}
            {person.purpose && <p className="mt-5 text-sm leading-6 text-[#66716a]">{person.purpose}</p>}
            {person.publisher_role && <p className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><ShieldCheck size={14} /> {person.publisher_role.replaceAll('_', ' ')}</p>}
            {person.created_at && <p className="mt-5 text-xs text-[#66716a]">Record added {new Date(person.created_at).toLocaleDateString('en-NG')}</p>}
          </article>)}
        </section>}
      </div>
    </main>
  );
}
