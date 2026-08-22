'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type EnrollmentState = { member?: { name: string }; request?: { status: string; created_at: string } | null; enrollment?: { status: string; enrolled_at: string } | null };

export default function SchoolEnrollPage() {
  const [state, setState] = useState<EnrollmentState | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const response = await fetch('/api/member/school/enrollment-request', { cache: 'no-store' });
    const result = await response.json();
    if (response.status === 401) { setError(result.error || 'Activate your approved member ID first.'); setLoaded(true); return; }
    if (!response.ok) throw new Error(result.error || 'School enrollment is unavailable.');
    setState(result); setLoaded(true);
  };
  useEffect(() => { load().catch((cause) => { setError(cause instanceof Error ? cause.message : 'School enrollment is unavailable.'); setLoaded(true); }); }, []);

  const requestEnrollment = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/member/school/enrollment-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The enrollment request could not be submitted.');
      setMessage(result.message || 'Enrollment request submitted for review.'); setReason(''); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The enrollment request could not be submitted.'); }
    finally { setBusy(false); }
  };

  const enrolled = Boolean(state?.enrollment);
  const pending = state?.request?.status === 'pending';

  return <main className="min-h-screen bg-[#f6f4ef] px-5 py-10 text-[#17221e] sm:px-8"><div className="mx-auto max-w-3xl"><Link href="/school" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><ArrowLeft size={15} /> Back to HMSI School</Link><section className="mt-6 rounded-3xl bg-[#17221e] p-7 text-white sm:p-10"><div className="flex items-start gap-4"><div className="rounded-2xl bg-[#e1ad45] p-3 text-[#17221e]"><BookOpen size={24} /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1ad45]">HMSI School enrolment</p><h1 className="mt-2 text-3xl font-black">Request your place in the learning pathway</h1><p className="mt-3 text-sm leading-7 text-white/75">This enrolment request is available to active approved HMSI members. An administrator reviews the request before school access is activated.</p></div></div></section>{(error || message) && <div className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`} role="status">{error || message}</div>}{loaded && state?.member && <section className="mt-6 rounded-3xl border border-[#d9d6ce] bg-white p-7"><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Welcome, {state.member.name}</p>{enrolled ? <div className="mt-4 flex items-start gap-3"><CheckCircle2 className="mt-1 shrink-0 text-[#1e5b49]" /><div><h2 className="text-xl font-black">You are enrolled</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">Your HMSI School enrolment is marked <strong>{state.enrollment?.status}</strong>. Continue learning from the school catalogue. Completion evidence and any certificate request remain separate administrator-reviewed steps.</p><Link href="/school" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Open school modules <ArrowRight size={15} /></Link></div></div> : pending ? <div className="mt-4 flex items-start gap-3"><ShieldCheck className="mt-1 shrink-0 text-[#b56b3b]" /><div><h2 className="text-xl font-black">Request awaiting review</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">An HMSI administrator must approve your enrolment before it becomes active. You do not need to submit another request.</p></div></div> : <form onSubmit={requestEnrollment} className="mt-5 space-y-4"><label className="block"><span className="text-xs font-black uppercase tracking-widest text-[#66716a]">Why do you want to take the HMSI School pathway? (optional)</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={4} placeholder="For example: I want to strengthen my safeguarding and humanitarian-service practice." className="mt-2 w-full resize-none rounded-2xl bg-[#f6f4ef] p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#1e5b49]" /></label><button disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? 'Submitting…' : 'Request school enrolment'} <ArrowRight size={15} /></button></form>}</section>}{loaded && !state?.member && <section className="mt-6 rounded-3xl border border-[#d9d6ce] bg-white p-7"><h2 className="text-xl font-black">Approved member access required</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">Apply for general HMSI membership first, then activate your approved member ID to request school enrolment.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/member-login" className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Activate member ID <ArrowRight size={15} /></Link><Link href="/member-apply" className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#17221e]">Apply for membership</Link></div></section>}<p className="mt-6 text-xs leading-5 text-[#66716a]">HMSI School certificates record successful completion of the HMSI learning pathway only. They are not government identity documents, university awards, professional licences, legal-practice certificates, or proof of external accreditation.</p></div></main>;
}
