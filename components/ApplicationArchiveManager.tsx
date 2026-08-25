'use client';

import { useEffect, useState } from 'react';

type Archive = { id: string; source_table: string; source_id: string; status_at_archive: string; archived_at: string; purge_after: string | null; purged_at: string | null; snapshot: { name?: string; email?: string; applicant_name?: string; applicant_email?: string } };
type Pending = { volunteers: Array<{ id: string; name: string; email: string; applicant_role: string; created_at: string }>; members: Array<{ id: string; name: string; email: string; created_at: string }>; opportunities: Array<{ id: string; applicant_name: string; applicant_email: string; applicant_role: string; created_at: string }> };

export default function ApplicationArchiveManager() {
  const [view, setView] = useState<'pending' | 'archives'>('pending');
  const [pending, setPending] = useState<Pending | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setLoading(true); setError('');
    fetch(`/api/admin/application-archives?view=${view}`, { cache: 'no-store' })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Applications are unavailable.'); if (view === 'archives') setArchives(data.archives || []); else setPending(data.pending || { volunteers: [], members: [], opportunities: [] }); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Applications are unavailable.'))
      .finally(() => setLoading(false));
  }, [view]);
  async function requestUserRemoval(archive: Archive) {
    const subjectType = archive.source_table === 'volunteer_applications' ? 'volunteer' : archive.source_table === 'hmsi_member_applications' ? 'member' : null;
    if (!subjectType || archive.status_at_archive !== 'approved' || !window.confirm('Revoke this active user’s access? Their record will remain recoverable for 30 days before final purge.')) return;
    setRemoving(archive.id); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/users/${subjectType}/${archive.source_id}/remove`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'REMOVE_30_DAYS' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'User removal could not be requested.');
      setNotice(data.message || 'Access was revoked and the 30-day recovery window has started.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'User removal could not be requested.'); } finally { setRemoving(null); }
  }
  const groups = pending ? [
    ['Volunteer and worker applications', pending.volunteers.map((item) => ({ id: item.id, name: item.name, email: item.email, detail: item.applicant_role, createdAt: item.created_at }))],
    ['Member applications', pending.members.map((item) => ({ id: item.id, name: item.name, email: item.email, detail: 'member', createdAt: item.created_at }))],
    ['Opportunity applications', pending.opportunities.map((item) => ({ id: item.id, name: item.applicant_name, email: item.applicant_email, detail: item.applicant_role, createdAt: item.created_at }))],
  ] as const : [];
  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-10 text-[#17221e]"><div className="mx-auto max-w-5xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Private administration</p><h1 className="mt-2 text-4xl font-black">Application inbox</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#66716a]">The inbox shows only pending decisions. Approved applications are preserved in the archive. Rejected applications enter the 30-day retention window before final purge.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setView('pending')} className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-widest ${view === 'pending' ? 'bg-[#1e5b49] text-white' : 'border border-[#1e5b49] text-[#1e5b49]'}`}>Pending inbox</button><button type="button" onClick={() => setView('archives')} className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-widest ${view === 'archives' ? 'bg-[#1e5b49] text-white' : 'border border-[#1e5b49] text-[#1e5b49]'}`}>View archives</button></div>{(error || notice) && <p role="status" className={`mt-6 rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>{error || notice}</p>}{loading ? <p className="mt-8 text-sm text-[#66716a]">Loading applications…</p> : view === 'pending' ? <div className="mt-8 space-y-6">{groups.map(([title, items]) => <section key={title}><h2 className="text-xl font-black">{title}</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{items.length === 0 ? <p className="rounded-2xl border border-dashed border-[#d9d6ce] bg-white p-4 text-sm text-[#66716a]">No pending records.</p> : items.map((item) => <article key={item.id} className="rounded-2xl border border-[#d9d6ce] bg-white p-5"><h3 className="font-black">{item.name}</h3><p className="mt-1 text-sm text-[#66716a]">{item.email}</p><p className="mt-2 text-xs font-black uppercase tracking-widest text-[#b56b3b]">{item.detail}</p><time className="mt-3 block text-xs text-[#66716a]">Submitted {new Date(item.createdAt).toLocaleString('en-NG')}</time></article>)}</div></section>)}</div> : <div className="mt-8 space-y-3">{archives.length === 0 ? <p className="rounded-2xl border border-dashed border-[#d9d6ce] bg-white p-5 text-sm text-[#66716a]">No archived applications are recorded.</p> : archives.map((archive) => <article key={archive.id} className="rounded-2xl border border-[#d9d6ce] bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-black">{archive.snapshot.name || archive.snapshot.applicant_name || 'Archived applicant'}</h2><p className="mt-1 text-sm text-[#66716a]">{archive.snapshot.email || archive.snapshot.applicant_email || 'Email not retained in this snapshot'}</p></div><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-xs font-black uppercase tracking-widest">{archive.status_at_archive}</span></div><p className="mt-3 text-sm text-[#66716a]">Source: {archive.source_table} · archived {new Date(archive.archived_at).toLocaleString('en-NG')}</p>{archive.purge_after && <p className="mt-1 text-sm text-[#66716a]">Final purge: {archive.purged_at ? 'completed' : new Date(archive.purge_after).toLocaleString('en-NG')}</p>}{archive.status_at_archive === 'approved' && (archive.source_table === 'volunteer_applications' || archive.source_table === 'hmsi_member_applications') && <button type="button" disabled={removing === archive.id} onClick={() => requestUserRemoval(archive)} className="mt-4 rounded-full border border-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700 disabled:opacity-50">{removing === archive.id ? 'Removing…' : 'Remove user (30-day recovery)'}</button>}</article>)}</div>}</div></main>;
}
