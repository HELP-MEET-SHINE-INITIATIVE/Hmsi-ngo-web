'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';

type Task = { id: string; title: string; description: string; sortOrder: number; status: 'pending' | 'completed'; completedAt: string | null };
type Invitation = { email: string; role: 'worker' | 'volunteer'; expiresAt: string; acceptedAt: string | null };

export default function OnboardingContent({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [hmsiId, setHmsiId] = useState('');
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/onboarding?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'This onboarding invitation is unavailable.');
      setInvitation(payload.invitation);
      setTasks(payload.tasks || []);
      setHmsiId(payload.hmsiId || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'This onboarding invitation is unavailable.');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) void load(); else { setError('An onboarding invitation token is required.'); setLoading(false); } }, [token, load]);

  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const isComplete = useMemo(() => tasks.length > 0 && completedCount === tasks.length, [completedCount, tasks.length]);

  const updateTask = async (task: Task) => {
    setBusyTask(task.id);
    setError('');
    try {
      const response = await fetch(`/api/onboarding?token=${encodeURIComponent(token)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: task.id, status: task.status === 'completed' ? 'pending' : 'completed' }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The task could not be updated.');
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: task.status === 'completed' ? 'pending' : 'completed', completedAt: task.status === 'completed' ? null : new Date().toISOString() } : item));
      if (payload.hmsiId) setHmsiId(payload.hmsiId);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'The task could not be updated.');
    } finally { setBusyTask(null); }
  };

  const createPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 10 || password !== confirmPassword) { setError('Use matching passwords of at least 10 characters.'); return; }
    setPasswordBusy(true);
    try {
      const response = await fetch('/api/onboarding/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ token, password, confirmPassword }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Your password could not be created.');
      setHmsiId(payload.hmsiId || '');
      router.replace(payload.redirectTo || '/portal/my-tasks');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your password could not be created.'); }
    finally { setPasswordBusy(false); }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] text-[#66716a]">Loading your HMSI onboarding…</main>;
  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-12 text-[#17221e] sm:px-8 sm:py-20"><div className="mx-auto max-w-3xl"><Link href="/" className="text-sm font-black text-[#1e5b49] hover:underline">← HMSI home</Link><div className="mt-10 rounded-[32px] bg-[#17221e] p-8 text-white shadow-[0_24px_70px_rgba(23,34,30,0.12)] sm:p-12"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#e1ad45]"><ShieldCheck size={16} /> Approved onboarding</p><h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Welcome to HMSI.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/70">Complete these short tasks so you can participate confidently in the {invitation?.role || 'HMSI'} workspace. This invitation is linked to {invitation?.email || 'your approved application'} and expires on {invitation ? new Date(invitation.expiresAt).toLocaleDateString('en-NG') : 'the stated date'}.</p><div className="mt-8"><div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-white/60"><span>{completedCount} of {tasks.length} complete</span><span>{progress}%</span></div><div className="mt-3 h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-[#e1ad45] transition-all" style={{ width: `${progress}%` }} /></div></div></div>{error && <div role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}{isComplete && <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0" size={20} /><div><p><strong>100% onboarding complete.</strong> Create a password to issue your HMSI ID and enter your secure portal.</p>{hmsiId && <p className="mt-2 font-black">HMSI ID: {hmsiId}</p>}</div></div><form onSubmit={createPassword} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black uppercase tracking-widest text-[#17221e]">Password<input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#17221e]" /></label><label className="text-xs font-black uppercase tracking-widest text-[#17221e]">Confirm password<input required minLength={10} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#17221e]" /></label><button disabled={passwordBusy} className="sm:col-span-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{passwordBusy ? 'Creating secure access…' : 'Create password & access portal'}</button></form></section>}<section className="mt-8 space-y-4">{tasks.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((task, index) => <article key={task.id} className={`rounded-3xl border bg-white p-6 shadow-sm ${task.status === 'completed' ? 'border-emerald-200' : 'border-[#d9d6ce]'}`}><div className="flex items-start gap-4"><div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${task.status === 'completed' ? 'bg-[#e9f0e9] text-[#1e5b49]' : 'bg-[#f6f4ef] text-[#b56b3b]'}`}>{task.status === 'completed' ? <CheckCircle2 size={18} /> : <span className="text-sm font-black">{index + 1}</span>}</div><div className="min-w-0 flex-1"><h2 className="text-lg font-black">{task.title}</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">{task.description}</p>{task.status === 'completed' && task.completedAt && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[#1e5b49]"><Clock3 size={14} /> Completed {new Date(task.completedAt).toLocaleString('en-NG')}</p>}</div><button type="button" onClick={() => updateTask(task)} disabled={busyTask === task.id || isComplete} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${task.status === 'completed' ? 'border border-[#d9d6ce] text-[#66716a]' : 'bg-[#1e5b49] text-white'} disabled:opacity-50`}>{busyTask === task.id ? 'Saving…' : task.status === 'completed' ? 'Completed' : 'Mark complete'}</button></div></article>)}</section><div className="mt-8 flex flex-wrap gap-3"><Link href="/safeguarding" className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Safeguarding <ArrowRight size={15} /></Link><Link href="/privacy" className="inline-flex items-center gap-2 rounded-full border border-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Privacy <ArrowRight size={15} /></Link></div></div></main>;
}
