'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, FileUp, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';

type Submission = { id: string; personal_drive_url: string | null; status: 'pending_download' | 'ingested' | 'access_error' | 'link_cleared'; access_request_note: string | null; archive_bucket: string | null; archive_object_key: string | null; ingested_at: string | null; cleared_at: string | null; created_at: string };
type Payload = { submissions: Submission[]; namedAdminEmail: string | null; viewer: { name: string; email: string; role: string } };

function label(status: Submission['status']) {
  return status === 'pending_download' ? 'Pending Review · Keep file on Drive' : status === 'ingested' ? 'Files Ingested / Downloaded · Safe to delete' : status === 'access_error' ? 'Access Needed' : 'Link Cleared';
}
function tone(status: Submission['status']) {
  return status === 'ingested' ? 'bg-emerald-50 text-emerald-800' : status === 'access_error' ? 'bg-amber-50 text-amber-900' : status === 'link_cleared' ? 'bg-slate-100 text-slate-700' : 'bg-sky-50 text-sky-800';
}

export default function DriveSubmissionPortal() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const response = await fetch('/api/portal/submissions', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load file submissions.');
    setPayload(result);
  };
  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load file submissions.')); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/portal/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personalDriveUrl: url }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to submit the Drive link.');
      setUrl(''); setNotice(result.message || 'Drive link submitted.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to submit the Drive link.'); } finally { setBusy(false); }
  };
  const clearLink = async (id: string) => {
    if (!window.confirm('Clear this external Drive link from HMSI after confirmed archive ingestion? The archive audit record will remain.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/portal/submissions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to clear the Drive link.');
      setNotice(result.message); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to clear the Drive link.'); } finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#f6f4ef] px-5 py-10 text-[#17221e] sm:px-8"><div className="mx-auto max-w-4xl space-y-6"><Link href="/dashboard" className="text-xs font-black uppercase tracking-widest text-[#1e5b49]">← Back to HMSI workspace</Link><header className="rounded-[32px] bg-[#17221e] p-7 text-white"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e1ad45]">Private submission route</p><h1 className="mt-3 text-3xl font-black tracking-tight">Personal Google Drive submissions</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Submit a personal Google Drive link for an authorised HMSI intake review. HMSI does not receive access to your Google account; you remain in control of the original file.</p></header>{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}{notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}<section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex gap-3"><ShieldCheck className="mt-1 shrink-0 text-[#1e5b49]" /><div><h2 className="font-black">Share safely before submitting</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">In Google Drive, share the selected file as <strong>Viewer</strong> with the named HMSI administrative account: <strong>{payload?.namedAdminEmail || 'HMSI administrative account (configuration pending)'}</strong>. Do not use public “Anyone with the link” access for confidential files.</p><p className="mt-2 text-sm leading-6 text-[#66716a]">Keep the original file in your Drive while status is <strong>Pending Review</strong>. Only after HMSI confirms secure AWS archive ingestion will the portal show <strong>Files Ingested / Downloaded</strong>.</p></div></div></section><form onSubmit={submit} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Personal Google Drive link<input required type="url" placeholder="https://drive.google.com/..." value={url} onChange={(event) => setUrl(event.target.value)} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm normal-case tracking-normal outline-none ring-[#1e5b49] focus:ring-2" /></label><button disabled={busy || !payload?.namedAdminEmail} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />} Submit private Drive link</button></form><section className="space-y-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">My submissions</p><h2 className="mt-2 text-xl font-black">File intake status</h2></div>{!payload ? <div className="rounded-3xl border border-[#d9d6ce] bg-white p-8 text-sm text-[#66716a]">Loading secure submissions…</div> : payload.submissions.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-8 text-sm text-[#66716a]">No Drive links submitted yet.</div> : payload.submissions.map((submission) => <article key={submission.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${tone(submission.status)}`}>{label(submission.status)}</span><p className="mt-3 text-sm text-[#66716a]">Submitted {new Date(submission.created_at).toLocaleString('en-NG')}</p>{submission.access_request_note && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"><KeyRound size={15} className="mr-2 inline" />{submission.access_request_note}</p>}{submission.status === 'ingested' && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="mr-2 inline" />HMSI confirmed secure archive ingestion on {submission.ingested_at ? new Date(submission.ingested_at).toLocaleString('en-NG') : 'the recorded date'}. You may keep or delete the original personal Drive file.</p>}</div><div className="flex shrink-0 flex-wrap items-start gap-2">{submission.personal_drive_url && <a href={submission.personal_drive_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><ExternalLink size={14} /> Open my link</a>}{submission.status === 'ingested' && <button disabled={busy} onClick={() => void clearLink(submission.id)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700 disabled:opacity-50"><Trash2 size={14} /> Clear link</button>}</div></div></article>)}</section></div></main>;
}

