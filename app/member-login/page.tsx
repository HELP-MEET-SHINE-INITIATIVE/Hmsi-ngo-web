'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, KeyRound } from 'lucide-react';

export default function MemberLoginPage() {
  const router = useRouter();
  const [memberNumber, setMemberNumber] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/credentials/id-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_number: memberNumber, activation_code: activationCode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The ID card could not be activated.');
      router.push(result.card?.holder_role === 'worker' ? '/worker-dashboard' : '/dashboard');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The ID card could not be activated.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-[#f6f4ef] px-5 py-16 text-[#17221e] sm:px-8"><div className="mx-auto max-w-md"><div className="rounded-3xl border border-[#d9d6ce] bg-white p-7"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9f0e9] text-[#1e5b49]"><KeyRound size={26} /></div><p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">HMSI member portal</p><h1 className="mt-2 text-3xl font-black">Activate your ID card</h1><p className="mt-3 text-sm leading-6 text-[#66716a]">Enter the member number and temporary activation code printed by HMSI. The code can be used once and is not a permanent password.</p>{error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="text-xs font-black uppercase tracking-widest text-[#66716a]">Member number</span><input required value={memberNumber} onChange={(event) => setMemberNumber(event.target.value.toUpperCase())} placeholder="HMSI-W-2026-XXXXXXXX" className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-[#1e5b49]" /></label><label className="block"><span className="text-xs font-black uppercase tracking-widest text-[#66716a]">Activation code</span><input required inputMode="text" value={activationCode} onChange={(event) => setActivationCode(event.target.value.toUpperCase())} placeholder="12-character code" className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 font-mono text-sm uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#1e5b49]" /></label><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? 'Activating…' : 'Activate HMSI member access'}</button></form><div className="mt-6 flex gap-3 rounded-2xl bg-[#fff8e8] p-4 text-xs leading-5 text-[#7a5b16]"><BadgeCheck size={17} className="shrink-0" /><p>Keep the physical card secure. If it is lost, contact HMSI so the administrator can revoke it.</p></div></div></div></main>;
}
