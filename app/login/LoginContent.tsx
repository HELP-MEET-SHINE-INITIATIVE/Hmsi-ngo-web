"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, ArrowRight, AlertCircle, BriefcaseBusiness, HeartHandshake, IdCard } from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function LoginContent() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(identifier, password);
      if ('error' in result) {
        setError(result.error);
      } else {
        router.push('/portal/my-tasks');
      }
    } catch (err) {
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f4ef] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="mb-6 inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[#272178] shadow-sm" aria-label="HMSI home"><Image src="/logo.png" alt="HMSI logo" width={56} height={56} className="h-full w-full object-cover" /></Link>
          <h1 className="text-3xl font-black tracking-tight text-[#17221e]">Welcome back</h1>
          <p className="mt-2 text-[#66716a]">Sign in to your active HMSI worker, volunteer, or member portal</p>
        </div>

        <section aria-labelledby="portal-role-guide" className="mb-6 border border-[#d9d6ce] bg-[#eef3ed] p-5">
          <div className="flex items-center gap-2"><IdCard size={18} className="text-[#1e5b49]" /><h2 id="portal-role-guide" className="text-sm font-black text-[#17221e]">Which portal is yours?</h2></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div><BriefcaseBusiness size={17} className="text-[#1e5b49]" /><p className="mt-1 text-xs font-black text-[#17221e]">Worker</p><p className="mt-1 text-xs leading-5 text-[#66716a]">Approved and active workers</p></div>
            <div><HeartHandshake size={17} className="text-[#1e5b49]" /><p className="mt-1 text-xs font-black text-[#17221e]">Volunteer</p><p className="mt-1 text-xs leading-5 text-[#66716a]">Approved active volunteers</p></div>
            <div><IdCard size={17} className="text-[#1e5b49]" /><p className="mt-1 text-xs font-black text-[#17221e]">Member</p><p className="mt-1 text-xs leading-5 text-[#66716a]">Active HMSI members</p></div>
          </div>
          <p className="mt-4 border-t border-[#d9d6ce] pt-3 text-xs leading-5 text-[#66716a]">Use the same secure sign-in form below. HMSI verifies your approved role on the server and opens only the matching portal.</p>
        </section>

        <div className="bg-white rounded-3xl p-8 shadow-[0_24px_70px_rgba(23,34,30,0.08)] border border-[#d9d6ce]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#17221e] mb-2">Email address or HMSI ID</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 focus:bg-white focus:border-[#1e5b49] outline-none transition-all"
                  autoComplete="username"
                  placeholder="you@example.com or HMSI-W-2026-XXXXXXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#17221e] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 focus:bg-white focus:border-[#1e5b49] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="mt-2 text-right"><Link href="/forgot-password" className="text-xs font-bold text-[#1e5b49] hover:underline">Forgot password?</Link></div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-full bg-[#17221e] text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-[#1e5b49] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[#f6f4ef] text-center">
            <p className="text-sm text-[#66716a]">First access with an HMSI ID card? <Link href="/portal-activate" className="font-bold text-[#1e5b49] hover:underline">Activate your portal access</Link></p>
            <p className="mt-3 text-sm text-[#66716a]">New volunteer? <Link href="/signup" className="font-bold text-[#1e5b49] hover:underline">Apply</Link><span className="mx-2 text-[#d9d6ce]">·</span>New worker? <Link href="/worker-apply" className="font-bold text-[#1e5b49] hover:underline">Apply</Link><span className="mx-2 text-[#d9d6ce]">·</span>New member? <Link href="/member-apply" className="font-bold text-[#1e5b49] hover:underline">Apply</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
}
