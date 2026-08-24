'use client';

import { useEffect, useState } from 'react';
import { CircleDollarSign, Loader2, ShieldCheck } from 'lucide-react';

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
  paid_at: string | null;
  created_at: string;
  payment_reference_suffix: string;
};

type LedgerResponse = {
  donations?: Donation[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  error?: string;
};

const pageSize = 25;

function formatAmount(donation: Donation) {
  const currency = donation.currency || 'NGN';
  const amount = Number(donation.amount_major ?? donation.amount_ngn ?? 0);
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-NG', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export default function DonationsLedger() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/admin/donations?page=${page}&limit=${pageSize}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as LedgerResponse;
        if (!response.ok) throw new Error(result.error || 'Unable to load verified donation records.');
        if (!active) return;
        setDonations(result.donations || []);
        setTotal(result.pagination?.total || 0);
        setTotalPages(result.pagination?.totalPages || 1);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load verified donation records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 sm:flex-row sm:items-end">
      <div><div className="flex items-center gap-3 text-[#1e5b49]"><CircleDollarSign size={22} /><p className="text-xs font-black uppercase tracking-widest">Private finance administration</p></div><h2 className="mt-3 text-2xl font-black">Verified donations ledger</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66716a]">Only successful Paystack payments appear here. Donor contact details remain visible only to authenticated HMSI administrators; payment references are reduced to their final six characters.</p></div>
      <div className="rounded-2xl bg-[#e9f0e9] px-5 py-3 text-right"><p className="text-2xl font-black text-[#1e5b49]">{total}</p><p className="text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">Verified payment{total === 1 ? '' : 's'}</p></div>
    </div>
    <div className="rounded-2xl border border-[#e1ad45]/40 bg-[#fff8e8] p-4 text-sm leading-6 text-[#7a5b16]"><ShieldCheck size={17} className="mr-2 inline" />A verified-donation acknowledgement is sent automatically only after the server verifies the Paystack reference, paid status, currency, and amount. This ledger does not resend messages or expose payment-card information.</div>
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
    <section className="overflow-hidden rounded-3xl border border-[#d9d6ce] bg-white">
      <div className="flex flex-col justify-between gap-3 border-b border-[#d9d6ce] px-6 py-5 sm:flex-row sm:items-center"><div><h3 className="text-xl font-black">Successful payments</h3><p className="mt-1 text-sm text-[#66716a]">Page {page} of {totalPages}. Records are ordered from newest to oldest.</p></div>{loading ? <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#66716a]"><Loader2 size={15} className="animate-spin" /> Loading</span> : null}</div>
      {!loading && donations.length === 0 ? <div className="p-10 text-center"><p className="font-black">No verified donations have been recorded yet.</p><p className="mt-2 text-sm leading-6 text-[#66716a]">A donor acknowledgement cannot be sent until Paystack confirms a successful payment and HMSI records it in this protected ledger.</p></div> : <div className="overflow-x-auto"><table className="min-w-[880px] w-full text-left text-sm"><thead className="bg-[#f6f4ef] text-[10px] font-black uppercase tracking-widest text-[#66716a]"><tr><th className="px-6 py-4">Donor</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Channel</th><th className="px-6 py-4">Verified date</th><th className="px-6 py-4">Reference</th><th className="px-6 py-4">Status</th></tr></thead><tbody className="divide-y divide-[#eeeae2]">{donations.map((donation) => <tr key={donation.id}><td className="px-6 py-4"><p className="font-black">{donation.is_anonymous ? 'Anonymous donor' : donation.donor_name}</p><p className="mt-1 text-xs text-[#66716a]">{donation.donor_email}</p></td><td className="whitespace-nowrap px-6 py-4 font-black text-[#1e5b49]">{formatAmount(donation)}</td><td className="px-6 py-4 text-xs font-bold text-[#66716a]">{donation.channel || 'Not reported'}</td><td className="whitespace-nowrap px-6 py-4 text-xs font-bold text-[#66716a]">{new Date(donation.paid_at || donation.created_at).toLocaleString('en-NG')}</td><td className="px-6 py-4 font-mono text-xs text-[#66716a]">{donation.payment_reference_suffix}</td><td className="px-6 py-4"><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">Verified</span></td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between border-t border-[#d9d6ce] px-6 py-4"><p className="text-xs font-bold text-[#66716a]">{total} verified payment{total === 1 ? '' : 's'} total</p><div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49] disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button type="button" disabled={loading || page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div>
    </section>
  </div>;
}
