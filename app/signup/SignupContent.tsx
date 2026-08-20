"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User, Mail, Lock, ArrowRight, AlertCircle, Users, Briefcase } from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function SignupContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"worker" | "volunteer">("volunteer");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (role === 'volunteer') {
        const volunteerResponse = await fetch('/api/volunteer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            interest: 'General Support',
            message: 'Volunteer account signup — please review my application for opportunities with HMSI.',
          }),
        });
        const volunteerResult = await volunteerResponse.json();
        if (!volunteerResponse.ok) throw new Error(volunteerResult.error || 'We could not submit your volunteer application.');
      }

      const success = await signup(name, email, password, role);
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
          <Link href="/" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e1ad45] text-2xl font-black text-[#17221e] mb-6">
            H
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-[#17221e]">Join the movement</h1>
          <p className="mt-2 text-[#66716a]">Create your HMSI account</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_24px_70px_rgba(23,34,30,0.08)] border border-[#d9d6ce]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("volunteer")}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  role === "volunteer"
                    ? "border-[#1e5b49] bg-[#e9f0e9] text-[#1e5b49]"
                    : "border-[#d9d6ce] bg-white text-[#66716a] hover:border-[#1e5b49]/50"
                }`}
              >
                <Users size={24} />
                <span className="text-xs font-black uppercase tracking-wider">Volunteer</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("worker")}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  role === "worker"
                    ? "border-[#1e5b49] bg-[#e9f0e9] text-[#1e5b49]"
                    : "border-[#d9d6ce] bg-white text-[#66716a] hover:border-[#1e5b49]/50"
                }`}
              >
                <Briefcase size={24} />
                <span className="text-xs font-black uppercase tracking-wider">Worker</span>
              </button>
            </div>

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
                required={role === 'volunteer'}
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
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
