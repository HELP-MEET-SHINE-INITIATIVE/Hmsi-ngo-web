'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Megaphone, XCircle } from 'lucide-react';

type Sponsorship = { id: string; requester_name: string; requester_email: string; organisation_name: string | null; title: string; description: string; target_url: string; creative_url: string | null; budget_ngn: number; status: string; admin_note: string | null; payment_reference: string | null; reviewed_by: string | null; reviewed_at: string | null; paid_at: string | null; starts_at: string | null; ends_at: string | null; created_at: string };

export default function SponsorshipRequestsPanel() {
  const [items, setItems] = useState<Sponsorship[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/sponsorships', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Sponsorship requests are unavailable.');
    setItems(payload.sponsorships || []);
  }, []);

  useEffect(() => { load().catch((error) => setStatus(error instanceof Error ? error.message : 'Sponsorship requests are unavailable.')); }, [load]);

  const review = async (item: Sponsorship, nextStatus: string) => {
    setBusy(item.id); setStatus('');
    try {
      const body: Record<string, string> = { id: item.id, status: nextStatus };
      if (nextStatus === 'active') {
        if (item.starts_at) body.starts_at = item.starts_at;
        if (item.ends_at) body.ends_at = item.ends_at;
      }
      const response = await fetch('/api/admin/sponsorships', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Sponsorship review failed.');
      await load(); setStatus(`Sponsorship ${nextStatus}.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Sponsorship review failed.'); }
    finally { setBusy(null); }
  };

  return <div className="space-y-6"><div className="flex items-start gap-3 rounded-3xl bg-[#17221e] p-6 text-white"><Megaphone className="mt-1 text-[#e1ad45]" size={24} /><div><h2 className="text-xl font-black">Sponsored placements</h2><p className="mt-2 text-sm leading-6 text-white/70">Review content and budgets before payment. Only verified paid requests can be activated for display in HMSI rooms.</p></div></div>{status && <p role="status" className="rounded-2xl border border-[#d9d6ce] bg-white p-4 text-sm text-[#66716a]">{status}</p>}{items.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">No sponsorship requests yet.</div> : items.map((item) => <article key={item.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${item.status === 'pending' ? 'bg-[#fff8e8] text-[#7a5b16]' : item.status === 'active' ? 'bg-[#e9f0e9] text-[#1e5b49]' : 'bg-[#f6f4ef] text-[#66716a]'}`}>{item.status}</span><span className="text-xs font-bold text-[#b56b3b]">₦{Number(item.budget_ngn).toLocaleString('en-NG')}</span></div><h3 className="mt-3 text-xl font-black">{item.title}</h3><p className="mt-1 text-sm font-bold text-[#66716a]">{item.organisation_name || item.requester_name} · {item.requester_email}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-[#66716a]">{item.description}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#1e5b49]"><a href={item.target_url} target="_blank" rel="noreferrer" className="underline">Destination link</a>{item.creative_url && <a href={item.creative_url} target="_blank" rel="noreferrer" className="underline">Creative link</a>}{item.payment_reference && <span>Payment: {item.payment_reference}</span>}</div></div><div className="flex shrink-0 flex-wrap content-start gap-2 lg:max-w-[220px] lg:justify-end">{item.status === 'pending' && <><button disabled={busy === item.id} onClick={() => review(item, 'approved')} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={15} /> Approve</button><button disabled={busy === item.id} onClick={() => review(item, 'rejected')} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={15} /> Reject</button></>}{item.status === 'paid' && <button disabled={busy === item.id} onClick={() => review(item, 'active')} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={15} /> Activate</button>}{item.status === 'approved' && <span className="inline-flex items-center gap-2 rounded-full bg-[#fff8e8] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#7a5b16]"><Clock3 size={14} /> Awaiting payment</span>}</div></div></article>)}</div>;
}
