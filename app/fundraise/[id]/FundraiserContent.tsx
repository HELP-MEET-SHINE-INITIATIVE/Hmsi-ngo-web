"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "../../../components/Footer";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { 
  ChevronLeft, 
  Share2, 
  ShieldCheck, 
  Heart, 
  Users, 
  Calendar,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

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

export default function FundraiserContent() {
  const params = useParams();
  const id = params.id as string;
  
  const [fundraiser, setFundraiser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donationAmount, setDonationAmount] = useState("5000");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [recordingWarning, setRecordingWarning] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/fundraisers/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Fundraiser is temporarily unavailable.");
        if (isMounted) setFundraiser(result.fundraiser);
      })
      .catch((fetchError) => {
        if (isMounted) setLoadError(fetchError instanceof Error ? fetchError.message : "Fundraiser is temporarily unavailable.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    setIsFollowing(window.localStorage.getItem(`hmsi-follow-fundraiser-${id}`) === "true");
  }, [id]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: fundraiser?.title || "HMSI fundraiser",
      text: `Support this verified HMSI cause: ${fundraiser?.title || "HMSI fundraiser"}`,
      url: shareUrl,
    };
    setShareStatus("");
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Thanks for sharing this cause.");
        return;
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("Fundraiser link copied. You can paste it anywhere.");
    } catch {
      setShareStatus(`Copy this fundraiser link: ${shareUrl}`);
    }
  };

  const handleFollow = () => {
    const nextValue = !isFollowing;
    setIsFollowing(nextValue);
    window.localStorage.setItem(`hmsi-follow-fundraiser-${id}`, String(nextValue));
    setShareStatus(nextValue ? "You are now following this fundraiser on this device." : "You stopped following this fundraiser on this device.");
  };

  const handleDonate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY;
    if (!publicKey) {
      setError("Paystack is not configured. Please add NEXT_PUBLIC_PAYSTACK_KEY.");
      return;
    }

    if (!donorName || !donorEmail || !donationAmount) {
      setError("Please fill in all fields.");
      return;
    }

    if (!window.PaystackPop) {
      setError("Paystack is still loading. Please try again in a moment.");
      return;
    }

    const amountInKobo = Math.round(Number(donationAmount) * 100);
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
          {
            display_name: "Fundraiser ID",
            variable_name: "fundraiser_id",
            value: id,
          }
        ],
      },
      onSuccess: async (response) => {
        const reference = response?.reference ?? "";
        setRecordingWarning("");
        try {
          const ledgerResponse = await fetch("/api/donations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              donor_name: donorName,
              donor_email: donorEmail,
              amount: Number(donationAmount),
              paystack_reference: reference,
              fundraiser_id: id,
            }),
          });
          const ledgerResult = await ledgerResponse.json().catch(() => ({}));
          if (!ledgerResponse.ok) throw new Error(ledgerResult.error || "The donation ledger could not be updated.");
          if (ledgerResult.fundraiserTotalUpdated === false) setRecordingWarning("Your payment was recorded, but this fundraiser’s displayed total is still syncing.");
        } catch (ledgerError) {
          setRecordingWarning(ledgerError instanceof Error ? ledgerError.message : "Your payment succeeded, but the HMSI ledger is still syncing.");
        }
        setIsSubmitted(true);
      },
      onCancel: () => {
        setError("Payment was cancelled.");
      },
      onError: (err) => {
        setError(err.message || "An error occurred during payment.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e5b49]"></div>
      </div>
    );
  }

  if (!fundraiser) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black mb-4">{loadError || "Fundraiser not found"}</h1>
        <Link href="/fundraise" className="text-[#1e5b49] font-bold hover:underline">Back to listing</Link>
      </div>
    );
  }

  const progress = Math.min(100, Math.round((fundraiser.raisedAmount / fundraiser.targetAmount) * 100));

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <Link href="/fundraise" className="inline-flex items-center gap-2 text-sm font-bold text-[#66716a] hover:text-[#1e5b49] mb-8 transition-colors">
          <ChevronLeft size={18} /> Back to listing
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
          {/* Left: Content */}
          <section className="space-y-10">
            <div className="relative h-[500px] rounded-[40px] overflow-hidden shadow-xl">
              <Image src={fundraiser.image} alt={fundraiser.title} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
              <div className="absolute top-6 left-6">
                <span className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-md text-xs font-black uppercase tracking-widest text-[#1e5b49]">
                  {fundraiser.category}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">{fundraiser.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-[#66716a] uppercase tracking-widest">
                <span className="flex items-center gap-2"><Calendar size={18} className="text-[#e1ad45]" /> {new Date(fundraiser.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-2"><Users size={18} className="text-[#e1ad45]" /> 124 Donors</span>
                <span className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#e1ad45]" /> Verified Request</span>
              </div>
              <div className="prose prose-lg max-w-none text-[#17221e] leading-relaxed">
                <p>{fundraiser.description}</p>
                <p className="mt-6">HMSI has verified this request and will oversee the disbursement of funds to ensure they are used strictly for the stated purpose. We provide regular updates to all donors on the progress of the intervention.</p>
              </div>
            </div>

            <div className="pt-10 border-t border-[#d9d6ce]">
              <h3 className="text-xl font-black mb-6">Updates</h3>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-[#e9f0e9] flex items-center justify-center text-[#1e5b49] flex-shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-[#1e5b49] mb-1">Verification Complete</p>
                    <p className="text-xs text-[#66716a] mb-3 font-bold uppercase">{new Date(fundraiser.createdAt).toLocaleDateString()}</p>
                    <p className="text-[#66716a]">The HMSI field team has visited the family and confirmed the medical requirements with the hospital. The fundraiser is now officially verified.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: Donation Card */}
          <aside className="space-y-6">
            <div className="sticky top-28 bg-white rounded-[40px] border border-[#d9d6ce] shadow-xl overflow-hidden">
              <div className="p-8 md:p-10">
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-3xl font-black text-[#17221e]">₦{fundraiser.raisedAmount.toLocaleString()}</p>
                      <p className="text-xs font-bold text-[#66716a] uppercase tracking-widest mt-1">Raised of ₦{fundraiser.targetAmount.toLocaleString()}</p>
                    </div>
                    <p className="text-xl font-black text-[#1e5b49]">{progress}%</p>
                  </div>
                  <div className="h-3 w-full bg-[#f6f4ef] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1e5b49] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {isSubmitted ? (
                  <div className="bg-[#e9f0e9] rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#1e5b49] mx-auto mb-4">
                      <Heart size={32} fill="currentColor" />
                    </div>
                    <h3 className="text-xl font-black mb-2">Thank You!</h3>
                    <p className="text-sm text-[#66716a] mb-6">Your donation has been received and will make a direct impact.</p>
                    {recordingWarning && <p className="mb-6 rounded-2xl border border-[#e1ad45]/50 bg-[#fff8e8] p-4 text-left text-xs leading-5 text-[#7a5b16]">{recordingWarning} Keep your Paystack reference and contact <a className="font-black underline" href="mailto:support@hmsi.org.ng">support@hmsi.org.ng</a> if the admin ledger does not update.</p>}
                    <button onClick={() => setIsSubmitted(false)} className="text-xs font-black uppercase tracking-widest text-[#1e5b49] hover:underline">Donate again</button>
                  </div>
                ) : (
                  <form onSubmit={handleDonate} className="space-y-6">
                    {error && (
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs">
                        <AlertCircle size={16} />
                        {error}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#66716a] mb-2">Donation Amount (₦)</label>
                      <input 
                        type="number" 
                        required
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none text-sm font-bold"
                      />
                    </div>

                    <div className="space-y-4">
                      <input 
                        type="text" 
                        required
                        placeholder="Your Name"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none text-sm"
                      />
                      <input 
                        type="email" 
                        required
                        placeholder="Email Address"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none text-sm"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 rounded-full bg-[#17221e] text-white font-black uppercase tracking-widest text-sm hover:bg-[#1e5b49] transition-all shadow-lg"
                    >
                      Donate Now
                    </button>
                  </form>
                )}

                <div className="mt-8 border-t border-[#f6f4ef] pt-8">
                  <div className="flex items-center justify-center gap-6">
                    <button type="button" onClick={handleShare} aria-label="Share this fundraiser" className="flex flex-col items-center gap-2 text-[#66716a] transition-colors hover:text-[#1e5b49] focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2">
                      <div className="rounded-full bg-[#f6f4ef] p-3"><Share2 size={20} aria-hidden="true" /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Share</span>
                    </button>
                    <button type="button" onClick={handleFollow} aria-pressed={isFollowing} aria-label={isFollowing ? "Unfollow this fundraiser" : "Follow this fundraiser"} className={`flex flex-col items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2 ${isFollowing ? "text-[#1e5b49]" : "text-[#66716a] hover:text-[#1e5b49]"}`}>
                      <div className="rounded-full bg-[#f6f4ef] p-3"><Heart size={20} fill={isFollowing ? "currentColor" : "none"} aria-hidden="true" /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">{isFollowing ? "Following" : "Follow"}</span>
                    </button>
                  </div>
                  {shareStatus && <p className="mt-4 text-center text-xs font-bold leading-5 text-[#1e5b49]" role="status" aria-live="polite">{shareStatus}</p>}
                </div>
              </div>
              <div className="bg-[#f6f4ef] p-6 text-center">
                <p className="text-[10px] font-bold text-[#66716a] uppercase tracking-widest flex items-center justify-center gap-2">
                  <ShieldCheck size={14} className="text-[#1e5b49]" /> Secure Paystack Payment
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
