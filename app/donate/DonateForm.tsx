"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useState } from "react";
import { Check, HeartHandshake, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";

type PaymentResponse = {
  reference?: string;
  status?: string;
  message?: string;
};

type PaystackTransactionOptions = {
  key: string;
  email: string;
  amount: number;
  currency: string;
  metadata: { custom_fields: Array<{ display_name: string; variable_name: string; value: string }> };
  onSuccess: (response?: PaymentResponse) => void;
  onCancel: () => void;
  onError: (error: { message?: string }) => void;
};

type PaystackPopup = {
  newTransaction: (options: PaystackTransactionOptions) => void;
};

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopup;
  }
}

const presetAmounts = [5000, 10000, 25000, 50000];
const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

export default function DonateForm() {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY ?? "";
  const [selectedAmount, setSelectedAmount] = useState<number | null>(25000);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");

  const amountInNaira = selectedAmount ?? Number(customAmount);
  const amountInKobo = Math.round(amountInNaira * 100);

  const handleSuccess = (response?: PaymentResponse) => {
    setPaymentReference(response?.reference ?? "");
    setIsSubmitted(true);
    setError("");
  };

  const handleClose = () => {
    setError("Payment was closed before completion. Your details are still here whenever you are ready.");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!publicKey) {
      setError("Paystack is not configured yet. Please add NEXT_PUBLIC_PAYSTACK_KEY in Vercel.");
      return;
    }

    if (!Number.isFinite(amountInNaira) || amountInNaira < 100) {
      setError("Please choose or enter a donation of at least ₦100.");
      return;
    }

    if (!donorName.trim() || !donorEmail.trim()) {
      setError("Please enter your name and email address before continuing.");
      return;
    }

    if (!window.PaystackPop) {
      setError("Paystack is still loading. Please wait a moment and try again.");
      return;
    }

    const popup = new window.PaystackPop();
    popup.newTransaction({
      key: publicKey,
      email: donorEmail,
      amount: amountInKobo,
      currency: "NGN",
      metadata: {
        custom_fields: [
          {
            display_name: "Donor Name",
            variable_name: "donor_name",
            value: donorName,
          },
        ],
      },
      onSuccess: handleSuccess,
      onCancel: handleClose,
      onError: (paymentError) => setError(paymentError.message ?? "Paystack could not open the payment window. Please try again."),
    });
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
        <header className="border-b border-[#d9d6ce] bg-[#f6f4ef]">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
            <Link href="/" className="flex items-center gap-3" aria-label="HMSI home"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e1ad45] text-xl font-black">H</span><span className="text-xs font-black uppercase tracking-[0.18em]">HMSI</span></Link>
            <Link href="/" className="text-sm font-bold text-[#1e5b49] hover:underline">Back to home</Link>
          </div>
        </header>
        <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-2xl items-center justify-center px-5 py-20 text-center sm:px-8">
          <div className="w-full rounded-3xl bg-white p-8 shadow-[0_24px_70px_rgba(23,34,30,0.1)] sm:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e9f0e9] text-[#1e5b49]"><Check size={38} strokeWidth={2.5} /></div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">Thank you for standing with us</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Your generosity is already moving hope forward.</h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-[#66716a]">We appreciate your gift, {donorName.split(" ")[0] || "friend"}. Your support helps communities access practical relief, opportunity and a stronger tomorrow.</p>
            {paymentReference && <p className="mt-7 rounded-2xl bg-[#f6f4ef] px-4 py-3 text-xs font-semibold text-[#66716a]">Payment reference: <span className="font-black text-[#17221e]">{paymentReference}</span></p>}
            <Link href="/" className="mt-9 inline-flex rounded-full bg-[#17221e] px-7 py-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#1e5b49]">Return to HMSI</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
      <header className="border-b border-[#d9d6ce] bg-[#f6f4ef]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3" aria-label="HMSI home"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e1ad45] text-xl font-black">H</span><span className="text-xs font-black uppercase tracking-[0.18em]">Help-Meet Shine Initiative</span></Link>
          <Link href="/" className="text-sm font-bold text-[#1e5b49] hover:underline">Cancel</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-12 lg:py-24">
        <div className="max-w-xl">
          <p className="mb-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]"><span className="h-px w-10 bg-[#b56b3b]" /> Give with purpose</p>
          <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">Make room for <span className="text-[#1e5b49]">possibility.</span></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#66716a]">Your gift helps HMSI respond to urgent needs while supporting the skills, leadership and local solutions that make recovery last.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[{ icon: ShieldCheck, title: "Transparent", text: "Clear programme priorities" }, { icon: HeartHandshake, title: "Human", text: "Dignity in every response" }, { icon: Sparkles, title: "Local", text: "Communities lead the way" }].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-2xl border border-[#d9d6ce] bg-white/60 p-4"><Icon size={21} className="text-[#1e5b49]" /><p className="mt-4 text-sm font-black">{title}</p><p className="mt-1 text-xs leading-5 text-[#66716a]">{text}</p></div>)}
          </div>
        </div>

        <div className="rounded-3xl bg-[#17221e] p-6 text-white shadow-[0_24px_70px_rgba(23,34,30,0.16)] sm:p-10">
          <div className="flex items-start justify-between gap-6 border-b border-white/15 pb-7"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1ad45]">Secure Paystack giving</p><h2 className="mt-3 text-3xl font-black tracking-[-0.035em]">Choose your gift</h2></div><LockKeyhole className="mt-1 text-[#e1ad45]" size={25} /></div>
          <form onSubmit={handleSubmit} className="mt-8 space-y-7">
            <fieldset><legend className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-white/70">Donation amount</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{presetAmounts.map((amount) => <button key={amount} type="button" onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }} className={`rounded-xl border px-3 py-3 text-sm font-black transition ${selectedAmount === amount ? "border-[#e1ad45] bg-[#e1ad45] text-[#17221e]" : "border-white/20 bg-white/5 text-white hover:border-white/50"}`}>{formatNaira(amount)}</button>)}</div><div className={`mt-3 flex items-center rounded-xl border px-4 transition ${selectedAmount === null ? "border-[#e1ad45] bg-white/10" : "border-white/20 bg-white/5"}`}><span className="text-white/60">₦</span><input aria-label="Custom donation amount" type="number" min="100" step="100" value={customAmount} onChange={(event) => { setCustomAmount(event.target.value); setSelectedAmount(null); }} placeholder="Enter a custom amount" className="w-full bg-transparent px-3 py-3 text-sm font-bold outline-none placeholder:text-white/35" /></div></fieldset>
            <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="donor-name" className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-white/70">Your name</label><input id="donor-name" type="text" required value={donorName} onChange={(event) => setDonorName(event.target.value)} placeholder="e.g. Amina Yusuf" className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-white/35 focus:border-[#e1ad45]" /></div><div><label htmlFor="donor-email" className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-white/70">Email address</label><div className="flex items-center rounded-xl border border-white/20 bg-white/5 px-4 focus-within:border-[#e1ad45]"><Mail size={16} className="text-white/50" /><input id="donor-email" type="email" required value={donorEmail} onChange={(event) => setDonorEmail(event.target.value)} placeholder="you@example.com" className="w-full bg-transparent px-3 py-3 text-sm font-semibold outline-none placeholder:text-white/35" /></div></div></div>
            {error && <p role="alert" className="rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">{error}</p>}
            <div className="rounded-2xl bg-white/10 p-4"><div className="flex items-center justify-between text-sm"><span className="text-white/65">Your gift today</span><strong className="text-xl text-[#e1ad45]">{Number.isFinite(amountInNaira) && amountInNaira > 0 ? formatNaira(amountInNaira) : "Choose an amount"}</strong></div><p className="mt-2 text-xs leading-5 text-white/45">You will complete your donation securely in the Paystack popup. No payment details are stored by HMSI.</p></div>
            <button type="submit" className="w-full rounded-full bg-[#e1ad45] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-[#17221e] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#e1ad45] focus:ring-offset-2 focus:ring-offset-[#17221e]">Continue to Paystack <span aria-hidden="true">→</span></button>
          </form>
        </div>
      </section>

      <section className="border-t border-[#d9d6ce] bg-white"><div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-8 text-center sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:text-left"><p className="text-sm font-bold text-[#17221e]">Every contribution helps communities move from crisis to possibility.</p><p className="text-xs font-semibold text-[#66716a]">Payments processed securely by Paystack · NGN donations</p></div></section>
    </main>
  );
}
