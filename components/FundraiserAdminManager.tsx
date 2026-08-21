'use client';

import Image from 'next/image';
import { Check, CheckCircle2, Copy, Pencil, Save, Trash2, X, XCircle } from 'lucide-react';
import OptionalImageUpload from './OptionalImageUpload';
import { useState } from 'react';

type FundraiserRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  target_amount: number | string;
  raised_amount: number | string;
  image_url: string | null;
  image_path?: string | null;
  status: string;
  campaign_type?: string | null;
  programme_name?: string | null;
  created_at: string;
};

type FundraiserDraft = {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: string;
  raisedAmount: string;
  imageUrl: string;
  imagePath: string;
  status: string;
  campaignType: string;
  programmeName: string;
};

const categories = ['medical', 'education', 'housing', 'emergency', 'community'];

function displayCategory(category: string) {
  return category.toLowerCase() === 'community' ? 'Community Support' : category;
}
const statuses = [
  { value: 'active', label: 'Active — visible on homepage and impact' },
  { value: 'completed', label: 'Completed — hidden from public pages' },
  { value: 'archived', label: 'Archived — hidden from public pages' },
  { value: 'pending', label: 'Pending review — hidden from public pages' },
];

const emptyCreateForm = { title: '', description: '', category: 'medical', targetAmount: '', campaignType: 'programme', programmeName: '', imageUrl: '', imagePath: '' };

export default function FundraiserAdminManager({ fundraisers, onRefresh }: { fundraisers: FundraiserRecord[]; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<FundraiserDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const startEditing = (fundraiser: FundraiserRecord) => {
    setError('');
    setNotice('');
    setEditing({
      id: fundraiser.id,
      title: fundraiser.title,
      description: fundraiser.description,
      category: fundraiser.category,
      targetAmount: String(fundraiser.target_amount),
      raisedAmount: String(fundraiser.raised_amount),
      imageUrl: fundraiser.image_url || '',
      imagePath: fundraiser.image_path || '',
      status: fundraiser.status === 'rejected' ? 'archived' : fundraiser.status,
      campaignType: fundraiser.campaign_type || 'programme',
      programmeName: fundraiser.programme_name || '',
    });
  };

  const saveFundraiser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusyId(editing.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/fundraisers/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editing.title,
          description: editing.description,
          category: editing.category,
          targetAmount: editing.targetAmount,
          raisedAmount: editing.raisedAmount,
          imageUrl: editing.imageUrl,
          imagePath: editing.imagePath,
          status: editing.status,
          campaignType: editing.campaignType,
          programmeName: editing.programmeName,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save fundraiser changes.');
      await onRefresh();
      setEditing(null);
      setNotice('Fundraiser changes saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save fundraiser changes.');
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/fundraisers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to change fundraiser visibility.');
      await onRefresh();
      setNotice(status === 'completed' ? 'Fundraiser marked completed and removed from homepage and impact.' : status === 'active' ? 'Fundraiser is visible on homepage and impact again.' : 'Fundraiser hidden from public pages.');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to change fundraiser visibility.');
    } finally {
      setBusyId(null);
    }
  };

  const createFundraiser = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyId('create');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/fundraisers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to publish fundraiser.');
      setCreateForm(emptyCreateForm);
      await onRefresh();
      setNotice(result.message || 'Fundraiser published.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to publish fundraiser.');
    } finally {
      setBusyId(null);
    }
  };

  const copyPaymentLink = async (id: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hmsi.org.ng');
    const paymentLink = `${baseUrl}/fundraise/${id}?utm_source=social&utm_medium=admin_share&utm_campaign=fundraiser_${id}`;
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 2500);
    } catch {
      setError(`Copy failed. Use this payment link: ${paymentLink}`);
    }
  };

  const deleteFundraiser = async (fundraiser: FundraiserRecord) => {
    if (!window.confirm(`Permanently delete “${fundraiser.title}” and its uploaded image? This cannot be undone.`)) return;
    setBusyId(fundraiser.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/fundraisers/${fundraiser.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete fundraiser.');
      await onRefresh();
      if (editing?.id === fundraiser.id) setEditing(null);
      setNotice('Fundraiser and uploaded image permanently deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete fundraiser.');
    } finally {
      setBusyId(null);
    }
  };

  return <div className="space-y-5"><div><h2 className="text-2xl font-black tracking-tight">Fundraiser management & campaigns</h2><p className="mt-2 text-sm text-[#66716a]">Create organisation-wide or programme campaigns directly, edit any existing fundraiser, update its target or raised amount, mark completed, hide it from public pages, or permanently delete old records.</p></div><form onSubmit={createFundraiser} className="grid gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 md:grid-cols-2"><div className="md:col-span-2"><h3 className="text-xl font-black">Create a campaign</h3><p className="mt-2 text-sm leading-6 text-[#66716a]">Admin-posted fundraisers go live immediately on the homepage and impact page. Image upload is optional.</p></div><input required minLength={3} maxLength={160} placeholder="Fundraiser title" value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><textarea required minLength={20} rows={5} placeholder="Tell supporters what this fundraiser will achieve" value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} className="resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Category<select value={createForm.category} onChange={(event) => setCreateForm({ ...createForm, category: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none"><option value="medical">Medical</option><option value="education">Education</option><option value="housing">Housing</option><option value="emergency">Emergency</option><option value="community">Community Support</option></select></label><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Target amount (NGN)<input required type="number" min="1" step="0.01" placeholder="500000" value={createForm.targetAmount} onChange={(event) => setCreateForm({ ...createForm, targetAmount: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Campaign purpose<select value={createForm.campaignType} onChange={(event) => setCreateForm({ ...createForm, campaignType: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none"><option value="organisation">Organisation-wide campaign</option><option value="programme">Specific programme campaign</option></select></label>{createForm.campaignType === 'programme' && <label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Programme name<input required minLength={2} maxLength={160} placeholder="Food packs programme" value={createForm.programmeName} onChange={(event) => setCreateForm({ ...createForm, programmeName: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label>}<div className="md:col-span-2"><OptionalImageUpload viewer={{ email: 'admin', role: 'admin' }} value={createForm.imageUrl} onChange={(imageUrl, imagePath) => setCreateForm({ ...createForm, imageUrl, imagePath: imagePath || '' })} /></div><button type="submit" disabled={busyId === 'create'} className="rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 md:col-span-2">{busyId === 'create' ? 'Publishing…' : 'Publish fundraiser'}</button></form>{(error || notice) && <div className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`} role="status">{error || notice}</div>}{fundraisers.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">No fundraiser records yet.</div> : fundraisers.map((fundraiser) => { const isBusy = busyId === fundraiser.id; return <div key={fundraiser.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="relative mb-6 h-48 overflow-hidden rounded-2xl bg-[#f6f4ef]"><Image src={fundraiser.image_url || '/images/outreach-1.png'} alt={`Cover image for ${fundraiser.title}`} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" /></div>{editing?.id === fundraiser.id ? <form onSubmit={saveFundraiser} className="space-y-4"><div className="flex items-center justify-between gap-4"><h3 className="text-xl font-black">Edit fundraiser</h3><button type="button" onClick={() => setEditing(null)} className="rounded-full p-2 text-[#66716a] hover:bg-[#f6f4ef]" aria-label="Cancel editing"><X size={18} /></button></div><input required minLength={3} maxLength={160} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="Fundraiser title" className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><textarea required minLength={20} rows={5} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="Description" className="w-full resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Category<select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none"><option value="medical">Medical</option><option value="education">Education</option><option value="housing">Housing</option><option value="emergency">Emergency</option><option value="community">Community Support</option></select></label><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Campaign purpose<select value={editing.campaignType} onChange={(event) => setEditing({ ...editing, campaignType: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none"><option value="organisation">Organisation-wide campaign</option><option value="programme">Specific programme campaign</option></select></label>{editing.campaignType === 'programme' && <label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Programme name<input required minLength={2} maxLength={160} value={editing.programmeName} onChange={(event) => setEditing({ ...editing, programmeName: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label>}<label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Visibility<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Target amount (NGN)<input required type="number" min="1" step="0.01" value={editing.targetAmount} onChange={(event) => setEditing({ ...editing, targetAmount: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Raised amount (NGN)<input required type="number" min="0" step="0.01" value={editing.raisedAmount} onChange={(event) => setEditing({ ...editing, raisedAmount: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label></div><OptionalImageUpload viewer={{ email: 'admin', role: 'admin' }} value={editing.imageUrl} imagePath={editing.imagePath} onChange={(imageUrl, imagePath) => setEditing({ ...editing, imageUrl, imagePath: imagePath || '' })} /><div className="flex flex-wrap gap-2"><button type="submit" disabled={isBusy} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><Save size={15} /> Save changes</button><button type="button" disabled={isBusy} onClick={() => deleteFundraiser(fundraiser)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><Trash2 size={15} /> Delete permanently</button></div></form> : <><div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{displayCategory(fundraiser.category)}</span><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${fundraiser.status === 'active' ? 'bg-[#e9f0e9] text-[#1e5b49]' : fundraiser.status === 'completed' ? 'bg-[#fff3d7] text-[#916719]' : 'bg-[#f6f4ef] text-[#66716a]'}`}>{fundraiser.status}</span></div><h3 className="text-xl font-black">{fundraiser.title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">{fundraiser.description}</p><p className="mt-3 text-xs font-bold text-[#66716a]">Target: ₦{Number(fundraiser.target_amount).toLocaleString()} · Raised: ₦{Number(fundraiser.raised_amount).toLocaleString()} · {new Date(fundraiser.created_at).toLocaleDateString()}</p><div className="mt-4 flex max-w-2xl flex-col gap-2 sm:flex-row"><label htmlFor={`payment-link-${fundraiser.id}`} className="sr-only">Payment link for {fundraiser.title}</label><input id={`payment-link-${fundraiser.id}`} readOnly value={`${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hmsi.org.ng')}/fundraise/${fundraiser.id}?utm_source=social&utm_medium=admin_share&utm_campaign=fundraiser_${fundraiser.id}`} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-[#d9d6ce] bg-[#f6f4ef] px-3 py-2 text-xs text-[#66716a] outline-none" /><button type="button" onClick={() => copyPaymentLink(fundraiser.id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#17221e]">{copiedId === fundraiser.id ? <Check size={14} /> : <Copy size={14} />} {copiedId === fundraiser.id ? 'Copied' : 'Copy payment link'}</button></div></div><div className="flex shrink-0 flex-wrap items-start gap-2"><button disabled={isBusy} onClick={() => startEditing(fundraiser)} className="inline-flex items-center gap-1 rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#17221e] disabled:opacity-50"><Pencil size={14} /> Edit</button>{fundraiser.status === 'pending' && <button disabled={isBusy} onClick={() => changeStatus(fundraiser.id, 'active')} className="inline-flex items-center gap-1 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={14} /> Approve</button>}{fundraiser.status === 'active' && <button disabled={isBusy} onClick={() => changeStatus(fundraiser.id, 'completed')} className="inline-flex items-center gap-1 rounded-full bg-[#e1ad45] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#17221e] disabled:opacity-50"><CheckCircle2 size={14} /> Mark completed</button>}{fundraiser.status !== 'active' && fundraiser.status !== 'pending' && <button disabled={isBusy} onClick={() => changeStatus(fundraiser.id, 'active')} className="inline-flex items-center gap-1 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={14} /> Restore</button>}{fundraiser.status !== 'archived' && fundraiser.status !== 'completed' && <button disabled={isBusy} onClick={() => changeStatus(fundraiser.id, 'archived')} className="rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a] disabled:opacity-50">Hide</button>}<button disabled={isBusy} onClick={() => deleteFundraiser(fundraiser)} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><Trash2 size={14} /> Delete</button></div></div></>}</div>; })}</div>;
}
