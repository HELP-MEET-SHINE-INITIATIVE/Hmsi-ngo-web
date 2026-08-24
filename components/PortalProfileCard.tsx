"use client";
import { useEffect, useState } from 'react';
import { Camera, LogOut, Loader2 } from 'lucide-react';

type Profile = { name: string; email: string; role: string; profilePhotoUrl?: string | null };
export default function PortalProfileCard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { fetch('/api/portal/profile', { credentials: 'include', cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((payload) => setProfile(payload?.profile || null)).catch(() => {}); }, []);
  async function upload(file: File) { setBusy(true); setMessage(''); const form = new FormData(); form.set('file', file); const response = await fetch('/api/portal/profile', { method: 'POST', credentials: 'include', body: form }); const payload = await response.json().catch(() => ({})); if (response.ok) { setProfile(payload.profile); setMessage('Profile photo updated.'); } else setMessage(payload.error || 'Profile photo could not be updated.'); setBusy(false); }
  async function logout() { setBusy(true); await fetch('/api/portal/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {}); window.location.assign('/login'); }
  if (!profile) return null;
  return <section className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><div className="flex flex-wrap items-center gap-4"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#e9f0e9] text-xl font-black text-[#1e5b49]">{profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">{profile.role} portal</p><h2 className="mt-1 truncate text-xl font-black text-[#17221e]">{profile.name}</h2><p className="truncate text-sm text-[#66716a]">{profile.email}</p></div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">{busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} /></label><button type="button" disabled={busy} onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><LogOut size={14} /> Sign out</button></div></div>{message && <p role="status" className="mt-4 text-sm text-[#1e5b49]">{message}</p>}</section>;
}
