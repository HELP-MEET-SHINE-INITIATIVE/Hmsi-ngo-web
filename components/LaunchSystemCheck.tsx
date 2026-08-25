'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';

type Check = { status: string; note?: string; tables?: Array<{ table: string; ready: boolean; recordCount: number | null }>; [key: string]: unknown };
type SystemCheck = { checkedAt: string; database: Check; notifications: Check; payments: Check };

export default function LaunchSystemCheck() {
  const [result, setResult] = useState<SystemCheck | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const load = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/system-check', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'System check unavailable.');
      setResult(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'System check unavailable.');
    } finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const cards = result ? [['Database & tables', result.database], ['Email notification configuration', result.notifications], ['Donation gateway & webhook configuration', result.payments]] as const : [];
  return <main className="min-h-screen bg-[#f6f4ef] px-5 py-10 text-[#17221e] sm:px-8"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Private launch diagnostics</p><h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">HMSI system check</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[#66716a]">This bounded diagnostic reports local application readiness. It never returns credentials, donor data, or a claim that an external provider has accepted a webhook.</p></div><button type="button" onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> {busy ? 'Checking…' : 'Run check'}</button></div>{error && <p role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}{result && <><p className="mt-7 text-xs font-bold text-[#66716a]">Checked {new Date(result.checkedAt).toLocaleString()}</p><div className="mt-5 grid gap-5 md:grid-cols-3">{cards.map(([title, check]) => <section key={title} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center gap-3">{check.status === 'ready' || check.status === 'configured' ? <CheckCircle2 className="text-[#1e5b49]" /> : <TriangleAlert className="text-[#b56b3b]" />}<h2 className="font-black">{title}</h2></div><p className="mt-4 text-xs font-black uppercase tracking-widest text-[#66716a]">{check.status}</p>{check.note && <p className="mt-3 text-sm leading-6 text-[#66716a]">{check.note}</p>}{check.tables && <ul className="mt-4 space-y-2 text-xs text-[#66716a]">{check.tables.map((table) => <li key={table.table} className="flex justify-between gap-3"><span>{table.table}</span><span className={table.ready ? 'text-[#1e5b49]' : 'text-red-700'}>{table.ready ? 'ready' : 'attention'}</span></li>)}</ul>}</section>)}</div></>}</div></main>;
}
