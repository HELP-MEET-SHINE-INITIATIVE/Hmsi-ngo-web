'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Mail, RefreshCw, Send, XCircle } from 'lucide-react';

type Viewer = { email: string; name: string; role: 'admin' | 'worker' | 'volunteer' };

type NewsletterDraft = {
  id: string;
  title: string;
  subject: string;
  body: string;
  author_name: string;
  author_email: string;
  author_role: Viewer['role'];
  status: string;
  worker_approved_by?: string | null;
  admin_approved_by?: string | null;
  rejection_reason?: string | null;
  sent_at?: string | null;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  pending_worker_approval: 'Waiting for worker approval',
  pending_admin_approval: 'Waiting for admin approval',
  approved: 'Approved and ready to send',
  rejected: 'Needs revision',
  sent: 'Sent to subscribers',
  draft: 'Draft awaiting review',
};

export default function NewsletterStudio({ viewer, compact = false }: { viewer: Viewer; compact?: boolean }) {
  const [drafts, setDrafts] = useState<NewsletterDraft[]>([]);
  const [form, setForm] = useState({ title: '', subject: '', body: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revisionDraftId, setRevisionDraftId] = useState<string | null>(null);
  const [revisionReason, setRevisionReason] = useState('');

  const loadDrafts = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`/api/newsletter?email=${encodeURIComponent(viewer.email)}&role=${viewer.role}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Newsletters are temporarily unavailable.');
      setDrafts(result.drafts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Newsletters are temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [viewer.email, viewer.role]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const submitAction = async (action: string, newsletterId?: string, reason?: string) => {
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, newsletter_id: newsletterId, reason, email: viewer.email, role: viewer.role }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Newsletter action failed.');
      setNotice(action === 'send' ? `Newsletter sent to ${result.sentCount} active subscriber${result.sentCount === 1 ? '' : 's'}.` : 'Newsletter updated successfully.');
      if (action === 'reject') {
        setRevisionDraftId(null);
        setRevisionReason('');
      }
      await loadDrafts();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Newsletter action failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const submitRevision = async (newsletterId: string) => {
    const reason = revisionReason.trim();
    if (!reason) {
      setError('Please explain what should be revised before submitting.');
      return;
    }
    await submitAction('reject', newsletterId, reason);
  };

  const openRevisionForm = (newsletterId: string) => {
    setError('');
    setRevisionDraftId(newsletterId);
    setRevisionReason('');
  };

  const createDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...form, email: viewer.email, role: viewer.role }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The newsletter could not be saved.');
      setForm({ title: '', subject: '', body: '' });
      setNotice(viewer.role === 'volunteer' ? 'Draft submitted for worker approval.' : viewer.role === 'worker' ? 'Draft submitted for admin approval.' : 'Draft approved. It is ready to send.');
      await loadDrafts();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'The newsletter could not be saved.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className={compact ? 'space-y-5' : 'space-y-7'}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]"><Mail size={16} /> Newsletter studio</p><h2 className="mt-2 text-2xl font-black tracking-tight">Create and approve updates</h2><p className="mt-2 text-sm text-[#66716a]">{viewer.role === 'admin' ? 'Review team drafts, approve campaigns, and send them to active subscribers.' : viewer.role === 'worker' ? 'Draft updates and approve volunteer newsletters before they reach an administrator.' : 'Draft field updates for worker and administrator review.'}</p></div><button onClick={loadDrafts} className="flex items-center gap-2 rounded-full border border-[#d9d6ce] bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a] hover:border-[#1e5b49] hover:text-[#1e5b49]"><RefreshCw size={14} /> Refresh</button></div>
      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700" role="status">{notice}</div>}

      <form onSubmit={createDraft} className="grid gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="md:col-span-2"><h3 className="text-lg font-black">Write a newsletter</h3><p className="mt-1 text-sm text-[#66716a]">Every newsletter passes through the appropriate approval step before delivery.</p></div><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Newsletter title" className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Email subject" className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><textarea required rows={6} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Write the field update, success story, or call to action…" className="resize-y rounded-2xl bg-[#f6f4ef] p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><button disabled={isBusy} className="flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 md:col-span-2"><Send size={14} />{isBusy ? 'Saving…' : 'Submit newsletter draft'}</button></form>

      <div className="space-y-4"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">Newsletter drafts</h3><span className="text-xs font-bold text-[#66716a]">{drafts.length} visible</span></div>{isLoading ? <div className="rounded-3xl border border-[#d9d6ce] bg-white p-8 text-center text-sm text-[#66716a]">Loading newsletter drafts…</div> : drafts.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-8 text-center text-sm italic text-[#66716a]">No newsletter drafts yet.</div> : drafts.map((draft) => <article key={draft.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{statusLabel[draft.status] || draft.status}</span><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">{draft.author_role}</span></div><h4 className="mt-3 text-xl font-black">{draft.title}</h4><p className="mt-1 text-sm font-bold text-[#66716a]">{draft.subject}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#17221e]">{draft.body}</p><p className="mt-4 text-xs text-[#66716a]">By {draft.author_name} · {new Date(draft.created_at).toLocaleString()}</p>{draft.rejection_reason && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">Revision note: {draft.rejection_reason}</p>}</div>{revisionDraftId === draft.id && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4"><p className="text-xs font-black uppercase tracking-widest text-red-700">Revision request</p><textarea autoFocus required rows={3} value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} placeholder="Explain what should be changed before approval or sending…" className="mt-3 w-full resize-y rounded-xl border border-red-200 bg-white p-3 text-sm text-[#17221e] outline-none focus:ring-2 focus:ring-red-300" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isBusy || !revisionReason.trim()} onClick={() => submitRevision(draft.id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50">Submit revision request</button><button type="button" disabled={isBusy} onClick={() => { setRevisionDraftId(null); setRevisionReason(''); }} className="rounded-full border border-[#d9d6ce] bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a]">Cancel</button></div></div>}<div className="flex shrink-0 flex-wrap items-start gap-2 md:max-w-[230px] md:justify-end">{viewer.role === 'worker' && draft.status === 'pending_worker_approval' && <><button disabled={isBusy} onClick={() => submitAction('approve_worker', draft.id)} className="rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={14} className="mr-1 inline" />Approve for admin</button><button disabled={isBusy} onClick={() => openRevisionForm(draft.id)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={14} className="mr-1 inline" />Reject</button></>}{viewer.role === 'admin' && ['draft', 'pending_worker_approval', 'pending_admin_approval', 'rejected'].includes(draft.status) && <><button disabled={isBusy} onClick={() => submitAction('approve_admin', draft.id)} className="rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={14} className="mr-1 inline" />Approve newsletter</button><button disabled={isBusy} onClick={() => openRevisionForm(draft.id)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={14} className="mr-1 inline" />Reject</button></>}{viewer.role === 'admin' && draft.status === 'approved' && <><button disabled={isBusy} onClick={() => submitAction('send', draft.id)} className="rounded-full bg-[#e1ad45] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#17221e] disabled:opacity-50"><Send size={14} className="mr-1 inline" />Send now</button><button disabled={isBusy} onClick={() => openRevisionForm(draft.id)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={14} className="mr-1 inline" />Request revision</button></>}</div></div></article>)}</div>
    </section>
  );
}
