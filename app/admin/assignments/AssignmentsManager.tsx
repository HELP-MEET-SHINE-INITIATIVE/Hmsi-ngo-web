'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Edit3, Loader2, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';

type Assignment = {
  id: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  assigned_worker_id: string;
  assigned_worker_name: string | null;
  assigned_worker_email: string | null;
  fundraiser_id?: string | null;
  due_at: string | null;
  created_at: string;
  updated_at?: string;
  admin_note?: string | null;
  completion_note?: string | null;
  review_note?: string | null;
  submitted_at?: string | null;
  completed_at?: string | null;
};

type Worker = { id: string; name: string; email: string; phone: string; location?: string | null; status: string; onboarding_status?: string };

const statuses = ['assigned', 'in_progress', 'submitted', 'completed', 'cancelled'] as const;

export default function AssignmentsManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [confirming, setConfirming] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', kind: 'job', status: 'assigned', workerId: '', dueAt: '', adminNote: '' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/assignments', { credentials: 'include', cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Assignments are temporarily unavailable.');
      setAssignments(result.assignments || []);
      setWorkers(result.workers || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assignments are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assignments.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const haystack = `${item.title} ${item.description} ${item.assigned_worker_name || ''} ${item.assigned_worker_email || ''}`.toLowerCase();
      return matchesStatus && (!normalized || haystack.includes(normalized));
    });
  }, [assignments, query, statusFilter]);

  function beginEdit(item: Assignment) {
    setError(''); setNotice(''); setEditing(item);
    setEditForm({ title: item.title, description: item.description, kind: item.kind, status: item.status, workerId: item.assigned_worker_id, dueAt: item.due_at ? new Date(item.due_at).toISOString().slice(0, 16) : '', adminNote: item.admin_note || '' });
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSavingId(editing.id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/assignments', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, title: editForm.title, description: editForm.description, kind: editForm.kind, status: editForm.status, workerId: editForm.workerId, dueAt: editForm.dueAt || null, adminNote: editForm.adminNote || null }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to save this assignment.');
      setEditing(null); setNotice('Assignment updated.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save this assignment.'); }
    finally { setSavingId(null); }
  }

  async function softDelete() {
    if (!confirming) return;
    const item = confirming; setSavingId(item.id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/assignments', { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to remove this assignment.');
      setConfirming(null); setNotice('Assignment moved to recovery and hidden from active work queues.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove this assignment.'); }
    finally { setSavingId(null); }
  }

  if (loading) return <div className="rounded-3xl border border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">Loading assignment register…</div>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Operations menu</p><h1 className="mt-2 text-3xl font-black tracking-tight">Job assignments</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">Workers can accept, act, and submit work. Approved active workers are listed even when activation is pending; their assignment is held securely until they can access their portal. Only an authorised administrator can approve a submitted job as completed.</p></div><Link href="/hmsi-control?view=assignments" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-4 py-3 text-xs font-black uppercase tracking-widest text-white"><Users size={15} /> Create assignment</Link></div>
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}
    <div className="flex flex-col gap-3 rounded-3xl border border-[#d9d6ce] bg-white p-4 sm:flex-row"><label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[#f6f4ef] px-4 py-3"><Search size={17} className="shrink-0 text-[#66716a]" /><span className="sr-only">Search assignments</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search job, assignee, or email" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><label className="flex items-center gap-3 rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-bold"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-transparent outline-none"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label></div>
    <div className="flex items-center justify-between text-xs font-bold text-[#66716a]"><span>{visible.length} active assignment{visible.length === 1 ? '' : 's'}</span><span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[#1e5b49]" /> Admin-only register</span></div>
    {visible.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">No active assignments match this view.</div> : <div className="grid gap-4">{visible.map((item) => <article key={item.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest"><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[#b56b3b]">{item.kind}</span><span className={`rounded-full px-3 py-1 ${item.status === 'submitted' ? 'bg-[#fff1dd] text-[#9a5318]' : 'bg-[#e9f0e9] text-[#1e5b49]'}`}>{item.status.replace('_', ' ')}</span></div><h2 className="mt-3 text-xl font-black">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">{item.description}</p></div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => beginEdit(item)} className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><Edit3 size={14} /> {item.status === 'submitted' ? 'Review submission' : 'Edit'}</button><button type="button" onClick={() => setConfirming(item)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700"><Trash2 size={14} /> Delete</button></div></div><div className="mt-5 grid gap-3 border-t border-[#ece8df] pt-5 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">Assigned to</p><p className="mt-1 font-black">{item.assigned_worker_name || 'Worker record unavailable'}</p><p className="mt-1 break-all text-xs text-[#66716a]">{item.assigned_worker_email || 'No email available'}</p></div><div><p className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">Due</p><p className="mt-1 font-black">{item.due_at ? new Date(item.due_at).toLocaleString('en-NG') : 'No due date'}</p></div><div><p className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">Created</p><p className="mt-1 font-black">{new Date(item.created_at).toLocaleDateString('en-NG')}</p></div></div>{item.completion_note && <p className="mt-4 rounded-2xl bg-[#e9f0e9] p-3 text-xs leading-5 text-[#1e5b49]"><strong>Worker submission:</strong> {item.completion_note}</p>}{(item.review_note || item.admin_note) && <p className="mt-4 rounded-2xl bg-[#fff8e8] p-3 text-xs leading-5 text-[#7a5b16]"><strong>Administrator review:</strong> {item.review_note || item.admin_note}</p>}</article>)}</div>}
    {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17221e]/50 p-3 sm:items-center"><form onSubmit={saveEdit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Review assignment</p><h2 className="mt-2 text-2xl font-black">{editing.status === 'submitted' ? 'Approve or close submitted work' : 'Edit job details'}</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="Close edit dialog" className="rounded-full p-2 text-[#66716a] hover:bg-[#f6f4ef]"><X size={20} /></button></div><div className="mt-6 space-y-4"><input required value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} placeholder="Assignment title" className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><textarea required rows={5} value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} placeholder="Assignment brief" className="w-full resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" />{editing.completion_note && <p className="rounded-2xl bg-[#e9f0e9] p-4 text-sm leading-6 text-[#1e5b49]"><strong>Worker submission:</strong> {editing.completion_note}</p>}<div className="grid gap-4 sm:grid-cols-2"><select value={editForm.kind} onChange={(event) => setEditForm({ ...editForm, kind: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="assistance">Assistance</option><option value="job">Job</option></select><select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none">{statuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></div><select required value={editForm.workerId} onChange={(event) => setEditForm({ ...editForm, workerId: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="">Select active worker</option>{workers.filter((worker) => worker.status === 'active').map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.email} · {worker.location || 'Location pending'} · {worker.onboarding_status === 'completed' ? 'portal ready' : 'activation pending'}</option>)}</select><label className="block text-xs font-black uppercase tracking-widest text-[#66716a]">Due date<input type="datetime-local" value={editForm.dueAt} onChange={(event) => setEditForm({ ...editForm, dueAt: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label><textarea required={['completed', 'cancelled'].includes(editForm.status)} rows={3} value={editForm.adminNote} onChange={(event) => setEditForm({ ...editForm, adminNote: event.target.value })} placeholder={['completed', 'cancelled'].includes(editForm.status) ? 'Required administrator review note' : 'Internal administrator note (optional)'} className="w-full resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none" /></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setEditing(null)} className="rounded-full border border-[#d9d6ce] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#66716a]">Cancel</button><button disabled={savingId === editing.id} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60">{savingId === editing.id && <Loader2 className="animate-spin" size={15} />} Save changes</button></div></form></div>}
    {confirming && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17221e]/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><Trash2 className="text-red-700" size={24} /><h2 className="mt-4 text-2xl font-black">Move assignment to recovery?</h2><p className="mt-3 text-sm leading-6 text-[#66716a]">“{confirming.title}” will be hidden from active work queues and retained for the approved recovery period. This does not immediately hard-delete the assignment.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={() => setConfirming(null)} className="rounded-full border border-[#d9d6ce] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#66716a]">Cancel</button><button onClick={() => void softDelete()} disabled={savingId === confirming.id} className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60">{savingId === confirming.id && <Loader2 className="animate-spin" size={15} />} Confirm recovery</button></div></div></div>}
  </div>;
}
