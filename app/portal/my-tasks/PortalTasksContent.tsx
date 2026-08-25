'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, Clock3, LogOut } from 'lucide-react';

type Assignment = { id: string; title: string; description: string; kind: string; status: string; due_at: string | null; created_at: string; updated_at: string };
type Payload = { identity: { name: string; role: string }; assignments: Assignment[]; message: string | null };

export default function PortalTasksContent() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/tasks', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(response.status === 401 ? 'sign-in-required' : data.error || 'Your tasks are temporarily unavailable.');
        setPayload(data);
      })
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : 'Your tasks are temporarily unavailable.';
        if (message === 'sign-in-required') router.replace('/login'); else setError(message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function signOut() {
    await fetch('/api/portal/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    router.replace('/login');
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] text-[#66716a]">Loading your HMSI task portal…</main>;
  if (error) return <main className="min-h-screen bg-[#f6f4ef] px-6 py-16"><div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-8 text-red-700"><h1 className="text-2xl font-black">Task portal unavailable</h1><p className="mt-3 text-sm leading-6">{error}</p><Link href="/login" className="mt-6 inline-block font-black text-[#1e5b49] underline">Return to sign in</Link></div></main>;
  const assignments = payload?.assignments || [];
  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-10 text-[#17221e] sm:px-8"><div className="mx-auto max-w-5xl"><header className="flex flex-col justify-between gap-4 border-b border-[#d9d6ce] pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">HMSI portal</p><h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">My tasks</h1><p className="mt-3 text-sm text-[#66716a]">Welcome, {payload?.identity.name}. Review only work assigned to your approved role.</p></div><button onClick={signOut} className="inline-flex items-center gap-2 self-start rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a]"><LogOut size={15} /> Sign out</button></header>{payload?.message && <div className="mt-7 rounded-2xl border border-[#d9d6ce] bg-white p-5 text-sm leading-6 text-[#66716a]">{payload.message}</div>}<section className="mt-8 space-y-4">{assignments.length === 0 ? <div className="rounded-3xl border border-[#d9d6ce] bg-white p-8 text-center"><ClipboardList className="mx-auto text-[#1e5b49]" size={28} /><h2 className="mt-4 text-xl font-black">No assigned tasks yet</h2><p className="mt-2 text-sm text-[#66716a]">Your administrator will notify you when a verified HMSI task is assigned.</p></div> : assignments.map((assignment) => <article key={assignment.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[#1e5b49]">{assignment.kind}</span><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[#66716a]">{assignment.status.replace('_', ' ')}</span></div><h2 className="mt-4 text-xl font-black">{assignment.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#66716a]">{assignment.description}</p></div>{assignment.status === 'completed' ? <CheckCircle2 className="text-[#1e5b49]" /> : <Clock3 className="text-[#b56b3b]" />}</div>{assignment.due_at && <p className="mt-5 text-xs font-bold text-[#66716a]">Due {new Date(assignment.due_at).toLocaleString('en-NG')}</p>}</article>)}</section></div></main>;
}
