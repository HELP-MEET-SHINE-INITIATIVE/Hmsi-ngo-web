"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function SignupContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const volunteerResponse = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          interest: 'General Support',
          message: 'Volunteer account signup — please review my application for opportunities with HMSI.',
          role: 'volunteer',
        }),
      });
      const volunteerResult = await volunteerResponse.json();
      if (!volunteerResponse.ok) throw new Error(volunteerResult.error || 'We could not submit your volunteer application.');

      const success = await signup(name, email, password, 'volunteer');
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Email already exists. Please use a different one.");
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
          <h1 className="text-3xl font-black tracking-tight text-[#17221e]">Join the movement</h1>
          <p className="mt-2 text-[#66716a]">Create your volunteer account</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_24px_70px_rgba(23,34,30,0.08)] border border-[#d9d6ce]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-[#d9d6ce] bg-[#e9f0e9] p-4 text-sm leading-6 text-[#1e5b49]">This signup is for volunteers. If you want to work with HMSI, submit a <Link href="/worker-apply" className="font-black underline">worker application for approval</Link> instead.</div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#17221e] mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 focus:bg-white focus:border-[#1e5b49] outline-none transition-all"
                  placeholder="Amina Yusuf"
                />
              </div>
            </div>

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
                  placeholder="amina@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#17221e] mb-2">Phone Number</label>
              <input
                type="tel"
                  required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-[#d9d6ce] bg-[#f6f4ef]/50 focus:bg-white focus:border-[#1e5b49] outline-none transition-all"
                placeholder="+234..."
              />
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
              {isLoading ? "Creating account..." : "Create Account"}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[#f6f4ef] text-center">
            <p className="text-sm text-[#66716a]">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[#1e5b49] hover:underline">
                Sign in
              </Link><span className="mx-2 text-[#d9d6ce]">·</span><Link href="/worker-apply" className="font-bold text-[#1e5b49] hover:underline">Apply as a worker</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
