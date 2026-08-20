'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Newspaper, Send, XCircle } from 'lucide-react';
import OptionalImageUpload from './OptionalImageUpload';

type NewsViewer = { email: string; name: string; role: 'admin' | 'worker' | 'volunteer' };
type NewsArticle = { id: string; headline: string; summary: string; body: string; category: string; image_url: string | null; author_name: string; author_role: string; status: string; rejection_reason: string | null; created_at: string; published_at: string | null };

const emptyForm = { headline: '', summary: '', body: '', category: 'HMSI news', image_url: '' };

export default function NewsroomStudio({ viewer }: { viewer: NewsViewer }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const loadArticles = useCallback(async () => {
    const response = await fetch(`/api/news?email=${encodeURIComponent(viewer.email)}&role=${viewer.role}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load newsroom.');
    setArticles(result.articles || []);
  }, [viewer.email, viewer.role]);

  useEffect(() => { loadArticles().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load newsroom.')); }, [loadArticles]);

  const submitArticle = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to submit news.');
      setForm(emptyForm);
      await loadArticles();
      setNotice(result.message || 'News submitted.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit news.');
    } finally {
      setIsBusy(false);
    }
  };

  const reviewArticle = async (id: string, action: 'approve' | 'reject' | 'publish') => {
    if (action === 'reject' && reason.trim().length < 3) { setError('Add a short revision reason before rejecting this news.'); return; }
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/news', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, reason: reason.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update news.');
      setReviewingId(null);
      setReason('');
      await loadArticles();
      setNotice(result.message || 'News updated.');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to update news.');
    } finally {
      setIsBusy(false);
    }
  };

  const statusLabel: Record<string, string> = { pending_admin_approval: 'Waiting for admin approval', approved: 'Approved — ready to publish', rejected: 'Needs revision', published: 'Published', draft: 'Draft' };

  return <div className="space-y-6"><div><h2 className="inline-flex items-center gap-2 text-2xl font-black"><Newspaper size={24} className="text-[#b56b3b]" /> Newsroom</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">{viewer.role === 'admin' ? 'Post official HMSI news directly or approve team submissions before publication.' : 'Submit verified news from the field. An administrator must approve it before it becomes public.'}</p></div>{(error || notice) && <div className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`} role="status">{error || notice}</div>}<form onSubmit={submitArticle} className="grid gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 md:grid-cols-2"><input required minLength={8} placeholder="News headline" value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><input required minLength={20} placeholder="Short headline summary for the homepage flash" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><textarea required minLength={50} rows={7} placeholder="Write the full news article" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><input placeholder="Category, e.g. Field update" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><div className="md:col-span-2"><OptionalImageUpload viewer={{ email: viewer.email, role: viewer.role }} value={form.image_url} onChange={(imageUrl) => setForm({ ...form, image_url: imageUrl })} /></div><button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 md:col-span-2"><Send size={15} />{viewer.role === 'admin' ? 'Publish news' : 'Submit news for approval'}</button></form><div className="space-y-4"><h3 className="text-xl font-black">{viewer.role === 'admin' ? 'News review queue' : 'Your news submissions'}</h3>{articles.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">No news articles yet.</div> : articles.map((article) => <article key={article.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex flex-col justify-between gap-4 md:flex-row"><div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{statusLabel[article.status] || article.status}</span><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">{article.author_role}</span></div><h4 className="text-xl font-black">{article.headline}</h4><p className="mt-2 text-sm leading-6 text-[#66716a]">{article.summary}</p><p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#b56b3b]">By {article.author_name} · {new Date(article.created_at).toLocaleString()}</p>{article.rejection_reason && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">Revision note: {article.rejection_reason}</p>}</div>{viewer.role === 'admin' && article.status !== 'published' && <div className="flex shrink-0 flex-wrap items-start gap-2"><button disabled={isBusy} onClick={() => reviewArticle(article.id, article.status === 'approved' ? 'publish' : 'approve')} className="inline-flex items-center gap-1 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={14} />{article.status === 'approved' ? 'Publish' : 'Approve'}</button><button disabled={isBusy} onClick={() => { setReviewingId(article.id); setReason(''); }} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={14} />Reject</button></div>}</div>{viewer.role === 'admin' && reviewingId === article.id && <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4"><label htmlFor={`news-reason-${article.id}`} className="text-xs font-black uppercase tracking-widest text-red-700">Why should this news be revised?</label><textarea id={`news-reason-${article.id}`} required minLength={3} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-3 w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400" /><div className="mt-3 flex gap-2"><button type="button" disabled={isBusy} onClick={() => reviewArticle(article.id, 'reject')} className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">Confirm rejection</button><button type="button" onClick={() => setReviewingId(null)} className="rounded-full border border-[#d9d6ce] bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a]">Cancel</button></div></div>}</article>)}</div></div>;
}
