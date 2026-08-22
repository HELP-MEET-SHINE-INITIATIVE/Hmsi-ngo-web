'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type EnrollmentRequest = { id: string; member_name: string; member_email: string; status: string; reason?: string | null; created_at: string };

export default function MemberSchoolRequestsPanel() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/school/enrollment-requests', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Enrollment requests are unavailable.');
    setRequests(result.requests || []);
  }, []);
  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Enrollment requests are unavailable.')); }, [load]);

  const review = async (request: EnrollmentRequest, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? window.prompt('Reason for rejecting this school enrollment request?')?.trim() || '' : '';
    if (action === 'reject' && !reason) return;
    setBusy(request.id); setError('');
    try {
      const response = await fetch('/api/admin/school/enrollment-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: request.id, action, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The request could not be reviewed.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The request could not be reviewed.'); }
    finally { setBusy(null); }
  };

  return <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Member school requests</p><h3 className="mt-2 text-xl font-black">Review enrolment signups</h3><p className="mt-2 text-sm leading-6 text-[#66716a]">Approve only active members after reviewing the request. Approval creates the school enrolment record; it does not issue a certificate.</p></div>{error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{requests.length === 0 ? <p className="mt-5 text-sm text-[#66716a]">No school enrolment requests yet.</p> : <div className="mt-5 space-y-3">{requests.map((request) => <article key={request.id} className="rounded-2xl bg-[#f6f4ef] p-4"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">{request.status}</span><span className="text-xs font-bold text-[#b56b3b]">{new Date(request.created_at).toLocaleString()}</span></div><h4 className="mt-2 font-black">{request.member_name}</h4><p className="mt-1 text-xs text-[#66716a]">{request.member_email}</p>{request.reason && <p className="mt-2 text-sm leading-6 text-[#17221e]">{request.reason}</p>}</div>{request.status === 'pending' && <div className="flex shrink-0 gap-2"><button disabled={busy === request.id} onClick={() => review(request, 'approve')} className="inline-flex items-center gap-1 rounded-full bg-[#1e5b49] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={14} /> Approve and enrol</button><button disabled={busy === request.id} onClick={() => review(request, 'reject')} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={14} /> Reject</button></div>}</div></article>)}</div>}</section>;
}
