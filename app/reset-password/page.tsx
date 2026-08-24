"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const INVALID_LINK = 'This recovery link is invalid or has expired. Request a new one.';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [tokens, setTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Preparing secure recovery session…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
    if (!accessToken || !refreshToken || !url || !key) { setMessage(INVALID_LINK); return () => { active = false; }; }
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (!active) return;
      if (error) setMessage(INVALID_LINK);
      else { setTokens({ accessToken, refreshToken }); setReady(true); setMessage('Choose a new password of at least 10 characters.'); }
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || !tokens || password.length < 10 || password !== confirmation) return;
    setBusy(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setMessage(INVALID_LINK); setBusy(false); return; }
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const session = await client.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken });
    if (session.error) { setMessage(INVALID_LINK); setBusy(false); return; }
    const { error } = await client.auth.updateUser({ password });
    if (error) setMessage('The password could not be updated. Request a new recovery link.');
    else { await client.auth.signOut(); setTokens(null); setReady(false); setPassword(''); setConfirmation(''); setMessage('Password updated. You can now sign in.'); }
    setBusy(false);
  }

  const mismatch = confirmation.length > 0 && password !== confirmation;
  return <main className="min-h-screen bg-[#f6f4ef] px-6 py-16"><div className="mx-auto max-w-md rounded-3xl border border-[#d9d6ce] bg-white p-8 shadow-sm"><h1 className="text-3xl font-black text-[#17221e]">Set a new password</h1><p role="status" className="mt-3 text-sm leading-6 text-[#66716a]">{message}</p><form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-xs font-black uppercase tracking-widest text-[#17221e]">New password<input required minLength={10} type="password" autoComplete="new-password" disabled={!ready || busy} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:border-[#1e5b49]" /></label><label className="block text-xs font-black uppercase tracking-widest text-[#17221e]">Confirm new password<input required minLength={10} type="password" autoComplete="new-password" disabled={!ready || busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} aria-invalid={mismatch} className="mt-2 w-full rounded-xl border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:border-[#1e5b49]" />{mismatch && <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-red-700">Passwords do not match.</span>}</label><button disabled={!ready || busy || password.length < 10 || password !== confirmation} className="w-full rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? 'Updating…' : 'Update password'}</button></form><Link href="/login" className="mt-6 inline-block text-sm font-bold text-[#1e5b49]">Return to sign in</Link></div></main>;
}
