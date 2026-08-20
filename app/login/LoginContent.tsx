"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { loadData } from "../../lib/data";

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
        const signedInUser = loadData().users.find((candidate: any) => candidate.email === email);
        router.push(signedInUser?.role === 'worker' ? '/worker-dashboard' : '/dashboard');
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
          <Link href="/" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e1ad45] text-2xl font-black text-[#17221e] mb-6">
            H
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-[#17221e]">Welcome back</h1>
          <p className="mt-2 text-[#66716a]">Sign in to your HMSI portal</p>
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
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-bold text-[#1e5b49] hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
