'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, ClipboardList, IdCard, UserCheck, UserPlus, XCircle } from 'lucide-react';
import { PrintableHmsiIdCard } from './HmsiIdCardPanel';

type Application = { id: string; name: string; email: string; phone?: string | null; purpose: string; status: string; created_at: string };
type Member = { id: string; name: string; email: string; phone?: string | null; status: string; onboarding_status?: string | null; created_at: string };
type MemberTask = { id: string; assigned_member_id: string; title: string; description: string; priority: string; status: string; due_at?: string | null; completion_note?: string | null; submitted_at?: string | null; review_note?: string | null; reviewed_at?: string | null };

export default function MemberAdminPanel() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<MemberTask[]>([]);
  const [selected, setSelected] = useState('');
  const [task, setTask] = useState({ title: '', description: '', priority: 'normal', due_at: '' });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [issuedCard, setIssuedCard] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [membersResponse, tasksResponse] = await Promise.all([
      fetch('/api/admin/members', { cache: 'no-store' }),
      fetch('/api/admin/member-tasks', { cache: 'no-store' }),
    ]);
    const membersResult = await membersResponse.json();
    const tasksResult = await tasksResponse.json();
    if (!membersResponse.ok) throw new Error(membersResult.error || 'Member records are unavailable.');
    if (!tasksResponse.ok) throw new Error(tasksResult.error || 'Member tasks are unavailable.');
    setApplications(membersResult.applications || []);
    setMembers(membersResult.members || []);
    setTasks(tasksResult.tasks || []);
  }, []);

  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Member records are unavailable.')); }, [load]);

  const review = async (id: string, action: 'approve' | 'reject') => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/members', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to review application.');
      setNotice(result.message); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to review application.'); } finally { setBusy(false); }
  };

  const issueCard = async () => {
    const member = members.find((item) => item.id === selected);
    if (!member) return;
    setBusy(true); setError(''); setIssuedCard(null);
    try {
      const response = await fetch('/api/admin/credentials/id-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holder_role: 'member', holder_id: member.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to issue member card.');
      setIssuedCard({ card: result.card, activationCode: result.activationCode });
      setNotice('Member ID card issued. Give the temporary activation code directly to the named member.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to issue member card.'); } finally { setBusy(false); }
  };

  const assign = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/member-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assigned_member_id: selected, title: task.title, description: task.description, priority: task.priority, due_at: task.due_at || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to assign task.');
      setTask({ title: '', description: '', priority: 'normal', due_at: '' });
      setNotice('Member task assigned.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to assign task.'); } finally { setBusy(false); }
  };

  const decideTask = async (id: string, status: 'completed' | 'cancelled') => {
    const reviewNote = reviewNotes[id]?.trim() || '';
    if (!reviewNote) { setError('Enter a review note before approving or cancelling submitted member work.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/member-tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, review_note: reviewNote }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to review submitted member work.');
      setReviewNotes((current) => { const next = { ...current }; delete next[id]; return next; });
      setNotice(status === 'completed' ? 'Member work approved and recorded.' : 'Member work cancelled with the recorded review note.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to review submitted member work.'); } finally { setBusy(false); }
  };

  const activeMembers = members.filter((member) => member.status === 'active');
  const submittedTasks = tasks.filter((item) => item.status === 'submitted');
  const nameFor = (memberId: string) => members.find((member) => member.id === memberId)?.name || 'Assigned HMSI member';

  return <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">General HMSI members</p><h2 className="mt-1 text-2xl font-black">Member onboarding, task allocation, and review</h2><p className="mt-2 text-sm text-[#66716a]">Review registrations, issue secure member IDs, allocate private work, and make a documented administrator decision on every submitted task.</p></div>{(error || notice) && <div className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}<section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center gap-2"><UserPlus size={19} className="text-[#1e5b49]" /><h3 className="text-lg font-black">Membership applications</h3></div>{applications.length === 0 ? <p className="mt-4 text-sm text-[#66716a]">No general-member applications yet.</p> : <div className="mt-4 space-y-3">{applications.map((application) => <div key={application.id} className="rounded-2xl bg-[#f6f4ef] p-4"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">{application.status}</span><span className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b]">{new Date(application.created_at).toLocaleDateString()}</span></div><p className="mt-2 font-black">{application.name}</p><p className="text-xs text-[#66716a]">{application.email}{application.phone ? ` · ${application.phone}` : ''}</p><p className="mt-2 max-w-2xl text-sm leading-6">{application.purpose}</p></div>{application.status === 'pending' && <div className="flex shrink-0 gap-2"><button disabled={busy} onClick={() => review(application.id, 'approve')} className="rounded-full bg-[#1e5b49] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">Approve</button><button disabled={busy} onClick={() => review(application.id, 'reject')} className="rounded-full border border-red-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-600">Reject</button></div>}</div></div>)}</div>}</section><div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center gap-2"><IdCard size={19} className="text-[#b56b3b]" /><h3 className="text-lg font-black">Issue member ID card</h3></div><select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-4 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="">Select an active member…</option>{activeMembers.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}{member.onboarding_status ? ` · ${member.onboarding_status}` : ''}</option>)}</select><button type="button" disabled={busy || !selected} onClick={issueCard} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#17221e] px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><IdCard size={14} /> Issue card</button>{issuedCard && <div className="mt-5"><PrintableHmsiIdCard card={issuedCard.card} activationCode={issuedCard.activationCode} /></div>}</section><form onSubmit={assign} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center gap-2"><ClipboardList size={19} className="text-[#1e5b49]" /><h3 className="text-lg font-black">Allocate member task</h3></div><p className="mt-2 text-xs leading-5 text-[#66716a]">Members can move work to in progress or submit it with a note. Completion and cancellation require an administrator’s review note after submission.</p><input required minLength={3} placeholder="Task title" value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} className="mt-4 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><textarea required minLength={10} rows={4} placeholder="Task instructions" value={task.description} onChange={(event) => setTask({ ...task, description: event.target.value })} className="mt-3 w-full resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><div className="mt-3 grid gap-3 sm:grid-cols-2"><select value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="low">Low priority</option><option value="normal">Normal priority</option><option value="high">High priority</option><option value="urgent">Urgent</option></select><input type="datetime-local" value={task.due_at} onChange={(event) => setTask({ ...task, due_at: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none" /></div><button disabled={busy || !selected} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><UserCheck size={14} /> Assign task</button></form></div><section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center gap-2"><ClipboardCheck size={19} className="text-[#b56b3b]" /><h3 className="text-lg font-black">Submitted member work awaiting review</h3></div><p className="mt-2 text-sm text-[#66716a]">This is the review gate. A submitted task can only be approved or cancelled here with a documented rationale.</p>{submittedTasks.length === 0 ? <p className="mt-4 rounded-2xl bg-[#e9f0e9] p-4 text-sm text-[#1e5b49]">No submitted member work is awaiting review.</p> : <div className="mt-4 space-y-3">{submittedTasks.map((item) => <article key={item.id} className="rounded-2xl bg-[#f6f4ef] p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black">{item.title}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#b56b3b]">{nameFor(item.assigned_member_id)} · {item.priority}</p><p className="mt-2 text-sm leading-6">{item.completion_note || 'No completion note provided.'}</p></div><p className="text-xs text-[#66716a]">Submitted {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : 'recently'}</p></div><textarea required rows={2} value={reviewNotes[item.id] || ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Required administrator review note" className="mt-4 w-full resize-none rounded-2xl border border-[#d9d6ce] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={() => decideTask(item.id, 'completed')} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={14} /> Approve work</button><button disabled={busy} onClick={() => decideTask(item.id, 'cancelled')} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={14} /> Cancel task</button></div></article>)}</div>}</section></div>;
}
