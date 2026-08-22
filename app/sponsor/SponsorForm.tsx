'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, CreditCard, Send, ShieldCheck } from 'lucide-react';

export default function SponsorForm({ approvedRequestId = '' }: { approvedRequestId?: string }) {
  const [form, setForm] = useState({ requester_name: '', requester_email: '', organisation_name: '', title: '', description: '', target_url: '', creative_url: '', budget_ngn: '' });
  const [status, setStatus] = useState('');
  const [requestId, setRequestId] = useState(approvedRequestId);
  const [isBusy, setIsBusy] = useState(false);

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsBusy(true); setStatus('');
    try {
      const response = await fetch('/api/sponsorships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, budget_ngn: Number(form.budget_ngn) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The sponsorship request could not be submitted.');
      setRequestId(payload.sponsorship.id);
      setStatus('Your sponsorship request has been submitted for HMSI administrator review. Payment becomes available only after approval.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'The sponsorship request could not be submitted.'); }
    finally { setIsBusy(false); }
  };

  const beginPayment = async () => {
    if (!requestId) return;
    setIsBusy(true); setStatus('');
    try {
      const response = await fetch(`/api/sponsorships/${encodeURIComponent(requestId)}/initialize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.requester_email }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Payment is not available yet.');
      window.location.href = payload.authorization_url;
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Payment is not available yet.'); setIsBusy(false); }
  };

  return <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]"><form onSubmit={submitRequest} className="rounded-[32px] bg-white p-7 shadow-sm sm:p-10"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Request review</p><h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">Tell HMSI about the sponsorship.</h2><p className="mt-4 text-sm leading-7 text-[#66716a]">Every sponsored placement is reviewed before payment or publication. Submit accurate information and links that you are authorised to promote.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><input required placeholder="Your name" value={form.requester_name} onChange={(e) => update('requester_name', e.target.value)} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input required type="email" placeholder="Email address" value={form.requester_email} onChange={(e) => update('requester_email', e.target.value)} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input placeholder="Organisation (optional)" value={form.organisation_name} onChange={(e) => update('organisation_name', e.target.value)} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] sm:col-span-2" /><input required placeholder="Sponsorship title" value={form.title} onChange={(e) => update('title', e.target.value)} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] sm:col-span-2" /><textarea required rows={4} placeholder="Describe the message, audience, and intended placement" value={form.description} onChange={(e) => update('description', e.target.value)} className="resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] sm:col-span-2" /><input required type="url" placeholder="Destination URL" value={form.target_url} onChange={(e) => update('target_url', e.target.value)} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input type="url" placeholder="Creative URL (optional)" value={form.creative_url} onChange={(e) => update('creative_url', e.target.value)} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><label className="text-xs font-black uppercase tracking-widest text-[#66716a] sm:col-span-2">Budget in NGN<input required min="1000" type="number" value={form.budget_ngn} onChange={(e) => update('budget_ngn', e.target.value)} placeholder="e.g. 25000" className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#1e5b49]" /></label></div>{status && <p role="status" className="mt-5 rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] p-4 text-sm leading-6 text-[#66716a]">{status}</p>}<button disabled={isBusy} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-6 py-4 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><Send size={15} />{isBusy ? 'Submitting…' : 'Submit for review'}</button></form><aside className="rounded-[32px] bg-[#17221e] p-7 text-white sm:p-10"><ShieldCheck className="text-[#e1ad45]" size={28} /><h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">Review before reach.</h2><div className="mt-6 space-y-5 text-sm leading-7 text-white/70"><p><strong className="text-white">Step 1:</strong> Submit your sponsorship request and destination/creative links.</p><p><strong className="text-white">Step 2:</strong> An HMSI administrator reviews the content, budget, and suitability for the community rooms.</p><p><strong className="text-white">Step 3:</strong> If approved, use the request reference to start the Paystack payment. Payment is verified before public activation.</p><p><strong className="text-white">Step 4:</strong> An administrator activates the placement and sets its display window.</p></div>{requestId && <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4"><p className="text-xs font-black uppercase tracking-widest text-[#e1ad45]">Request reference</p><p className="mt-2 break-all font-mono text-xs text-white/80">{requestId}</p><button type="button" onClick={beginPayment} disabled={isBusy} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e1ad45] px-4 py-3 text-xs font-black uppercase tracking-widest text-[#17221e] disabled:opacity-50"><CreditCard size={15} /> Start approved payment</button></div>}{status && status.toLowerCase().includes('submitted') && <p className="mt-5 flex items-center gap-2 text-xs font-bold text-[#e1ad45]"><CheckCircle2 size={15} /> Awaiting administrator review</p>}</aside></div>;
}
