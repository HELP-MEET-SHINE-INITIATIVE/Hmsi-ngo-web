'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export default function OpportunitiesContent() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetch('/api/opportunities', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => setOpportunities(result.opportunities || []))
      .catch(() => setStatus('Opportunities are temporarily unavailable.'))
      .finally(() => setIsLoading(false));
  }, []);

  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !user) return;
    setIsSubmitting(true);
    setStatus('');
    try {
      const response = await fetch(`/api/opportunities/${selected.id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user.name, email: user.email, phone: phone.trim(), role: user.role }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not submit your application.');
      setSelected(null);
      setPhone('');
      setStatus('Application submitted. HMSI will review it and contact you.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'We could not submit your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-12 text-[#17221e]"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">HMSI opportunities</p><h1 className="mt-2 text-4xl font-black tracking-tight">Find a way to help</h1><p className="mt-3 max-w-2xl text-[#66716a]">Choose a volunteer opportunity or worker position across Nigeria and Africa. Applications are reviewed by the HMSI coordination team.</p></div><Link href="/dashboard" className="rounded-full border border-[#d9d6ce] bg-white px-5 py-3 text-xs font-black uppercase tracking-widest">Back to dashboard</Link></div>{status && <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">{status}</div>}{isLoading ? <div className="mt-10 rounded-3xl bg-white p-10 text-center text-[#66716a]">Loading opportunities…</div> : opportunities.length === 0 ? <div className="mt-10 rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-[#66716a]">No open opportunities yet. Check back soon.</div> : <div className="mt-10 grid gap-5 md:grid-cols-2">{opportunities.map((opportunity) => <article key={opportunity.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{opportunity.audience === 'both' ? 'Volunteer + worker' : opportunity.audience}</span><Users size={18} className="text-[#b56b3b]" /></div><h2 className="mt-5 text-2xl font-black">{opportunity.title}</h2><p className="mt-3 text-sm leading-6 text-[#66716a]">{opportunity.description}</p><div className="mt-5 space-y-2 text-xs font-bold text-[#66716a]"><p className="flex items-center gap-2"><MapPin size={15} className="text-[#1e5b49]" />{opportunity.location}</p><p className="flex items-center gap-2"><Calendar size={15} className="text-[#1e5b49]" />{new Date(opportunity.starts_at).toLocaleString()}</p></div><button onClick={() => setSelected(opportunity)} className="mt-6 w-full rounded-full bg-[#1e5b49] px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-[#17221e]">Apply for this opportunity</button></article>)}</div>}{selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17221e]/40 p-4" onClick={() => setSelected(null)}><div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><h2 className="text-2xl font-black">Apply to {selected.title}</h2>{user ? <form onSubmit={apply} className="mt-5 space-y-4"><p className="text-sm text-[#66716a]">You will apply as <strong>{user.name}</strong> ({user.role}). Your phone number is required for coordination; update it in the signup form if needed.</p><input required placeholder="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-3 text-sm" id="opportunity-phone" /><div className="flex gap-3"><button type="button" onClick={() => setSelected(null)} className="flex-1 rounded-full border border-[#d9d6ce] px-4 py-3 text-xs font-black uppercase tracking-widest">Cancel</button><button disabled={isSubmitting} type="submit" className="flex-1 rounded-full bg-[#1e5b49] px-4 py-3 text-xs font-black uppercase tracking-widest text-white">{isSubmitting ? 'Sending…' : 'Submit application'}</button></div></form> : <div className="mt-5 space-y-4"><p className="text-sm text-[#66716a]">Sign in first so HMSI can attach the application to your role.</p><Link href="/login" className="block rounded-full bg-[#1e5b49] px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-white">Sign in</Link></div>}</div></div>}</div></main>;
}
