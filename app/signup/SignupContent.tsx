"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { AlertCircle, ArrowRight, Mail, MapPin, User } from 'lucide-react';

export default function SignupContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location: location.trim(),
          interest: 'General Support',
          message: 'Volunteer account signup request — please review my application for opportunities with HMSI.',
          role: 'volunteer',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not submit your volunteer application.');
      setMessage('Your volunteer application has been received. Please wait for HMSI approval and the official onboarding instructions before trying to access a portal.');
      setName(''); setEmail(''); setPhone(''); setLocation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not submit your volunteer application.');
    } finally {
      setIsLoading(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] px-6 py-12"><div className="w-full max-w-md"><div className="mb-10 text-center"><Link href="/" className="mb-6 inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[#272178] shadow-sm" aria-label="HMSI home"><Image src="/logo.png" alt="HMSI logo" width={56} height={56} className="h-full w-full object-cover" /></Link><h1 className="text-3xl font-black tracking-tight text-[#17221e]">Volunteer application</h1><p className="mt-2 text-[#66716a]">Apply once. HMSI will review your request before portal access is created.</p></div><div className="rounded-3xl border border-[#d9d6ce] bg-white p-8 shadow-[0_24px_70px_rgba(23,34,30,0.08)]"><form onSubmit={handleSubmit} className="space-y-6">{error && <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} />{error}</div>}{message && <div role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">{message}</div>}<div className="rounded-2xl border border-[#d9d6ce] bg-[#e9f0e9] p-4 text-sm leading-6 text-[#1e5b49]">For worker roles, use the <Link href="/worker-apply" className="font-black underline">worker application</Link>. Do not create an account until HMSI approves your application.</div><label className="block text-xs font-black uppercase tracking-wider text-[#17221e]">Full name<div className="relative mt-2"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} /><input type="text" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 py-3.5 pl-12 pr-4 outline-none transition-all focus:border-[#1e5b49] focus:bg-white" placeholder="Amina Yusuf" /></div></label><label className="block text-xs font-black uppercase tracking-wider text-[#17221e]">Email address<div className="relative mt-2"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 py-3.5 pl-12 pr-4 outline-none transition-all focus:border-[#1e5b49] focus:bg-white" placeholder="amina@example.com" /></div></label><label className="block text-xs font-black uppercase tracking-wider text-[#17221e]">Phone number<input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 px-4 py-3.5 outline-none transition-all focus:border-[#1e5b49] focus:bg-white" placeholder="+234..." /></label><label className="block text-xs font-black uppercase tracking-wider text-[#17221e]">Location<div className="relative mt-2"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} /><input type="text" required maxLength={160} value={location} onChange={(event) => setLocation(event.target.value)} className="w-full rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 py-3.5 pl-12 pr-4 outline-none transition-all focus:border-[#1e5b49] focus:bg-white" placeholder="City, State / Province, Country" /></div></label><button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17221e] py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-[#1e5b49] disabled:opacity-50">{isLoading ? 'Submitting application…' : 'Submit for approval'} {!isLoading && <ArrowRight size={18} />}</button></form><div className="mt-8 border-t border-[#f6f4ef] pt-8 text-center"><p className="text-sm text-[#66716a]">Already activated? <Link href="/login" className="font-bold text-[#1e5b49] hover:underline">Sign in</Link><span className="mx-2 text-[#d9d6ce]">·</span><Link href="/worker-apply" className="font-bold text-[#1e5b49] hover:underline">Apply as a worker</Link></p></div></div></div></main>;
}
