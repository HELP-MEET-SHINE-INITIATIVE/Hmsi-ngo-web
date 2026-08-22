'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileText, Pencil, Save, Send, Trash2, X, XCircle } from 'lucide-react';
import OptionalImageUpload from './OptionalImageUpload';

type StoryViewer = { email: string; name: string; role: 'admin' | 'worker' | 'volunteer' | 'member' };
type Story = { id: string; title: string; excerpt: string; body: string; category: string; image_url: string | null; author_name: string; author_email: string; author_role: string; status: string; rejection_reason: string | null; created_at: string; published_at: string | null };
type StoryDraft = Pick<Story, 'title' | 'excerpt' | 'body' | 'category'> & { image_url: string };

const emptyForm = { title: '', excerpt: '', body: '', category: 'HMSI field story', image_url: '' };

export default function FeaturedStoryStudio({ viewer }: { viewer: StoryViewer }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingStory, setEditingStory] = useState<{ id: string; draft: StoryDraft } | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const loadStories = useCallback(async () => {
    const response = await fetch(`/api/stories?email=${encodeURIComponent(viewer.email)}&role=${viewer.role}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load stories.');
    setStories(result.stories || []);
  }, [viewer.email, viewer.role]);

  useEffect(() => { loadStories().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load stories.')); }, [loadStories]);

  const submitStory = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to submit story.');
      setForm(emptyForm);
      await loadStories();
      setNotice(result.message || 'Story submitted.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit story.');
    } finally {
      setIsBusy(false);
    }
  };

  const startEditing = (story: Story) => {
    setError('');
    setNotice('');
    setEditingStory({ id: story.id, draft: { title: story.title, excerpt: story.excerpt, body: story.body, category: story.category, image_url: story.image_url || '' } });
  };

  const saveEditedStory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingStory) return;
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/stories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingStory.id, action: 'update', ...editingStory.draft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save story changes.');
      setEditingStory(null);
      await loadStories();
      setNotice(result.message || 'Story changes saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save story changes.');
    } finally {
      setIsBusy(false);
    }
  };

  const deleteStory = async (story: Story) => {
    if (!window.confirm(`Permanently delete “${story.title}”? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/stories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: story.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete story.');
      if (editingStory?.id === story.id) setEditingStory(null);
      await loadStories();
      setNotice(result.message || 'Story permanently deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete story.');
    } finally {
      setIsBusy(false);
    }
  };

  const reviewStory = async (id: string, action: 'approve' | 'reject' | 'publish') => {
    if (action === 'reject' && reviewReason.trim().length < 3) {
      setError('Add a short revision reason before rejecting this story.');
      return;
    }
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/stories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, reason: reviewReason.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update story.');
      setReviewingId(null);
      setReviewReason('');
      await loadStories();
      setNotice(result.message || 'Story updated.');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to update story.');
    } finally {
      setIsBusy(false);
    }
  };

  const statusLabel: Record<string, string> = { pending_admin_approval: 'Waiting for admin approval', approved: 'Approved — ready to publish', rejected: 'Needs revision', published: 'Published on homepage', draft: 'Draft' };

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-black">Featured homepage stories</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">{viewer.role === 'admin' ? 'Create and publish stories directly, approve submissions, or edit and delete any story at any time.' : 'Submit a field story or field-event update for the administrator to review before it appears publicly.'}</p></div>
    {(error || notice) && <div className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`} role="status">{error || notice}</div>}
    <form onSubmit={submitStory} className="grid gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 md:grid-cols-2">
      <input required minLength={5} placeholder="Story title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" />
      <input required minLength={20} placeholder="Short homepage excerpt" value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" />
      <textarea required minLength={40} rows={6} placeholder="Write the field story, outcome, or community update" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" />
      <input placeholder="Category, e.g. Nigeria / Field desk" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" />
      <div className="md:col-span-2"><OptionalImageUpload viewer={{ email: viewer.email, role: viewer.role }} value={form.image_url} onChange={(imageUrl) => setForm({ ...form, image_url: imageUrl })} /></div>
      <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 md:col-span-2"><Send size={15} />{viewer.role === 'admin' ? 'Publish story to homepage' : 'Submit story for approval'}</button>
    </form>
    <div className="space-y-4">
      <h3 className="text-xl font-black">{viewer.role === 'admin' ? 'Story review queue' : 'Your story submissions'}</h3>
      {stories.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">No stories yet.</div> : stories.map((story) => <article key={story.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
        {viewer.role === 'admin' && editingStory?.id === story.id ? <form onSubmit={saveEditedStory} className="space-y-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Edit story</p><h4 className="mt-1 text-xl font-black">{story.title}</h4></div><button type="button" onClick={() => setEditingStory(null)} className="rounded-full p-2 text-[#66716a] hover:bg-[#f6f4ef]" aria-label="Cancel editing"><X size={18} /></button></div><input required minLength={5} maxLength={160} value={editingStory.draft.title} onChange={(event) => setEditingStory({ ...editingStory, draft: { ...editingStory.draft, title: event.target.value } })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input required minLength={20} maxLength={320} value={editingStory.draft.excerpt} onChange={(event) => setEditingStory({ ...editingStory, draft: { ...editingStory.draft, excerpt: event.target.value } })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><textarea required minLength={40} maxLength={6000} rows={7} value={editingStory.draft.body} onChange={(event) => setEditingStory({ ...editingStory, draft: { ...editingStory.draft, body: event.target.value } })} className="w-full resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input value={editingStory.draft.category} onChange={(event) => setEditingStory({ ...editingStory, draft: { ...editingStory.draft, category: event.target.value } })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><OptionalImageUpload viewer={{ email: 'admin', role: 'admin' }} value={editingStory.draft.image_url} onChange={(imageUrl) => setEditingStory({ ...editingStory, draft: { ...editingStory.draft, image_url: imageUrl } })} /><div className="flex flex-wrap gap-2"><button disabled={isBusy} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><Save size={15} /> Save changes</button><button type="button" disabled={isBusy} onClick={() => deleteStory(story)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><Trash2 size={15} /> Delete permanently</button></div></form> : <><div className="flex flex-col justify-between gap-4 md:flex-row"><div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{statusLabel[story.status] || story.status}</span><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">{story.author_role}</span></div><h4 className="text-xl font-black">{story.title}</h4><p className="mt-2 text-sm leading-6 text-[#66716a]">{story.excerpt}</p><p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#b56b3b]">By {story.author_name} · {new Date(story.created_at).toLocaleString()}</p>{story.rejection_reason && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">Revision note: {story.rejection_reason}</p>}</div>{viewer.role === 'admin' && <div className="flex shrink-0 flex-wrap items-start gap-2">{story.status !== 'published' && <><button disabled={isBusy} onClick={() => reviewStory(story.id, story.status === 'approved' ? 'publish' : 'approve')} className="inline-flex items-center gap-1 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><CheckCircle2 size={14} />{story.status === 'approved' ? 'Publish' : 'Approve'}</button><button disabled={isBusy} onClick={() => { setReviewingId(story.id); setReviewReason(''); }} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><XCircle size={14} />Reject</button></>}<button disabled={isBusy} onClick={() => startEditing(story)} className="inline-flex items-center gap-1 rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#17221e] disabled:opacity-50"><Pencil size={14} /> Edit</button><button disabled={isBusy} onClick={() => deleteStory(story)} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><Trash2 size={14} /> Delete</button></div>}</div>{viewer.role === 'admin' && reviewingId === story.id && <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4"><label htmlFor={`story-reason-${story.id}`} className="text-xs font-black uppercase tracking-widest text-red-700">Why should this story be revised?</label><textarea id={`story-reason-${story.id}`} required minLength={3} rows={3} value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} className="mt-3 w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-400" /><div className="mt-3 flex gap-2"><button type="button" disabled={isBusy} onClick={() => reviewStory(story.id, 'reject')} className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">Confirm rejection</button><button type="button" onClick={() => setReviewingId(null)} className="rounded-full border border-[#d9d6ce] bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a]">Cancel</button></div></div>}</>}</article>)}
    </div>
  </div>;
}
