"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function LoginContent() {
  const [email, setEmail] = useState("");
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
      const success = await login(email, password);
      if (success) {
        const response = await fetch('/api/portal/profile', { credentials: 'include' });
        const profile = response.ok ? (await response.json()).profile : null;
        router.push(profile?.role === 'worker' ? '/worker-dashboard' : profile?.role === 'member' ? '/member-room' : '/dashboard');
      } else {
        setError("Invalid email or password. Please try again.");
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
          <p className="mt-2 text-[#66716a]">Sign in to your HMSI volunteer or approved worker portal</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_24px_70px_rgba(23,34,30,0.08)] border border-[#d9d6ce]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#17221e] mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 focus:bg-white focus:border-[#1e5b49] outline-none transition-all"
                  placeholder="worker@hmsi.org.ng"
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
            <p className="text-sm text-[#66716a]">
              Volunteer? <Link href="/signup" className="font-bold text-[#1e5b49] hover:underline">Create an account</Link><span className="mx-2 text-[#d9d6ce]">·</span>Worker? <Link href="/worker-apply" className="font-bold text-[#1e5b49] hover:underline">Apply for approval</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
