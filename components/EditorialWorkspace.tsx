'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, ArrowLeft, CheckCircle2, ClipboardCheck, Edit3, FileText, Image as ImageIcon, Loader2, Menu, Send, X, XCircle } from 'lucide-react';

type View = 'editorial' | 'articles';
type Filter = 'pending' | 'published' | 'drafts' | 'archived';
type ArticleStatus = 'draft' | 'pending_admin_approval' | 'approved' | 'rejected' | 'published' | 'archived';
type Article = {
  id: string; headline: string; summary: string; body: string; category: string; image_url: string | null;
  author_name: string; author_email: string; author_role: string; status: ArticleStatus; rejection_reason: string | null;
  approved_by: string | null; approved_at: string | null; published_at: string | null; created_at: string; updated_at: string;
  reviewed_by: string | null; reviewed_at: string | null; scheduled_archive_at: string | null; archived_at: string | null; archive_reason: string | null;
  verification_status: string | null; verification_notes: string | null; source_name: string | null; source_url: string | null;
};

const sections: Array<{ id: Filter; label: string }> = [
  { id: 'pending', label: 'Pending review' },
  { id: 'published', label: 'Published' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'archived', label: 'Archived' },
];

function date(value: string | null) { return value ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'; }
function shortAuthor(article: Article) { return article.author_name.toLowerCase().includes('hmsi assistant') ? 'HMSI Assistant' : article.author_name; }
function statusLabel(status: ArticleStatus) { return status === 'pending_admin_approval' ? 'Pending editorial review' : status.replaceAll('_', ' '); }

export default function EditorialWorkspace({ view, reviewerEmail }: { view: View; reviewerEmail: string }) {
  const [filter, setFilter] = useState<Filter>(view === 'editorial' ? 'pending' : 'published');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [editing, setEditing] = useState<Article | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = async (requestedFilter = filter) => {
    setError('');
    const response = await fetch(`/api/admin/articles?filter=${requestedFilter}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load editorial articles.');
    setArticles(result.articles || []);
  };

  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load editorial articles.')); }, [filter]);

  const summary = useMemo(() => ({
    visible: articles.length,
    assistant: articles.filter((article) => shortAuthor(article) === 'HMSI Assistant').length,
    images: articles.filter((article) => article.image_url).length,
  }), [articles]);

  const changeFilter = (next: Filter) => { setFilter(next); setSelected(null); setEditing(null); setNotice(''); };

  const applyAction = async (article: Article, action: 'approve_publish' | 'save_draft' | 'reject' | 'archive' | 'edit', overrides: Partial<Article> = {}, reason = '') => {
    const optimistic: Article = {
      ...article,
      ...overrides,
      status: action === 'approve_publish' ? 'published' : action === 'save_draft' || action === 'edit' ? 'draft' : action === 'reject' ? 'rejected' : 'archived',
      reviewed_by: reviewerEmail,
      reviewed_at: new Date().toISOString(),
      published_at: action === 'approve_publish' ? new Date().toISOString() : article.published_at,
      rejection_reason: action === 'reject' ? reason : action === 'save_draft' || action === 'edit' ? null : article.rejection_reason,
    };
    const before = articles;
    setArticles((current) => current.map((item) => item.id === article.id ? optimistic : item));
    setSelected(optimistic);
    setEditing(optimistic);
    setBusyId(article.id);
    setError('');
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, headline: optimistic.headline, summary: optimistic.summary, body: optimistic.body, category: optimistic.category }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save the editorial update.');
      setArticles((current) => current.map((item) => item.id === article.id ? result.article : item));
      setSelected(result.article);
      setEditing(result.article);
      setNotice(result.message || 'Editorial update saved.');
    } catch (cause) {
      setArticles(before);
      setSelected(article);
      setEditing(article);
      setError(cause instanceof Error ? cause.message : 'Unable to save the editorial update.');
    } finally { setBusyId(null); }
  };

  const reject = (article: Article) => {
    const reason = window.prompt('Provide a short editorial reason for rejection:');
    if (reason && reason.trim().length >= 3) applyAction(article, 'reject', {}, reason.trim());
  };

  return <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
    <header className="border-b border-[#d9d6ce] bg-white"><div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Private HMSI editorial workspace</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">{view === 'editorial' ? 'Editorial Queue' : 'Content Management'}</h1></div><div className="flex flex-wrap gap-2"><Link href="/hmsi-control" className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><ArrowLeft size={15} /> Admin control</Link><Link href={view === 'editorial' ? '/admin/articles' : '/admin/editorial'} className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-4 py-2 text-xs font-black uppercase tracking-widest text-white">{view === 'editorial' ? <FileText size={15} /> : <ClipboardCheck size={15} />}{view === 'editorial' ? 'Content management' : 'Editorial queue'}</Link></div></div></header>
    <main className="mx-auto grid max-w-[1440px] gap-8 px-6 py-8 lg:grid-cols-[240px_1fr]">
      <aside><nav className="sticky top-6 space-y-2 rounded-3xl border border-[#d9d6ce] bg-white p-3"><p className="px-3 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#b56b3b]">Editorial views</p>{sections.map((section) => <button key={section.id} type="button" onClick={() => changeFilter(section.id)} className={`w-full rounded-2xl px-4 py-3 text-left text-xs font-black uppercase tracking-widest ${filter === section.id ? 'bg-[#1e5b49] text-white' : 'text-[#66716a] hover:bg-[#f6f4ef]'}`}>{section.label}</button>)}<div className="mt-4 border-t border-[#f6f4ef] pt-4"><Link href="/admin/editorial" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Editorial Queue</Link><Link href="/admin/articles" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Content Management</Link></div></nav></aside>
      <section className="min-w-0 space-y-6">{(notice || error) && <div role="status" className={`rounded-2xl border px-5 py-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}<div className="grid gap-4 sm:grid-cols-3"><Metric label="Visible articles" value={summary.visible} /><Metric label="HMSI Assistant" value={summary.assistant} /><Metric label="With cover image" value={summary.images} /></div><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">{sections.find((item) => item.id === filter)?.label}</p><h2 className="mt-1 text-2xl font-black">Review, publish, or retain editorial records.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#66716a]">Unpublished articles are retained for at least ten days, then archived automatically. Published news remains available until an administrator archives it.</p></div><button type="button" onClick={() => load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to refresh articles.'))} className="rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Refresh</button></div>
      {articles.length === 0 ? <div className="rounded-3xl border border-dashed border-[#cbd2ca] bg-white p-12 text-center"><ClipboardCheck className="mx-auto text-[#b56b3b]" size={34} /><h3 className="mt-5 text-xl font-black">No articles in this view</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#66716a]">New HMSI Assistant research and newsroom submissions will appear here when they match this editorial state.</p></div> : <div className="grid gap-5 xl:grid-cols-2">{articles.map((article) => <ArticleCard key={article.id} article={article} busy={busyId === article.id} onReview={() => { setSelected(article); setEditing(article); }} onApprove={() => applyAction(article, 'approve_publish')} onReject={() => reject(article)} />)}</div>}</section>
    </main>{selected && editing && <ReviewDrawer article={editing} busy={busyId === selected.id} onClose={() => { setSelected(null); setEditing(null); }} onChange={setEditing} onApprove={() => applyAction(selected, 'approve_publish', editing)} onSave={() => applyAction(selected, 'save_draft', editing)} onReject={() => reject(selected)} onArchive={() => applyAction(selected, 'archive', {}, 'Archived by administrator.')} />}
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#66716a]">{label}</p><p className="mt-2 text-3xl font-black tracking-tight text-[#1e5b49]">{value}</p></div>; }

function ArticleCard({ article, busy, onReview, onApprove, onReject }: { article: Article; busy: boolean; onReview: () => void; onApprove: () => void; onReject: () => void }) { return <article className="overflow-hidden rounded-3xl border border-[#d9d6ce] bg-white"><div className="grid min-h-52 grid-cols-[130px_1fr]"><div className="relative bg-[#17221e]">{article.image_url ? <img src={article.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/60"><ImageIcon size={26} /></div>}</div><div className="p-5"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${article.status === 'pending_admin_approval' ? 'bg-[#fff2d8] text-[#9a5b14]' : article.status === 'published' ? 'bg-[#e9f0e9] text-[#1e5b49]' : 'bg-[#f6f4ef] text-[#66716a]'}`}>{statusLabel(article.status)}</span>{article.status === 'pending_admin_approval' && <span className="rounded-full bg-[#17221e] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Pending editorial review</span>}</div><h3 className="mt-4 line-clamp-2 text-xl font-black leading-tight tracking-[-0.025em]">{article.headline}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#66716a]">{article.summary}</p><p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-[#b56b3b]">By {shortAuthor(article)} · {date(article.created_at)}</p><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} type="button" onClick={onReview} className="inline-flex items-center gap-1 rounded-full border border-[#d9d6ce] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#17221e] disabled:opacity-50"><Menu size={13} /> Review</button>{article.status !== 'published' && article.status !== 'archived' && <><button disabled={busy} type="button" onClick={onApprove} className="inline-flex items-center gap-1 rounded-full bg-[#1e5b49] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle2 size={13} />} Quick approve</button><button disabled={busy} type="button" onClick={onReject} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={13} /> Reject</button></>}</div></div></div></article>; }

function ReviewDrawer({ article, busy, onClose, onChange, onApprove, onSave, onReject, onArchive }: { article: Article; busy: boolean; onClose: () => void; onChange: (article: Article) => void; onApprove: () => void; onSave: () => void; onReject: () => void; onArchive: () => void }) { return <div className="fixed inset-0 z-[90] flex justify-end bg-[#17221e]/45 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Article inspection"><section className="flex h-full w-full max-w-4xl flex-col overflow-y-auto rounded-none bg-[#f6f4ef] shadow-2xl sm:rounded-[28px]"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#d9d6ce] bg-white px-6 py-5"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b56b3b]">Article inspection</p><h2 className="mt-1 text-xl font-black">Editorial review and preview</h2></div><button type="button" onClick={onClose} className="rounded-full p-2 text-[#66716a] hover:bg-[#f6f4ef]" aria-label="Close article inspection"><X size={20} /></button></header><div className="grid gap-8 p-6 xl:grid-cols-[1.05fr_0.95fr]"><div className="space-y-4"><label className="block text-xs font-black uppercase tracking-widest text-[#66716a]">Headline<input value={article.headline} onChange={(event) => onChange({ ...article, headline: event.target.value })} className="mt-2 w-full rounded-2xl border border-[#d9d6ce] bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#1e5b49]" /></label><label className="block text-xs font-black uppercase tracking-widest text-[#66716a]">Summary / excerpt<textarea value={article.summary} onChange={(event) => onChange({ ...article, summary: event.target.value })} rows={4} className="mt-2 w-full resize-none rounded-2xl border border-[#d9d6ce] bg-white px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#1e5b49]" /></label><label className="block text-xs font-black uppercase tracking-widest text-[#66716a]">Article content<textarea value={article.body} onChange={(event) => onChange({ ...article, body: event.target.value })} rows={16} className="mt-2 w-full resize-y rounded-2xl border border-[#d9d6ce] bg-white px-4 py-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-[#1e5b49]" /></label></div><aside className="space-y-5"><div className="overflow-hidden rounded-3xl bg-[#17221e]">{article.image_url ? <img src={article.image_url} alt={article.headline} className="h-64 w-full object-cover" /> : <div className="flex h-64 flex-col items-center justify-center text-center text-white/70"><ImageIcon size={30} /><p className="mt-3 text-sm font-bold">No cover image selected</p></div>}</div><div className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b56b3b]">Editorial metadata</p><dl className="mt-4 space-y-3 text-sm"><Meta label="Author" value={shortAuthor(article)} /><Meta label="Created" value={date(article.created_at)} /><Meta label="Review owner" value={article.reviewed_by || 'Not yet reviewed'} /><Meta label="Archive deadline" value={article.scheduled_archive_at ? date(article.scheduled_archive_at) : article.status === 'published' ? 'Published articles are retained' : 'Not scheduled'} /></dl></div>{article.rejection_reason && <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm leading-6 text-red-700"><p className="font-black uppercase tracking-widest">Prior editorial note</p><p className="mt-2">{article.rejection_reason}</p></div>}</aside></div><footer className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[#d9d6ce] bg-white px-6 py-5"><button disabled={busy} type="button" onClick={onApprove} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />} Approve & publish</button><button disabled={busy} type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#17221e] disabled:opacity-50"><Edit3 size={15} /> Save as draft / edit</button><button disabled={busy} type="button" onClick={onReject} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={15} /> Reject</button><button disabled={busy} type="button" onClick={onArchive} className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] disabled:opacity-50"><Archive size={15} /> Archive</button></footer></section></div>; }

function Meta({ label, value }: { label: string; value: string }) { return <div className="flex flex-col gap-1 border-b border-[#f6f4ef] pb-3 last:border-0 last:pb-0"><dt className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">{label}</dt><dd className="font-bold leading-5 text-[#17221e]">{value}</dd></div>; }

