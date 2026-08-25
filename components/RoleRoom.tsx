'use client';

import { FormEvent, useEffect, useState } from 'react';

type Role = 'worker' | 'volunteer' | 'member';
type Message = { id: string; author_name: string; content: string; created_at: string };
const title: Record<Role, string> = { worker: 'Worker Operations & Daily Activities', volunteer: 'Volunteer Community Room', member: 'HMSI Member Lounge' };

export default function RoleRoom({ role }: { role: Role }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const load = async () => {
    const response = await fetch(`/api/portal/rooms/${role}`, { cache: 'no-store', credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The room is unavailable.');
    setMessages(data.messages || []);
  };
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'The room is unavailable.')); const timer = window.setInterval(() => void load().catch(() => undefined), 15_000); return () => window.clearInterval(timer); }, [role]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setSending(true); setError('');
    try {
      const response = await fetch(`/api/portal/rooms/${role}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The message could not be sent.');
      setMessages((current) => [...current, data.message]); setContent('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The message could not be sent.'); } finally { setSending(false); }
  }
  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-10 text-[#17221e]"><div className="mx-auto max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Active HMSI portal</p><h1 className="mt-2 text-4xl font-black">{title[role]}</h1><p className="mt-3 text-sm leading-6 text-[#66716a]">Only active users with the matching role can read or send messages here. Messages refresh while this page is open.</p>{error && <p role="alert" className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}<section className="mt-8 space-y-3 rounded-3xl border border-[#d9d6ce] bg-white p-5">{messages.length === 0 ? <p className="text-sm text-[#66716a]">No messages have been posted yet.</p> : messages.map((message) => <article key={message.id} className="border-b border-[#ece8df] pb-3 last:border-0"><strong className="text-sm">{message.author_name}</strong><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.content}</p><time className="mt-2 block text-xs text-[#66716a]">{new Date(message.created_at).toLocaleString('en-NG')}</time></article>)}</section><form onSubmit={send} className="mt-5 rounded-3xl border border-[#d9d6ce] bg-white p-5"><label className="block text-sm font-black" htmlFor="room-message">Message</label><textarea id="room-message" value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-2xl border border-[#d9d6ce] p-3" placeholder="Share a relevant daily update…" /><button disabled={sending} className="mt-3 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{sending ? 'Sending…' : 'Send message'}</button></form></div></main>;
}
