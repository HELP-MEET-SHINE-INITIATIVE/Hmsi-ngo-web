"use client";
import Link from 'next/link';
import { FormEvent, useState } from 'react';
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(''); const response = await fetch('/api/portal/auth/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const payload = await response.json().catch(() => ({})); setMessage(payload.message || payload.error || 'Please try again later.'); setBusy(false); }
  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-16"><div className="mx-auto max-w-md rounded-3xl border border-[#d9d6ce] bg-white p-8 shadow-sm"><Link href="/login" className="text-sm font-bold text-[#1e5b49]">Back to sign in</Link><h1 className="mt-8 text-3xl font-black text-[#17221e]">Reset your password</h1><p className="mt-3 text-sm leading-6 text-[#66716a]">Enter the email connected to your HMSI volunteer, member, or worker portal account. If eligible, Supabase Auth will send recovery instructions.</p><form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-xs font-black uppercase tracking-widest text-[#17221e]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:border-[#1e5b49]" /></label><button disabled={busy} className="w-full rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send recovery link'}</button></form>{message && <p role="status" className="mt-5 rounded-2xl bg-[#e9f0e9] p-4 text-sm leading-6 text-[#1e5b49]">{message}</p>}</div></main>;
}
