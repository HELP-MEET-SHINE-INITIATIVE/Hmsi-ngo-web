'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, ClipboardList, KeyRound, Loader2, Mail, Phone, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';

type Worker = { id: string; name: string; email: string; phone: string; role: string; status: string; onboarding_status: string; created_at: string };
type Assignment = { id: string; title: string; description: string; kind: string; status: string; due_at: string | null; created_at: string; updated_at: string };
type Detail = {
  worker: Worker & { hmsiId: string | null; onboarded_at: string | null; auth_user_id: string | null; idCard: { role_display: string; status: string; issued_at: string; activated_at: string | null } | null };
  assignments: Assignment[];
  completedAssignments: Assignment[];
  fieldProofs: unknown[];
  attendance: unknown[];
  activity: Array<{ id: string; event_type: string; created_at: string }>;
};

export default function WorkerDirectory() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/workers', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Worker directory is unavailable.');
        setWorkers(data.workers || []);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Worker directory is unavailable.'))
      .finally(() => setLoading(false));
  }, []);

  async function openWorker(id: string) {
    setDetailLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/directory/${id}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Worker profile is unavailable.');
      setDetail(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Worker profile is unavailable.');
    } finally { setDetailLoading(false); }
  }

  async function requestReset() {
    if (!detail) return;
    setResetBusy(true); setNotice(''); setError('');
    try {
      const response = await fetch(`/api/admin/directory/${detail.worker.id}/reset`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Password reset could not be requested.');
      setNotice(data.message || 'Password reset requested.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Password reset could not be requested.');
    } finally { setResetBusy(false); }
  }

  async function requestRemoval() {
    if (!detail || !window.confirm(`Remove ${detail.worker.name} from active access? Their data will remain recoverable for 30 days before final purge.`)) return;
    setRemoveBusy(true); setNotice(''); setError('');
    try {
      const response = await fetch(`/api/admin/directory/${detail.worker.id}/remove`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'REMOVE_30_DAYS' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The removal request could not be completed.');
      setWorkers((current) => current.filter((worker) => worker.id !== detail.worker.id));
      setDetail(null);
      setNotice(data.message || 'Access was revoked and the 30-day recovery period has started.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The removal request could not be completed.');
    } finally { setRemoveBusy(false); }
  }

  const statusMessage = error || notice;

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-10 text-[#17221e] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/hmsi-control" className="text-sm font-black text-[#1e5b49] hover:underline">← Admin control center</Link>
        <header className="mt-8 border-b border-[#d9d6ce] pb-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Private administration</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Worker directory</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66716a]">Open a worker record to review onboarding, HMSI ID, task, and access history. No attendance or field-proof record is inferred when it has not been received.</p>
        </header>
        {statusMessage && <p role="status" className={`mt-6 rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>{statusMessage}</p>}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {loading ? <p className="text-sm text-[#66716a]">Loading workers…</p> : workers.length === 0 ? <div className="rounded-3xl border border-[#d9d6ce] bg-white p-8 text-center text-sm text-[#66716a]">No active worker records are available.</div> : workers.map((worker) => (
            <button key={worker.id} type="button" onClick={() => openWorker(worker.id)} className="rounded-3xl border border-[#d9d6ce] bg-white p-6 text-left transition hover:border-[#1e5b49]">
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black">{worker.name}</h2><p className="mt-2 text-sm text-[#66716a]">{worker.email}</p><p className="mt-1 text-sm text-[#66716a]">{worker.phone}</p></div><ChevronRight className="text-[#1e5b49]" /></div>
              <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[#1e5b49]">{worker.status}</span><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[#b56b3b]">Onboarding: {worker.onboarding_status}</span></div>
            </button>
          ))}
        </section>
        {(detail || detailLoading) && <div className="fixed inset-0 z-50 flex justify-end bg-[#17221e]/35" role="dialog" aria-modal="true" aria-label="Worker profile">
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#f6f4ef] p-6 shadow-2xl sm:p-8">
            {detailLoading ? <div className="flex h-full items-center justify-center text-[#66716a]"><Loader2 className="animate-spin" /> <span className="ml-2">Loading worker profile…</span></div> : detail && <>
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Worker profile</p><h2 className="mt-2 text-3xl font-black">{detail.worker.name}</h2></div><button type="button" onClick={() => { setDetail(null); setNotice(''); }} className="rounded-full border border-[#d9d6ce] p-2" aria-label="Close worker profile"><X size={18} /></button></div>
              <div className="mt-7 grid gap-3 rounded-3xl border border-[#d9d6ce] bg-white p-5 sm:grid-cols-2">
                <p className="flex gap-2 text-sm"><Mail size={16} className="mt-0.5 text-[#1e5b49]" /><span><strong>Email</strong><br />{detail.worker.email}</span></p>
                <p className="flex gap-2 text-sm"><Phone size={16} className="mt-0.5 text-[#1e5b49]" /><span><strong>Phone</strong><br />{detail.worker.phone}</span></p>
                <p className="flex gap-2 text-sm"><UserRound size={16} className="mt-0.5 text-[#1e5b49]" /><span><strong>Role</strong><br />{detail.worker.role}</span></p>
                <p className="flex gap-2 text-sm"><ShieldCheck size={16} className="mt-0.5 text-[#1e5b49]" /><span><strong>HMSI ID</strong><br />{detail.worker.hmsiId || 'Not issued yet'}</span></p>
                <p className="text-sm"><strong>Access state</strong><br />{detail.worker.status} · onboarding {detail.worker.onboarding_status}</p>
                <p className="text-sm"><strong>Portal account</strong><br />{detail.worker.auth_user_id ? 'Password established' : 'Not established'}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/hmsi-control?assign_worker=${encodeURIComponent(detail.worker.id)}`} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white"><ClipboardList size={16} /> Assign new task</Link>
                <button type="button" disabled={resetBusy || !detail.worker.auth_user_id} onClick={requestReset} className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49] disabled:opacity-50"><KeyRound size={16} /> {resetBusy ? 'Requesting…' : 'Send password reset email'}</button>
                <button type="button" disabled={removeBusy} onClick={requestRemoval} className="inline-flex items-center gap-2 rounded-full border border-red-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-red-700 disabled:opacity-50"><Trash2 size={16} /> {removeBusy ? 'Removing…' : 'Remove user (30-day recovery)'}</button>
              </div>
              <section className="mt-9"><h3 className="text-xl font-black">Task activity</h3><p className="mt-1 text-sm text-[#66716a]">{detail.assignments.length} assigned · {detail.completedAssignments.length} completed</p><div className="mt-4 space-y-3">{detail.assignments.length === 0 ? <p className="rounded-2xl border border-dashed border-[#d9d6ce] bg-white p-4 text-sm text-[#66716a]">No assigned tasks recorded.</p> : detail.assignments.map((assignment) => <div key={assignment.id} className="rounded-2xl border border-[#d9d6ce] bg-white p-4"><div className="flex justify-between gap-3"><strong>{assignment.title}</strong><span className="text-xs font-black uppercase tracking-widest text-[#1e5b49]">{assignment.status}</span></div><p className="mt-2 text-sm text-[#66716a]">{assignment.description}</p></div>)}</div></section>
              <section className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><h3 className="font-black">Submitted field proof</h3><p className="mt-2 text-sm leading-6 text-[#66716a]">{detail.fieldProofs.length === 0 ? 'No field-proof links are recorded for this worker.' : 'Recorded proof links are available below.'}</p></div><div className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><h3 className="font-black">Attendance</h3><p className="mt-2 text-sm leading-6 text-[#66716a]">{detail.attendance.length === 0 ? 'No attendance records are available.' : 'Recorded attendance is available below.'}</p></div></section>
              <section className="mt-8"><h3 className="text-xl font-black">Access and activity history</h3><div className="mt-4 space-y-3">{detail.activity.length === 0 ? <p className="rounded-2xl border border-dashed border-[#d9d6ce] bg-white p-4 text-sm text-[#66716a]">No portal access events are recorded yet.</p> : detail.activity.map((event) => <div key={event.id} className="rounded-2xl bg-white p-4 text-sm"><strong>{event.event_type.replaceAll('_', ' ')}</strong><p className="mt-1 text-[#66716a]">{new Date(event.created_at).toLocaleString('en-NG')}</p></div>)}</div></section>
            </>}
          </aside>
        </div>}
      </div>
    </main>
  );
}
