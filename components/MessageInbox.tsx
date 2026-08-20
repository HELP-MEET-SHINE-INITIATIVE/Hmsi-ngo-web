'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, Mail, MessageCircle, RefreshCw, Send } from 'lucide-react';

type Viewer = { email?: string; role: 'admin' | 'worker' };

type Reply = {
  id: string;
  author_name: string;
  author_email?: string | null;
  author_role: 'admin' | 'worker';
  body: string;
  created_at: string;
};

type MessageThread = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
  is_read: boolean;
  replies: Reply[];
};

type MessageInboxProps = {
  viewer: Viewer;
  compact?: boolean;
  onUnreadChange?: (count: number) => void;
};

export default function MessageInbox({ viewer, compact = false, onUnreadChange }: MessageInboxProps) {
  const [messages, setMessages] = useState<MessageThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const query = viewer.role === 'worker' && viewer.email
    ? `?email=${encodeURIComponent(viewer.email)}&role=worker`
    : '';

  const loadMessages = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`/api/messages${query}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Messages are temporarily unavailable.');
      setMessages(result.messages || []);
      setUnreadCount(Number(result.unreadCount || 0));
      onUnreadChange?.(Number(result.unreadCount || 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Messages are temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadChange, query]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const selectedMessage = useMemo(() => messages.find((message) => message.id === selectedId) || null, [messages, selectedId]);

  const markRead = async (messageId: string) => {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read', message_id: messageId, email: viewer.email, role: viewer.role }),
    });
    if (!response.ok) return;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, is_read: true } : message));
    setUnreadCount((current) => {
      const next = Math.max(0, current - 1);
      onUnreadChange?.(next);
      return next;
    });
  };

  const openMessage = async (message: MessageThread) => {
    setSelectedId(message.id);
    setReplyDraft('');
    if (!message.is_read) await markRead(message.id);
  };

  const sendInternalReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMessage || !replyDraft.trim()) return;
    setIsBusy(true);
    setError('');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', message_id: selectedMessage.id, body: replyDraft.trim(), email: viewer.email, role: viewer.role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The reply could not be saved.');
      setMessages((current) => current.map((message) => message.id === selectedMessage.id ? { ...message, replies: [...message.replies, result.reply] } : message));
      setReplyDraft('');
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : 'The reply could not be saved.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]"><MessageCircle size={16} /> Contact messages</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Inbox and replies</h2>
          <p className="mt-2 text-sm text-[#66716a]">Read messages sent through the public contact form and reply by email or in the internal HMSI thread.</p>
        </div>
        <button onClick={loadMessages} className="flex items-center gap-2 rounded-full border border-[#d9d6ce] bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a] hover:border-[#1e5b49] hover:text-[#1e5b49]"><RefreshCw size={14} /> Refresh</button>
      </div>

      {unreadCount > 0 && <div className="flex items-center gap-2 rounded-2xl border border-[#e1ad45]/40 bg-[#fff8e8] p-4 text-sm text-[#7a5b16]"><Mail size={17} />{unreadCount} unread message{unreadCount === 1 ? '' : 's'} assigned to you.</div>}
      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

      {isLoading ? <div className="rounded-3xl border border-[#d9d6ce] bg-white p-8 text-center text-sm text-[#66716a]">Loading messages…</div> : messages.length === 0 ? <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm italic text-[#66716a]">No contact messages have been assigned to this inbox yet.</div> : <div className="grid gap-5 xl:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
        <div className="space-y-3">
          {messages.map((message) => <button key={message.id} onClick={() => openMessage(message)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === message.id ? 'border-[#1e5b49] bg-[#e9f0e9]' : 'border-[#d9d6ce] bg-white hover:border-[#1e5b49]'} ${!message.is_read ? 'shadow-[0_8px_24px_rgba(225,173,69,0.16)]' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black">{message.name}</p><p className="mt-1 truncate text-xs text-[#66716a]">{message.email}</p></div>{!message.is_read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e1ad45]" aria-label="Unread" />}</div><p className="mt-3 line-clamp-2 text-sm leading-5 text-[#66716a]">{message.message}</p><p className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#b56b3b]">{new Date(message.created_at).toLocaleDateString()} · {message.replies.length} repl{message.replies.length === 1 ? 'y' : 'ies'}</p></button>)}
        </div>

        {selectedMessage ? <article className="rounded-3xl border border-[#d9d6ce] bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 border-b border-[#f6f4ef] pb-5 sm:flex-row"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Message from</p><h3 className="mt-2 text-xl font-black">{selectedMessage.name}</h3><a href={`mailto:${selectedMessage.email}`} className="mt-1 block text-sm font-bold text-[#1e5b49] hover:underline">{selectedMessage.email}</a><p className="mt-2 text-xs text-[#66716a]">Received {new Date(selectedMessage.created_at).toLocaleString()}</p></div><a href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(`Re: HMSI enquiry from ${selectedMessage.name}`)}`} className="inline-flex h-fit items-center justify-center gap-2 rounded-full bg-[#17221e] px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-[#1e5b49]"><Mail size={14} /> Reply by email</a></div><div className="mt-5 rounded-2xl bg-[#f6f4ef] p-5 text-sm leading-7 text-[#17221e]">{selectedMessage.message}</div><div className="mt-6 space-y-3"><h4 className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Internal thread</h4>{selectedMessage.replies.length === 0 ? <p className="rounded-2xl border border-dashed border-[#d9d6ce] p-4 text-sm text-[#66716a]">No internal replies yet.</p> : selectedMessage.replies.map((reply) => <div key={reply.id} className="rounded-2xl border border-[#d9d6ce] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black">{reply.author_name} <span className="ml-2 rounded-full bg-[#e9f0e9] px-2 py-1 text-[9px] uppercase tracking-widest text-[#1e5b49]">{reply.author_role}</span></p><p className="text-[10px] text-[#66716a]">{new Date(reply.created_at).toLocaleString()}</p></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{reply.body}</p></div>)}</div><form onSubmit={sendInternalReply} className="mt-6 border-t border-[#f6f4ef] pt-5"><label htmlFor={`reply-${selectedMessage.id}`} className="text-xs font-black uppercase tracking-widest text-[#66716a]">Internal reply</label><textarea id={`reply-${selectedMessage.id}`} required rows={3} value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder="Write a reply for the HMSI team…" className="mt-2 w-full resize-y rounded-2xl bg-[#f6f4ef] p-4 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><button disabled={isBusy} className="mt-3 flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><Send size={14} />{isBusy ? 'Sending…' : 'Send internal reply'}</button></form><p className="mt-4 flex items-center gap-2 text-xs text-[#66716a]"><CheckCheck size={14} className="text-[#1e5b49]" /> Marking a message read only clears your own unread notification.</p></article> : <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm text-[#66716a]">Select a message to read the full conversation.</div>}
      </div>}
    </section>
  );
}
