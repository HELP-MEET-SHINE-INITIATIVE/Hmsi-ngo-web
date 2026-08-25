'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle, Play, Send } from 'lucide-react';
import { launchTemplates } from '../lib/launchTemplates';

export default function LaunchTemplatesContent() {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied. Review recipient details before sending.`);
    } catch {
      setNotice('Clipboard access was unavailable. Select and copy the template manually.');
    }
  };
  const seed = async () => {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/launch/seed', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Launch seeds could not be prepared.');
      setNotice(result.message || 'Launch seed package prepared.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Launch seeds could not be prepared.');
    } finally {
      setBusy(false);
    }
  };
  return <main className="min-h-screen bg-[#f6f4ef] px-5 py-10 text-[#17221e] sm:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Private launch tools</p><h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">Outreach templates & launch seed package</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[#66716a]">Copy approved text for email or WhatsApp after verifying the audience. Templates do not send messages or create public claims on their own.</p></div><button type="button" disabled={busy} onClick={seed} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"><Play size={15} /> {busy ? 'Preparing…' : 'Prepare launch seed package'}</button></div>{notice && <p role="status" className="mt-6 rounded-2xl border border-[#b9d6c4] bg-[#e9f0e9] p-4 text-sm text-[#1e5b49]">{notice}</p>}<div className="mt-8 grid gap-6 lg:grid-cols-3">{launchTemplates.map((template) => <article key={template.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b56b3b]">{template.audience}</p><h2 className="mt-3 text-xl font-black">{template.title}</h2><p className="mt-4 text-xs font-black uppercase tracking-widest text-[#66716a]">Subject: {template.subject}</p><pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-[#f6f4ef] p-4 font-sans text-xs leading-5 text-[#17221e]">{template.body}</pre><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => copy(`Subject: ${template.subject}\n\n${template.body}`, template.title)} className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"><Copy size={13} /> Copy template</button><a href={`https://wa.me/?text=${encodeURIComponent(`${template.subject}\n\n${template.body}`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]"><MessageCircle size={13} /> Prepare WhatsApp</a></div></article>)}</div></div></main>;
}
