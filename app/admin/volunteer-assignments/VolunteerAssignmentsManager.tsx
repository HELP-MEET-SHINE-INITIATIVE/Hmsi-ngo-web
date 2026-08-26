'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, FileCheck2, Loader2, RotateCcw, Search, Send, ShieldCheck, Trash2, Users, XCircle } from 'lucide-react';

type Volunteer = { id: string; name: string; email: string; phone: string; interest: string; status: string; account_status: string; auth_user_id: string | null; assignment_ready: boolean };
type Proof = { id: string; status: string; created_at: string; reviewed_at: string | null };
type Assignment = {
  id: string; title: string; description: string; category: string; priority: string; status: string; due_at: string | null; proof_required: boolean; proof_count: number;
  completion_note?: string | null; review_note?: string | null; reviewed_at?: string | null; completed_at?: string | null; created_at: string; volunteer: Volunteer | null; proofs: Proof[];
};

const categories = ['community_outreach', 'field_verification', 'ground_assistance', 'digital_advocacy', 'training_support', 'other'];
const priorities = ['high', 'medium', 'low'];
const statuses = ['all', 'assigned', 'in_progress', 'submitted', 'completed', 'revisions_requested', 'rejected', 'cancelled'];

function humanize(value: string) { return value.replaceAll('_', ' '); }
function formatDate(value: string | null | undefined) { return value ? new Date(value).toLocaleString('en-NG') : 'Not set'; }
function progressCopy(item: Assignment) {
  if (item.status === 'completed') return 'Approved by HMSI';
  if (item.status === 'submitted') return item.proof_count ? `Proof received · awaiting review` : 'Submitted · awaiting review';
  if (item.status === 'in_progress') return item.proof_required ? 'In progress · proof required' : 'In progress';
  if (item.status === 'revisions_requested') return 'Volunteer revisions requested';
  if (item.status === 'assigned') return 'Assigned · awaiting acceptance';
  return humanize(item.status);
}

export default function VolunteerAssignmentsManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewing, setReviewing] = useState<Assignment | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve_completion' | 'request_revisions' | 'reject' | 'cancel'>('approve_completion');
  const [reviewNote, setReviewNote] = useState('');
  const [form, setForm] = useState({ title: '', description: '', volunteerId: '', category: 'community_outreach', priority: 'medium', dueAt: '', proofRequired: false, adminNote: '' });

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/volunteer-assignments', { credentials: 'include', cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Volunteer assignments are temporarily unavailable.');
      setAssignments(result.assignments || []);
      setVolunteers(result.volunteers || []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Volunteer assignments are temporarily unavailable.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const assignmentReady = volunteers.filter((volunteer) => volunteer.assignment_ready);
  const visible = useMemo(() => assignments.filter((assignment) => {
    const searchable = `${assignment.title} ${assignment.description} ${assignment.volunteer?.name || ''} ${assignment.volunteer?.email || ''}`.toLowerCase();
    return (statusFilter === 'all' || assignment.status === statusFilter) && (!query.trim() || searchable.includes(query.trim().toLowerCase()));
  }), [assignments, query, statusFilter]);

  async function createAssignment(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/volunteer-assignments', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The volunteer assignment could not be created.');
      setForm({ title: '', description: '', volunteerId: '', category: 'community_outreach', priority: 'medium', dueAt: '', proofRequired: false, adminNote: '' });
      setNotice(result.notification?.sent ? 'Volunteer assignment created and official notice dispatched.' : 'Volunteer assignment created. Notification delivery is pending or unavailable.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The volunteer assignment could not be created.'); }
    finally { setSaving(false); }
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (!reviewing) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/volunteer-assignments', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: reviewing.id, action: reviewAction, reviewNote }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The review action could not be completed.');
      setReviewing(null); setReviewNote(''); setNotice(`Volunteer assignment ${humanize(reviewAction)}.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The review action could not be completed.'); }
    finally { setSaving(false); }
  }

  async function removeAssignment(item: Assignment) {
    if (!window.confirm(`Move “${item.title}” to the 30-day recovery register?`)) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/volunteer-assignments', { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The assignment could not be moved to recovery.');
      setNotice('Volunteer assignment moved to the 30-day recovery register.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The assignment could not be moved to recovery.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="rounded-3xl border border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">Loading secure volunteer assignment register…</div>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">People & operations</p><h1 className="mt-2 text-3xl font-black tracking-tight">Volunteer assignments</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#66716a]">Assign clear, approved community work to activated volunteers, then review progress, private proof status, and completion requests in one protected register.</p></div><div className="flex flex-wrap gap-2"><Link href="/hmsi-control" className="rounded-full border border-[#d9d6ce] px-4 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Admin control</Link><Link href="/admin/assignments" className="rounded-full bg-[#17221e] px-4 py-3 text-xs font-black uppercase tracking-widest text-white">Worker assignments</Link></div></div>
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Assignment-ready volunteers" value={assignmentReady.length} /><Metric label="Open volunteer work" value={assignments.filter((item) => ['assigned', 'in_progress', 'revisions_requested'].includes(item.status)).length} /><Metric label="Awaiting review" value={assignments.filter((item) => item.status === 'submitted').length} /></div>
    <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-start gap-3"><Users className="mt-1 text-[#1e5b49]" size={20} /><div><h2 className="font-black">Issue a volunteer assignment</h2><p className="mt-1 text-sm leading-6 text-[#66716a]">Only approved, active volunteers with a completed portal activation are selectable. The server verifies this again before creating the assignment.</p></div></div><form onSubmit={createAssignment} className="mt-5 grid gap-4 md:grid-cols-2"><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Assignment title" className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder="Required outcome, safety context, and expected completion" className="resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><select required value={form.volunteerId} onChange={(event) => setForm({ ...form, volunteerId: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="">Select an activated volunteer…</option>{assignmentReady.map((volunteer) => <option key={volunteer.id} value={volunteer.id}>{volunteer.name} · {volunteer.email} · {volunteer.interest}</option>)}</select><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none">{categories.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}</select><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none">{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Due date<input type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label><label className="flex items-center gap-3 rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-bold text-[#17221e] md:col-span-2"><input type="checkbox" checked={form.proofRequired} onChange={(event) => setForm({ ...form, proofRequired: event.target.checked })} /> Require a private Google Drive or Docs proof link before review</label><textarea value={form.adminNote} onChange={(event) => setForm({ ...form, adminNote: event.target.value })} rows={2} placeholder="Internal admin note (not visible in the volunteer workspace)" className="resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none md:col-span-2" /><button disabled={saving || assignmentReady.length === 0} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 md:col-span-2">{saving && <Loader2 size={15} className="animate-spin" />} Create assignment</button></form>{assignmentReady.length === 0 && <p className="mt-4 rounded-2xl bg-[#fff8e8] p-4 text-xs leading-5 text-[#7a5b16]">No activated volunteers are ready for an assignment yet. Approve the volunteer application and complete the official portal onboarding first.</p>}</section>
    <section className="space-y-4"><div className="flex flex-col gap-3 rounded-3xl border border-[#d9d6ce] bg-white p-4 sm:flex-row"><label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[#f6f4ef] px-4 py-3"><Search size={17} className="text-[#66716a]" /><span className="sr-only">Search volunteer assignments</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search volunteer, email, or assignment" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none">{statuses.map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : humanize(status)}</option>)}</select></div><div className="flex items-center justify-between text-xs font-bold text-[#66716a]"><span>{visible.length} active volunteer assignment{visible.length === 1 ? '' : 's'}</span><span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[#1e5b49]" /> Admin-only progress register</span></div>{visible.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">No volunteer assignments match this view.</div> : visible.map((item) => <article key={item.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest"><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[#b56b3b]">{humanize(item.category)}</span><span className="rounded-full bg-[#fff1dd] px-3 py-1 text-[#9a5318]">{item.priority}</span><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[#1e5b49]">{humanize(item.status)}</span></div><h2 className="mt-3 text-xl font-black">{item.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#66716a]">{item.description}</p></div><div className="flex flex-wrap gap-2">{item.status === 'submitted' && <><button onClick={() => { setReviewing(item); setReviewAction('approve_completion'); setReviewNote(''); }} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white"><CheckCircle2 size={14} /> Approve</button><button onClick={() => { setReviewing(item); setReviewAction('request_revisions'); setReviewNote(''); }} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-[#b56b3b] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#9a5318]"><RotateCcw size={14} /> Revisions</button></>}<button onClick={() => { setReviewing(item); setReviewAction('cancel'); setReviewNote(''); }} disabled={saving || ['completed', 'cancelled', 'rejected'].includes(item.status)} className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a]"><XCircle size={14} /> Cancel</button><button onClick={() => void removeAssignment(item)} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700"><Trash2 size={14} /> Delete</button></div></div><div className="mt-5 grid gap-4 border-t border-[#ece8df] pt-5 sm:grid-cols-4"><Info label="Volunteer" value={item.volunteer ? item.volunteer.name : 'Volunteer record unavailable'} subvalue={item.volunteer?.email} /><Info label="Progress" value={progressCopy(item)} subvalue={item.proof_required ? `${item.proof_count} proof link${item.proof_count === 1 ? '' : 's'} received` : 'No proof required'} /><Info label="Due" value={formatDate(item.due_at)} subvalue={`Created ${formatDate(item.created_at)}`} /><Info label="Review" value={item.reviewed_at ? formatDate(item.reviewed_at) : 'Not reviewed'} subvalue={item.review_note || item.completion_note || 'No review note'} /></div></article>)}</section>
    {reviewing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17221e]/50 p-3 sm:items-center"><form onSubmit={submitReview} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Review volunteer work</p><h2 className="mt-2 text-2xl font-black">{reviewing.title}</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">{reviewAction === 'approve_completion' ? 'Approve the submitted work once the outcome and any private proof have been reviewed.' : reviewAction === 'request_revisions' ? 'Explain the specific update the volunteer must make before re-submission.' : 'Provide a clear HMSI reason for cancelling this assignment.'}</p><textarea required={reviewAction !== 'approve_completion'} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={4} maxLength={4000} placeholder={reviewAction === 'approve_completion' ? 'Optional acknowledgement note' : 'Required administrator note'} className="mt-5 w-full resize-none rounded-2xl bg-[#f6f4ef] p-4 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setReviewing(null)} className="rounded-full border border-[#d9d6ce] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#66716a]">Cancel</button><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />} {reviewAction === 'approve_completion' ? 'Approve completion' : humanize(reviewAction)}</button></div></form></div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><p className="text-3xl font-black text-[#1e5b49]">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-widest text-[#66716a]">{label}</p></div>; }
function Info({ label, value, subvalue }: { label: string; value: string; subvalue?: string | null }) { return <div><p className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">{label}</p><p className="mt-1 break-words text-sm font-black">{value}</p>{subvalue && <p className="mt-1 break-words text-xs leading-5 text-[#66716a]">{subvalue}</p>}</div>; }
