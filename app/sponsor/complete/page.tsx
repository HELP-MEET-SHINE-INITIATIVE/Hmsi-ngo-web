'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export default function SponsorshipPaymentCompletePage() {
  const [message, setMessage] = useState('Verifying your Paystack payment…');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sponsorshipId = params.get('sponsorship') || '';
    const reference = params.get('reference') || params.get('trxref') || '';
    if (!sponsorshipId || !reference) { setMessage('The payment callback did not include a sponsorship reference.'); return; }
    fetch('/api/sponsorships/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sponsorship_id: sponsorshipId, reference }) })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Payment verification failed.'); setOk(true); setMessage(payload.message || 'Payment verified.'); })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Payment verification failed.'));
  }, []);

  return <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] px-6 py-16 text-[#17221e]"><section className="w-full max-w-xl rounded-[32px] bg-white p-8 text-center shadow-xl sm:p-12">{ok ? <CheckCircle2 className="mx-auto text-[#1e5b49]" size={46} /> : <ShieldAlert className="mx-auto text-[#b56b3b]" size={46} />}<h1 className="mt-6 text-3xl font-black tracking-[-0.04em]">{ok ? 'Payment verified' : 'Payment status'}</h1><p className="mt-4 text-sm leading-7 text-[#66716a]">{message}</p>{ok && <p className="mt-4 text-sm leading-7 text-[#66716a]">An HMSI administrator must still activate the sponsored placement before it appears in a community room.</p>}<Link href="/sponsor" className="mt-8 inline-flex rounded-full bg-[#17221e] px-6 py-3 text-xs font-black uppercase tracking-widest text-white">Return to sponsorships</Link></section></main>;
}
