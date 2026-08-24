'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleDollarSign, FileText, Loader2, MailCheck, RefreshCw, Send, ShieldCheck } from 'lucide-react';

type Donation = {
  id: string;
  fundraiser_id: string | null;
  donor_name: string;
  donor_email: string;
  is_anonymous: boolean;
  amount_ngn: number | null;
  amount_major: number | null;
  currency: string | null;
  channel: string | null;
  payment_provider: string | null;
  payment_method: string | null;
  campaign_name_snapshot: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
  acknowledgement_status: string | null;
  acknowledgement_updated_at: string | null;
  payment_reference_suffix: string;
};

type LedgerResponse = { donations?: Donation[]; pagination?: { page: number; limit: number; total: number; totalPages: number }; error?: string };
type Fundraiser = { id: string; title: string };
const pageSize = 25;

function formatAmount(donation: Pick<Donation, 'currency' | 'amount_major' | 'amount_ngn'>) {
  const currency = donation.currency || 'NGN';
  const amount = Number(donation.amount_major ?? donation.amount_ngn ?? 0);
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-NG', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function acknowledgementLabel(status: string | null) {
  const labels: Record<string, string> = { not_started: 'Pending', queued: 'Queued', sent: 'Sent', delivered: 'Delivered', bounced: 'Bounced', failed: 'Failed', suppressed: 'Suppressed' };
  return labels[status || 'not_started'] || 'Pending';
}

function acknowledgementClass(status: string | null) {
  if (status === 'delivered') return 'bg-[#e9f0e9] text-[#1e5b49]';
  if (status === 'bounced' || status === 'failed' || status === 'suppressed') return 'bg-red-50 text-red-800';
  return 'bg-[#f6f4ef] text-[#66716a]';
}

function donationStatusClass(status: string) {
  if (status === 'success') return 'bg-[#e9f0e9] text-[#1e5b49]';
  if (status === 'manual_verification') return 'bg-[#fff8e8] text-[#7a5b16]';
  return 'bg-[#f6f4ef] text-[#66716a]';
}

export default function DonationsLedger({ standalone = false }: { standalone?: boolean }) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Donation | null>(null);
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ donorName: '', donorEmail: '', donorPhone: '', amount: '', currency: 'NGN', fundraiserId: '', transactionReference: '', paymentMethod: 'bank_transfer' });

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/donations?page=${page}&limit=${pageSize}&status=${status}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({})) as LedgerResponse;
      if (!response.ok) throw new Error(result.error || 'Unable to load donation records.');
      setDonations(result.donations || []);
      setTotal(result.pagination?.total || 0);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load donation records.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const interval = window.setInterval(() => { void load(true); }, 20000); return () => window.clearInterval(interval); }, [load]);
  useEffect(() => { fetch('/api/fundraisers', { cache: 'no-store' }).then((response) => response.json()).then((result) => setFundraisers(Array.isArray(result.fundraisers) ? result.fundraisers : [])).catch(() => undefined); }, []);
  useEffect(() => { setPage(1); }, [status]);

  async function sendAction(url: string, options: RequestInit, success: string) {
    setNotice('');
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'The administration action could not be completed.');
    setNotice(success);
    await load(true);
    return result;
  }

  async function resend(donation: Donation) {
    try { await sendAction(`/api/admin/donations/${donation.id}/acknowledgement`, { method: 'POST' }, 'Acknowledgement was submitted to the official delivery service.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Acknowledgement could not be resent.'); }
  }

  async function verifyManual(donation: Donation) {
    try { await sendAction('/api/admin/donations/record', { method: 'PATCH', body: JSON.stringify({ donationId: donation.id, action: 'verify_manual' }) }, 'Manual donation was verified. Campaign progress and acknowledgement processing have been triggered.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Manual donation could not be verified.'); }
  }

  async function submitManual(event: React.FormEvent) {
    event.preventDefault();
    try {
      await sendAction('/api/admin/donations/record', { method: 'POST', body: JSON.stringify({ ...manual, amount: Number(manual.amount), fundraiserId: manual.fundraiserId || undefined }) }, 'Manual donation was recorded for verification. No campaign total or thank-you is sent until an administrator verifies it.');
      setManual({ donorName: '', donorEmail: '', donorPhone: '', amount: '', currency: 'NGN', fundraiserId: '', transactionReference: '', paymentMethod: 'bank_transfer' });
      setManualOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Manual donation could not be recorded.'); }
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 sm:flex-row sm:items-end">
      <div><div className="flex items-center gap-3 text-[#1e5b49]"><CircleDollarSign size={22} /><p className="text-xs font-black uppercase tracking-widest">Private finance administration</p></div><h2 className="mt-3 text-2xl font-black">Donation tracking ledger</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">Successful provider payments, pending records, and manual donations awaiting verification are shown only to authenticated HMSI administrators. Refreshes every 20 seconds while this screen is open.</p></div>
      <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-full border border-[#d9d6ce] px-4 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49]"><RefreshCw size={15} />Refresh</button><button type="button" onClick={() => setManualOpen((current) => !current)} className="rounded-full bg-[#1e5b49] px-4 py-3 text-xs font-black uppercase tracking-widest text-white">Record manual donation</button><div className="rounded-2xl bg-[#e9f0e9] px-5 py-3 text-right"><p className="text-2xl font-black text-[#1e5b49]">{total}</p><p className="text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">Ledger record{total === 1 ? '' : 's'}</p></div></div>
    </div>
    <div className="rounded-2xl border border-[#e1ad45]/40 bg-[#fff8e8] p-4 text-sm leading-6 text-[#7a5b16]"><ShieldCheck size={17} className="mr-2 inline" />Only a server-verified successful payment or an explicit administrator verification can update a campaign total or initiate a thank-you. Manual entries stay in <strong>Manual verification</strong> until that second action.</div>
    {notice ? <p role="status" className="rounded-2xl border border-[#b7d7c0] bg-[#eef7f0] p-4 text-sm text-[#1e5b49]">{notice}</p> : null}
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
    {manualOpen ? <form onSubmit={submitManual} className="grid gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 md:grid-cols-2"><div className="md:col-span-2"><h3 className="text-lg font-black">Record manual donation</h3><p className="mt-1 text-sm text-[#66716a]">Use a unique bank-transfer, cash, or offline reference. This creates a verification-pending record only.</p></div><label className="text-sm font-bold">Donor name<input required minLength={2} value={manual.donorName} onChange={(event) => setManual({ ...manual, donorName: event.target.value })} className="mt-1 w-full rounded-xl border border-[#d9d6ce] p-3" /></label><label className="text-sm font-bold">Donor email<input required type="email" value={manual.donorEmail} onChange={(event) => setManual({ ...manual, donorEmail: event.target.value })} className="mt-1 w-full rounded-xl border border-[#d9d6ce] p-3" /></label><label className="text-sm font-bold">Donor phone (optional)<input value={manual.donorPhone} onChange={(event) => setManual({ ...manual, donorPhone: event.target.value })} className="mt-1 w-full rounded-xl border border-[#d9d6ce] p-3" /></label><label className="text-sm font-bold">Transaction reference<input required minLength={6} value={manual.transactionReference} onChange={(event) => setManual({ ...manual, transactionReference: event.target.value })} className="mt-1 w-full rounded-xl border border-[#d9d6ce] p-3" /></label><label className="text-sm font-bold">Amount<input required min="0.01" step="0.01" type="number" value={manual.amount} onChange={(event) => setManual({ ...manual, amount: event.target.value })} className="mt-1 w-full rounded-xl border border-[#d9d6ce] p-3" /></label><label className="text-sm font-bold">Currency<select value={manual.currency} onChange={(event) => setManual({ ...manual, currency: event.target.value })} className="mt-1 w-full rounded-xl border border-[#d9d6ce] p-3"><option value="NGN">NGN</option><option value="USD">USD</option></select></label><label className="text-sm font-bold">Payment method<select value={manual.paymentMethod} onChange={(event) => setManual({ ...manual, paymentMethod: event.target.value })} className="mt-1 w-full rounded-xl border border-[#d9d6ce] p-3"><option value="bank_transfer">Bank transfer</option><option value="manual">Cash/manual</option><option value="ussd">USSD</option></select></label><label className="text-sm font-bold">Campaign (optional)<select value={manual.fundraiserId} onChange={(event) => setManual({ ...manual, fundraiserId: event.target.value })} className="mt-1 w-full rounded-xl border border-[#d9d6ce] p-3"><option value="">General HMSI support</option>{fundraisers.map((fundraiser) => <option key={fundraiser.id} value={fundraiser.id}>{fundraiser.title}</option>)}</select></label><div className="flex items-end gap-3"><button type="submit" className="rounded-full bg-[#17221e] px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Save pending record</button><button type="button" onClick={() => setManualOpen(false)} className="rounded-full border border-[#d9d6ce] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#66716a]">Cancel</button></div></form> : null}
    {selected ? <section className="rounded-3xl border border-[#1e5b49]/30 bg-[#f4f8f5] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#1e5b49]">Donation audit card</p><h3 className="mt-2 text-xl font-black">Receipt and processing details</h3></div><button type="button" onClick={() => setSelected(null)} className="text-sm font-bold text-[#1e5b49]">Close</button></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-black uppercase tracking-widest text-[#66716a]">Donor</dt><dd className="mt-1 font-bold">{selected.is_anonymous ? 'Anonymous donor' : selected.donor_name}</dd><dd className="text-[#66716a]">{selected.donor_email}</dd></div><div><dt className="text-xs font-black uppercase tracking-widest text-[#66716a]">Receipt summary</dt><dd className="mt-1 font-bold">{formatAmount(selected)} · {selected.currency}</dd><dd className="text-[#66716a]">{selected.payment_reference_suffix} · {selected.campaign_name_snapshot || 'General HMSI support'}</dd></div><div><dt className="text-xs font-black uppercase tracking-widest text-[#66716a]">Payment</dt><dd className="mt-1">{selected.payment_provider || 'Not recorded'} · {selected.payment_method || selected.channel || 'Not recorded'}</dd></div><div><dt className="text-xs font-black uppercase tracking-widest text-[#66716a]">Acknowledgement</dt><dd className="mt-1">{acknowledgementLabel(selected.acknowledgement_status)}{selected.acknowledgement_updated_at ? ` · ${new Date(selected.acknowledgement_updated_at).toLocaleString('en-NG')}` : ''}</dd></div></dl></section> : null}
    <section className="overflow-hidden rounded-3xl border border-[#d9d6ce] bg-white"><div className="flex flex-col justify-between gap-3 border-b border-[#d9d6ce] px-6 py-5 sm:flex-row sm:items-center"><div><h3 className="text-xl font-black">Processed donations</h3><p className="mt-1 text-sm text-[#66716a]">Page {page} of {totalPages}. Records are ordered from newest to oldest.</p></div><div className="flex items-center gap-3"><select aria-label="Filter donation records" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-full border border-[#d9d6ce] bg-white px-4 py-2 text-xs font-bold text-[#1e5b49]"><option value="all">All tracked</option><option value="success">Success</option><option value="pending">Pending</option><option value="manual_verification">Manual verification</option></select>{loading ? <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#66716a]"><Loader2 size={15} className="animate-spin" /> Loading</span> : null}</div></div>
      {!loading && donations.length === 0 ? <div className="p-10 text-center"><p className="font-black">No tracked donations match this view.</p><p className="mt-2 text-sm leading-6 text-[#66716a]">A verified provider payment or an administrator-recorded manual donation will appear here without exposing payment-card data.</p></div> : <div className="overflow-x-auto"><table className="min-w-[1260px] w-full text-left text-sm"><thead className="bg-[#f6f4ef] text-[10px] font-black uppercase tracking-widest text-[#66716a]"><tr><th className="px-6 py-4">Donor</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Campaign</th><th className="px-6 py-4">Method</th><th className="px-6 py-4">Donation</th><th className="px-6 py-4">Thank-you</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y divide-[#eeeae2]">{donations.map((donation) => <tr key={donation.id}><td className="px-6 py-4"><p className="font-black">{donation.is_anonymous ? 'Anonymous donor' : donation.donor_name}</p><p className="mt-1 text-xs text-[#66716a]">{donation.donor_email}</p></td><td className="whitespace-nowrap px-6 py-4 font-black text-[#1e5b49]">{formatAmount(donation)}</td><td className="px-6 py-4 text-xs font-bold text-[#66716a]">{donation.campaign_name_snapshot || 'General support'}</td><td className="px-6 py-4 text-xs font-bold text-[#66716a]">{donation.payment_provider || 'Not recorded'} · {donation.payment_method || donation.channel || 'Not recorded'}</td><td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${donationStatusClass(donation.status)}`}>{donation.status === 'manual_verification' ? 'Manual verification' : donation.status}</span></td><td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${acknowledgementClass(donation.acknowledgement_status)}`}>{acknowledgementLabel(donation.acknowledgement_status)}</span></td><td className="px-6 py-4"><div className="flex gap-2"><button type="button" onClick={() => setSelected(donation)} className="inline-flex items-center gap-1 rounded-full border border-[#d9d6ce] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]"><FileText size={13} />Details</button>{donation.status === 'manual_verification' ? <button type="button" onClick={() => void verifyManual(donation)} className="rounded-full bg-[#1e5b49] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white">Verify</button> : <button type="button" onClick={() => void resend(donation)} disabled={donation.status !== 'success'} className="inline-flex items-center gap-1 rounded-full border border-[#d9d6ce] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49] disabled:cursor-not-allowed disabled:opacity-40"><Send size={13} />Resend</button>}</div></td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between border-t border-[#d9d6ce] px-6 py-4"><p className="text-xs font-bold text-[#66716a]">{total} tracked donation{total === 1 ? '' : 's'} total</p><div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49] disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button type="button" disabled={loading || page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div>
    </section>
    {!standalone ? <Link href="/admin/donations" className="inline-flex items-center gap-2 text-sm font-black text-[#1e5b49] underline underline-offset-4"><MailCheck size={16} />Open the full donations workspace</Link> : null}
  </div>;
}
