'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileUp,
  LogOut,
  MessageCircle,
  PlayCircle,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import WorkspaceOpportunities from '../../../components/WorkspaceOpportunities';

type Role = 'worker' | 'volunteer' | 'member';
type Assignment = {
  id: string;
  title: string;
  description: string;
  kind: string;
  priority?: string | null;
  status: string;
  due_at: string | null;
  completion_note?: string | null;
  created_at: string;
  updated_at: string;
};
type Payload = { identity: { name: string; role: Role }; assignments: Assignment[]; message: string | null };

const roleConfig: Record<Role, {
  title: string;
  eyebrow: string;
  intro: string;
  roomLink: string;
  roomLabel: string;
  taskLabel: string;
  opportunityLabel: string;
  accent: string;
}> = {
  worker: {
    title: 'Worker operations workspace',
    eyebrow: 'Field operations',
    intro: 'Your approved work queue, field room, proof-submission route, and relevant openings are together in one place.',
    roomLink: '/worker-room',
    roomLabel: 'Worker Operations Room',
    taskLabel: 'My assigned jobs',
    opportunityLabel: 'Worker opportunities',
    accent: 'Operational assignments',
  },
  volunteer: {
    title: 'Volunteer workspace',
    eyebrow: 'Community contribution',
    intro: 'Review approved opportunities, coordinate safely in your room, and use the private submission route when HMSI requests supporting material.',
    roomLink: '/volunteer-room',
    roomLabel: 'Volunteer Community Room',
    taskLabel: 'My assigned jobs',
    opportunityLabel: 'Volunteer opportunities',
    accent: 'Volunteer pathways',
  },
  member: {
    title: 'Member workspace',
    eyebrow: 'Advocacy and participation',
    intro: 'Follow your member action list, submit completion notes, join the member lounge, and review approved HMSI pathways.',
    roomLink: '/member-room',
    roomLabel: 'HMSI Member Lounge',
    taskLabel: 'My member action list',
    opportunityLabel: 'Member pathways',
    accent: 'Member actions',
  },
};

function statusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

function formatDue(value: string | null) {
  if (!value) return 'No due date set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Due date unavailable' : `Due ${date.toLocaleString('en-NG')}`;
}

export default function PortalTasksContent({ expectedRole }: { expectedRole: Role }) {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/portal/tasks', { credentials: 'include', cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (!response.ok) throw new Error(data.error || 'Your tasks are temporarily unavailable.');
        if (data.identity?.role !== expectedRole) {
          router.replace('/portal');
          return;
        }
        if (active) {
          setPayload(data);
          setError('');
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Your tasks are temporarily unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const refreshTimer = window.setInterval(() => void load(), 300_000);
    const sessionTimer = window.setInterval(() => {
      void fetch('/api/portal/auth/refresh', { method: 'POST', credentials: 'include', cache: 'no-store' }).catch(() => undefined);
    }, 600_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.clearInterval(sessionTimer);
    };
  }, [expectedRole, router]);

  async function signOut() {
    await fetch('/api/portal/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    router.replace('/login');
  }

  async function updateTask(id: string, status: 'in_progress' | 'completed' | 'submitted') {
    setUpdatingId(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/portal/tasks', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, completion_note: notes[id] || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.task) throw new Error(data.error || 'This task could not be updated.');
      setPayload((current) => current ? {
        ...current,
        assignments: current.assignments.map((assignment) => assignment.id === id ? { ...assignment, ...data.task } : assignment),
      } : current);
      setNotice(status === 'completed' || status === 'submitted' ? 'Your work update was submitted successfully.' : 'Job accepted. You can now complete the required steps.');
      if (status === 'submitted') setNotes((current) => ({ ...current, [id]: '' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This task could not be updated.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] px-6 text-[#66716a]">Loading your HMSI workspace…</main>;
  if (error && !payload) return <main className="min-h-screen bg-[#f6f4ef] px-6 py-16"><div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-8 text-red-700"><h1 className="text-2xl font-black">Workspace unavailable</h1><p className="mt-3 text-sm leading-6">{error}</p><Link href="/login" className="mt-6 inline-block font-black text-[#1e5b49] underline">Return to sign in</Link></div></main>;

  const role = payload?.identity.role || expectedRole;
  const config = roleConfig[role];
  const assignments = payload?.assignments || [];
  const openCount = assignments.filter((assignment) => !['completed', 'submitted', 'cancelled'].includes(assignment.status)).length;

  return <main className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
    <header className="border-b border-[#d9d6ce] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">HMSI portal · {config.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Welcome, {payload?.identity.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">{config.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={config.roomLink} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white"><MessageCircle size={15} /> Room</Link>
          <Link href="/portal/submissions" className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><FileUp size={15} /> Submit proof</Link>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-red-700"><LogOut size={15} /> Sign out</button>
        </div>
      </div>
      <nav aria-label="Workspace menu" className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-5 pb-4 text-xs font-black uppercase tracking-widest text-[#66716a] sm:px-8">
        <a href="#jobs" className="whitespace-nowrap hover:text-[#1e5b49]">My jobs</a>
        <a href="#how-it-works" className="whitespace-nowrap hover:text-[#1e5b49]">How it works</a>
        <a href="#opportunities" className="whitespace-nowrap hover:text-[#1e5b49]">Opportunities</a>
        <Link href={config.roomLink} className="whitespace-nowrap hover:text-[#1e5b49]">{config.roomLabel}</Link>
      </nav>
    </header>

    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8">
      {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

      <section id="how-it-works" className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-3xl bg-[#17221e] p-7 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e1ad45]">Your next steps</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">A simpler way to accept, do, and report your work.</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[['01', 'Open the job', 'Read the full brief, outcome, priority, and due date before you begin.'], ['02', 'Accept and act', 'Use the action button to mark your job in progress and follow the instructions.'], ['03', 'Submit proof', 'Open Submit proof to share a private Drive link when evidence or a report is required.'], ['04', 'Close the loop', role === 'member' ? 'Add a completion note and submit it for administrator review.' : 'Mark the completed job after the required work and evidence are ready.']].map(([number, title, copy]) => <div key={number} className="border-t border-white/20 pt-3"><span className="text-xs font-black text-[#e1ad45]">{number}</span><p className="mt-1 font-black">{title}</p><p className="mt-1 text-xs leading-5 text-white/70">{copy}</p></div>)}
          </div>
        </div>
        <div className="rounded-3xl border border-[#d9d6ce] bg-white p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Workspace summary</p><h2 className="mt-2 text-2xl font-black">Ready when you are</h2></div><Sparkles className="text-[#b56b3b]" /></div>
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f6f4ef] p-4"><p className="text-2xl font-black text-[#1e5b49]">{openCount}</p><p className="mt-1 text-xs font-bold text-[#66716a]">Open jobs</p></div><div className="rounded-2xl bg-[#f6f4ef] p-4"><p className="text-2xl font-black text-[#1e5b49]">{assignments.length}</p><p className="mt-1 text-xs font-bold text-[#66716a]">Total jobs</p></div></div>
          <Link href={config.roomLink} className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Open {config.roomLabel} <ArrowRight size={14} /></Link>
        </div>
      </section>

      <section id="jobs" className="scroll-mt-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">{config.accent}</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{config.taskLabel}</h2><p className="mt-2 text-sm text-[#66716a]">Only work assigned to your approved role is shown here.</p></div><span className="inline-flex items-center gap-2 self-start rounded-full bg-[#e9f0e9] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><ClipboardList size={14} /> {openCount} open</span></div>
        {payload?.message && <div className="mt-5 rounded-2xl border border-[#e1ad45]/40 bg-[#fff8e8] p-5 text-sm leading-6 text-[#7a5b16]"><ShieldCheck className="mr-2 inline" size={16} />{payload.message}</div>}
        {assignments.length === 0 ? <div className="mt-5 rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-9 text-center"><ClipboardCheck className="mx-auto text-[#1e5b49]" size={30} /><h3 className="mt-4 text-xl font-black">No assigned jobs yet</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#66716a]">{role === 'volunteer' ? 'Use the opportunities menu and Volunteer Community Room while your administrator reviews or assigns approved work.' : 'Your administrator will notify you when a verified HMSI job is assigned.'}</p><Link href="#opportunities" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white">View opportunities <ArrowRight size={14} /></Link></div> : <div className="mt-5 space-y-4">{assignments.map((assignment) => {
          const expanded = expandedId === assignment.id;
          const closed = ['completed', 'submitted', 'cancelled'].includes(assignment.status);
          return <article key={assignment.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[#1e5b49]">{assignment.kind}</span>{assignment.priority && <span className="rounded-full bg-[#fff1dd] px-3 py-1 text-[#9a5318]">{assignment.priority}</span>}<span className={`rounded-full px-3 py-1 ${closed ? 'bg-emerald-50 text-emerald-800' : 'bg-[#f6f4ef] text-[#66716a]'}`}>{statusLabel(assignment.status)}</span></div><h3 className="mt-4 text-xl font-black sm:text-2xl">{assignment.title}</h3><p className={`mt-2 max-w-3xl text-sm leading-6 text-[#66716a] ${expanded ? '' : 'line-clamp-3'}`}>{assignment.description}</p>{assignment.due_at && <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#66716a]"><Clock3 size={14} /> {formatDue(assignment.due_at)}</p>}</div>
              <div className="flex shrink-0 items-center gap-3"><span className={`inline-flex items-center gap-2 text-xs font-black ${closed ? 'text-[#1e5b49]' : 'text-[#b56b3b]'}`}>{closed ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}{closed ? 'Ready for review' : 'Action needed'}</span><button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : assignment.id)} className="rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">{expanded ? 'Hide details' : 'View full job'}</button></div>
            </div>
            {expanded && <div className="mt-6 grid gap-4 border-t border-[#ece8df] pt-5 md:grid-cols-2"><div className="rounded-2xl bg-[#f6f4ef] p-5"><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Required outcome</p><p className="mt-2 text-sm leading-6 text-[#17221e]">Complete the actions in the job brief, keep any supporting record private, and report a clear result through the approved HMSI route.</p></div><div className="rounded-2xl bg-[#f6f4ef] p-5"><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Need to submit evidence?</p><p className="mt-2 text-sm leading-6 text-[#17221e]">Share a private Google Drive or Google Docs link with the named HMSI administrator. Keep the original file until ingestion is confirmed.</p><Link href="/portal/submissions" className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Open proof submission <ExternalLink size={14} /></Link></div></div>}
            {!closed && <div className="mt-5 flex flex-col gap-3 border-t border-[#ece8df] pt-5 sm:flex-row sm:flex-wrap sm:items-start">{assignment.status === 'assigned' && <button disabled={updatingId === assignment.id} onClick={() => void updateTask(assignment.id, 'in_progress')} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#17221e] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><PlayCircle size={15} /> Accept and start job</button>}{assignment.status === 'in_progress' && <>{role === 'member' ? <div className="min-w-0 flex-1"><label className="block text-xs font-black uppercase tracking-widest text-[#66716a]" htmlFor={`completion-${assignment.id}`}>Completion note</label><textarea id={`completion-${assignment.id}`} value={notes[assignment.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [assignment.id]: event.target.value }))} maxLength={4000} rows={3} className="mt-2 w-full rounded-2xl border border-[#d9d6ce] p-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" placeholder="Describe what you completed for administrator review." /><button disabled={updatingId === assignment.id || !(notes[assignment.id] || '').trim()} onClick={() => void updateTask(assignment.id, 'submitted')} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><Send size={15} /> Submit completion</button></div> : <><Link href="/portal/submissions" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1e5b49] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><FileUp size={15} /> Submit proof link</Link><button disabled={updatingId === assignment.id} onClick={() => void updateTask(assignment.id, 'completed')} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={15} /> Mark job complete</button></>}</>}</div>}
            {closed && <p className="mt-5 border-t border-[#ece8df] pt-4 text-sm font-black text-[#1e5b49]"><CheckCircle2 className="mr-2 inline" size={16} />This job has been submitted and is awaiting the appropriate HMSI review.</p>}
          </article>;
        })}</div>}
      </section>

      <section id="opportunities" className="scroll-mt-8">
        {role === 'worker' || role === 'volunteer' ? <WorkspaceOpportunities viewerRole={role} /> : <div className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">{config.opportunityLabel}</p><h2 className="mt-2 text-2xl font-black">Explore approved HMSI pathways</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">Browse current opportunities, review eligibility, and express interest where a member pathway is available. Administrator review remains required.</p></div><Link href="/opportunities" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Browse opportunities <ArrowRight size={14} /></Link></div></div>}
      </section>
    </div>
  </main>;
}
