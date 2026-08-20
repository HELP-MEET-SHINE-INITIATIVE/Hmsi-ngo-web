'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth';

type Room = 'volunteer' | 'worker';

export default function CommunityRoomContent({ room }: { room: Room }) {
  const { user, isLoading: authLoading } = useAuth();
  const [adminViewer, setAdminViewer] = useState<{ email: string; name: string; role: 'admin' } | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const viewer = user || adminViewer;

  const loadPosts = useCallback(async () => {
    if (!viewer) return;
    const response = await fetch(`/api/community?audience=${room}&email=${encodeURIComponent(viewer.email)}&role=${encodeURIComponent(viewer.role)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Community posts are unavailable.');
    setPosts(result.posts || []);
  }, [room, viewer]);

  useEffect(() => {
    if (authLoading || user) return;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (result.authenticated) setAdminViewer({ email: result.email || 'admin', name: 'HMSI Admin', role: 'admin' });
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [authLoading, user]);

  useEffect(() => {
    if (!authLoading && viewer) loadPosts().catch((error) => setStatus(error instanceof Error ? error.message : 'Community posts are unavailable.')).finally(() => setIsLoading(false));
    if (!authLoading && !viewer && !user) setIsLoading(false);
  }, [authLoading, viewer, user, room, loadPosts]);

  if (authLoading || isLoading) return <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] text-[#66716a]">Loading community room…</main>;
  if (!viewer) return <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] p-6"><div className="rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">Sign in to enter the community</h1><Link href="/login" className="mt-5 inline-block rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Sign in</Link></div></main>;
  if (room === 'worker' && viewer.role !== 'worker' && viewer.role !== 'admin') return <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] p-6"><div className="rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">Worker room access required</h1><p className="mt-3 text-sm text-[#66716a]">This space is for approved workers, administrators, and coordinators.</p><Link href="/volunteer-room" className="mt-5 inline-block rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Open volunteer room</Link></div></main>;

  const createPost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setIsBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audience: room, authorRole: viewer.role, email: viewer.email, content: draft.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not publish your post.');
      setPosts((current) => [result.post, ...current]);
      setDraft('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'We could not publish your post.');
    } finally {
      setIsBusy(false);
    }
  };

  const toggleLike = async (post: any) => {
    const response = await fetch('/api/community/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: post.id, email: viewer.email, role: viewer.role }) });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error || 'We could not update the like.');
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likedByMe: result.liked, likeCount: Math.max(0, (item.likeCount || 0) + (result.liked ? 1 : -1)) } : item));
  };

  const moderateComment = async (commentId: string) => {
    const isAdmin = viewer.role === 'admin';
    const response = await fetch('/api/admin/moderation', { method: isAdmin ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isAdmin ? { action: 'delete_comment', commentId } : { commentId, email: viewer.email, role: viewer.role, reason: 'Potentially inappropriate volunteer-room comment.' }) });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error || 'Moderation action failed.');
    if (isAdmin) setPosts((current) => current.map((post) => ({ ...post, comments: (post.comments || []).filter((comment: any) => comment.id !== commentId) })));
    setStatus(isAdmin ? 'Comment deleted.' : 'Comment flagged for admin review.');
  };

  const addComment = async (event: React.FormEvent, postId: string) => {
    event.preventDefault();
    const content = (commentDraft[postId] || '').trim();
    if (!content) return;
    const response = await fetch('/api/community/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, authorRole: viewer.role, email: viewer.email, content }) });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error || 'We could not add the comment.');
    setPosts((current) => current.map((item) => item.id === postId ? { ...item, comments: [...(item.comments || []), result.comment] } : item));
    setCommentDraft({ ...commentDraft, [postId]: '' });
  };

  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-12 text-[#17221e]"><div className="mx-auto max-w-3xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]"><Users size={16} />{room === 'volunteer' ? 'Volunteer room' : 'Worker room'}</p><h1 className="mt-2 text-4xl font-black tracking-tight">{room === 'volunteer' ? 'Volunteer collaboration' : 'Worker coordination'}</h1><p className="mt-3 text-[#66716a]">{room === 'volunteer' ? 'Share ideas, coordinate outreach, and collaborate with volunteers and workers.' : 'Coordinate tasks, field updates, and worker-only collaboration.'}</p></div><div className="flex gap-2"><Link href="/opportunities" className="rounded-full border border-[#d9d6ce] bg-white px-4 py-3 text-xs font-black uppercase tracking-widest">Opportunities</Link>{room === 'worker' ? <Link href="/volunteer-room" className="rounded-full border border-[#d9d6ce] bg-white px-4 py-3 text-xs font-black uppercase tracking-widest">Volunteer room</Link> : viewer.role === 'worker' || viewer.role === 'admin' ? <Link href="/worker-room" className="rounded-full border border-[#d9d6ce] bg-white px-4 py-3 text-xs font-black uppercase tracking-widest">Worker room</Link> : null}</div></div>{status && <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{status}</div>}<form onSubmit={createPost} className="mt-8 rounded-3xl border border-[#d9d6ce] bg-white p-6"><textarea required value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} placeholder={room === 'worker' ? 'Share a worker update…' : 'Share an opportunity, idea, or progress update…'} className="w-full resize-none rounded-2xl bg-[#f6f4ef] p-4 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><button disabled={isBusy} className="mt-4 flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><Send size={15} />{isBusy ? 'Publishing…' : 'Publish post'}</button></form><div className="mt-8 space-y-5">{posts.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-[#66716a]">No posts yet. Start the conversation.</div> : posts.map((post) => <article key={post.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center justify-between"><div><p className="font-black">{post.author_name}</p><p className="text-xs font-bold uppercase tracking-widest text-[#b56b3b]">{post.author_role} · {new Date(post.created_at).toLocaleString()}</p></div></div><p className="mt-4 leading-7">{post.content}</p><div className="mt-5 flex items-center gap-5 border-t border-[#f6f4ef] pt-4"><button onClick={() => toggleLike(post)} className={`flex items-center gap-2 text-xs font-black ${post.likedByMe ? 'text-[#1e5b49]' : 'text-[#66716a]'}`}><Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} />Like {post.likeCount || 0}</button><span className="flex items-center gap-2 text-xs font-black text-[#66716a]"><MessageCircle size={16} />{post.comments?.length || 0} comments</span></div><form onSubmit={(event) => addComment(event, post.id)} className="mt-4 flex gap-2"><input value={commentDraft[post.id] || ''} onChange={(event) => setCommentDraft({ ...commentDraft, [post.id]: event.target.value })} placeholder="Write a comment…" className="min-w-0 flex-1 rounded-full bg-[#f6f4ef] px-4 py-2 text-xs outline-none" /><button className="rounded-full bg-[#17221e] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">Comment</button></form>{post.comments?.length > 0 && <div className="mt-4 space-y-2 border-t border-[#f6f4ef] pt-4">{post.comments.map((comment: any) => <div key={comment.id} className="rounded-2xl bg-[#f6f4ef] p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-black">{comment.author_name}</p>{(viewer.role === 'admin' || (viewer.role === 'worker' && room === 'volunteer')) && <button type="button" onClick={() => moderateComment(comment.id)} className="text-[10px] font-black uppercase tracking-widest text-red-600">{viewer.role === 'admin' ? 'Delete' : 'Flag'}</button>}</div><p className="mt-1 text-sm">{comment.content}</p></div>)}</div>}</article>)}</div></div></main>;
}
