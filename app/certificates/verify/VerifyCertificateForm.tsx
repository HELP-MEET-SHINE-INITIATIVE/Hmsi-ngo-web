"use client";

import { FormEvent, useState } from 'react';
import { CheckCircle2, Search, ShieldAlert } from 'lucide-react';

interface CertificateResult {
  certificate_number: string;
  holder_name: string;
  service_title: string;
  service_start: string | null;
  service_end: string | null;
  service_hours: number | null;
  issued_on: string;
  status: string;
}

function dateLabel(value: string | null) {
  if (!value) return 'Not specified';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-NG', { dateStyle: 'long', timeZone: 'Africa/Lagos' });
}

export default function VerifyCertificateForm() {
  const [certificateNumber, setCertificateNumber] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CertificateResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params = new URLSearchParams({ certificate_number: certificateNumber.trim(), code: code.trim() });
      const response = await fetch(`/api/certificates/verify?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.verified) throw new Error(payload.error || 'Certificate details could not be verified.');
      setResult(payload.certificate);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Certificate verification is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <form onSubmit={submit} className="rounded-[28px] bg-[#17221e] p-7 text-white shadow-[0_24px_70px_rgba(23,34,30,0.12)] sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e1ad45]">Secure lookup</p>
        <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">Check a certificate</h2>
        <p className="mt-4 text-sm leading-7 text-white/65">Use the certificate number and the private verification code supplied with the certificate. HMSI does not ask you to enter an email address.</p>
        <label className="mt-8 block text-xs font-black uppercase tracking-[0.14em] text-white/70" htmlFor="certificate-number">Certificate number</label>
        <input id="certificate-number" required value={certificateNumber} onChange={(event) => setCertificateNumber(event.target.value)} placeholder="HMSI-VOL-20260822-XXXXXXXX" className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold uppercase outline-none placeholder:text-white/30 focus:border-[#e1ad45]" />
        <label className="mt-5 block text-xs font-black uppercase tracking-[0.14em] text-white/70" htmlFor="verification-code">Private verification code</label>
        <input id="verification-code" required value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter the code from the email" className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/30 focus:border-[#e1ad45]" />
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100"><ShieldAlert className="mr-2 inline-block" size={16} />{error}</p>}
        <button type="submit" disabled={loading} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e1ad45] px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-[#17221e] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Search size={16} />{loading ? 'Checking…' : 'Verify certificate'}</button>
      </form>

      <div className="rounded-[28px] border border-[#d9d6ce] bg-white p-7 sm:p-10">
        {!result ? <div className="flex min-h-[280px] flex-col justify-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#b56b3b]">Verification result</p><h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">A simple, private check.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-[#66716a]">A valid result confirms that the certificate number and private code match an active certificate record issued through HMSI’s administrative process.</p></div> : <div><div className="flex items-center gap-3 text-[#1e5b49]"><CheckCircle2 size={28} /><p className="text-xs font-black uppercase tracking-[0.2em]">Verified active certificate</p></div><h2 className="mt-6 text-4xl font-black tracking-[-0.04em]">{result.holder_name}</h2><dl className="mt-8 space-y-5 text-sm"><div><dt className="font-black uppercase tracking-[0.14em] text-[#66716a]">Service</dt><dd className="mt-1 leading-6">{result.service_title}</dd></div><div><dt className="font-black uppercase tracking-[0.14em] text-[#66716a]">Service period</dt><dd className="mt-1 leading-6">{dateLabel(result.service_start)} – {dateLabel(result.service_end)}</dd></div><div><dt className="font-black uppercase tracking-[0.14em] text-[#66716a]">Hours recorded</dt><dd className="mt-1 leading-6">{result.service_hours == null ? 'Not specified' : `${result.service_hours} hours`}</dd></div><div><dt className="font-black uppercase tracking-[0.14em] text-[#66716a]">Certificate number</dt><dd className="mt-1 font-mono text-xs leading-6">{result.certificate_number}</dd></div><div><dt className="font-black uppercase tracking-[0.14em] text-[#66716a]">Issued on</dt><dd className="mt-1 leading-6">{dateLabel(result.issued_on)}</dd></div></dl><p className="mt-8 border-t border-[#d9d6ce] pt-5 text-xs leading-5 text-[#66716a]">This public result displays only certificate fields intended for verification. It does not expose the holder’s email, phone number, or application record.</p></div>}
      </div>
    </div>
  );
}
