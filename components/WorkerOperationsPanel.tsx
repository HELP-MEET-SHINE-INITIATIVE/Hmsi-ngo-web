'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, Clock3, Megaphone } from 'lucide-react';

type Assignment = { id: string; title: string; description: string; kind: string; status: string; due_at: string | null };
type Workspace = { worker: { name: string; onboarding_status: string; ads_manager_enabled: boolean; assignments_manager_enabled: boolean }; assignments: Assignment[]; sponsorships: Array<{ id: string; title: string; budget_ngn: number; status: string }> };

export default function WorkerOperationsPanel() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/worker/workspace', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Worker workspace is unavailable.');
    setWorkspace(payload);
  }, []);

  useEffect(() => { load().catch((error) => setMessage(error instanceof Error ? error.message : 'Complete onboarding to unlock worker operations.')); }, [load]);

  const updateAssignment = async (assignment: Assignment, status: string) => {
    setBusy(assignment.id); setMessage('');
    try {
      const response = await fetch('/api/worker/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: assignment.id, status }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Assignment update failed.');
      setWorkspace((current) => current ? { ...current, assignments: current.assignments.map((item) => item.id === assignment.id ? { ...item, status } : item) } : current);
      setMessage('Assignment status updated.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Assignment update failed.'); }
    finally { setBusy(null); }
  };

  if (!workspace && !message) return <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6 text-sm text-[#66716a]">Loading worker operations…</section>;
  if (!workspace) return <section className="rounded-3xl border border-[#ead9ad] bg-[#fff8e8] p-6 text-sm leading-6 text-[#7a5b16]">{message}</section>;
  const completed = workspace.assignments.filter((item) => item.status === 'completed').length;
  const active = workspace.assignments.length - completed;
  return <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Approved worker workspace</p><h2 className="mt-2 text-2xl font-black">Good to see you, {workspace.worker.name}.</h2><p className="mt-2 text-sm text-[#66716a]">Assignments remain administrator-approved. Update progress here and submit sponsored-placement requests for review.</p></div><div className="flex gap-2"><Link href="/sponsor" className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-4 py-3 text-xs font-black uppercase tracking-widest text-white"><Megaphone size={15} /> Request sponsorship</Link></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#e9f0e9] p-4"><p className="text-2xl font-black text-[#1e5b49]">{workspace.assignments.length}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">Total assignments</p></div><div className="rounded-2xl bg-[#fff8e8] p-4"><p className="text-2xl font-black text-[#b56b3b]">{active}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">Open work</p></div><div className="rounded-2xl bg-[#f6f4ef] p-4"><p className="text-2xl font-black text-[#1e5b49]">{completed}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">Completed</p></div></div>{message && <p role="status" className="mt-4 rounded-2xl bg-[#f6f4ef] p-3 text-sm text-[#66716a]">{message}</p>}<div className="mt-6 space-y-3">{workspace.assignments.length === 0 ? <p className="rounded-2xl bg-[#f6f4ef] p-4 text-sm text-[#66716a]">No administrator-approved assignments yet.</p> : workspace.assignments.map((assignment) => <div key={assignment.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-[#d9d6ce] p-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><BriefcaseBusiness className="mt-1 shrink-0 text-[#1e5b49]" size={18} /><div><p className="font-black">{assignment.title}</p><p className="mt-1 text-sm leading-6 text-[#66716a]">{assignment.description}</p><p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#b56b3b]">{assignment.kind} · {assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleDateString('en-NG')}` : 'No due date'}</p></div></div><label className="flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-widest text-[#66716a]"><CheckCircle2 size={16} className={assignment.status === 'completed' ? 'text-[#1e5b49]' : 'text-[#e1ad45]'} /><select disabled={busy === assignment.id} value={assignment.status} onChange={(event) => updateAssignment(assignment, event.target.value)} className="rounded-xl bg-[#f6f4ef] px-3 py-2 text-xs font-bold outline-none"><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label></div>)}</div>{workspace.sponsorships.length > 0 && <p className="mt-5 flex items-center gap-2 text-xs text-[#66716a]"><Clock3 size={14} /> {workspace.sponsorships.length} sponsorship request{workspace.sponsorships.length === 1 ? '' : 's'} linked to this worker email.</p>}</section>;
}
