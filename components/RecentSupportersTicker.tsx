'use client';

import { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';

type SupporterUpdate = { id: string; campaign: string; receivedAt: string | null };

export default function RecentSupportersTicker() {
  const [supporters, setSupporters] = useState<SupporterUpdate[]>([]);
  const [availability, setAvailability] = useState<'ready' | 'unavailable'>('unavailable');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/public/supporters', { cache: 'no-store' });
        const result = await response.json();
        if (!active || !response.ok) return;
        setSupporters(Array.isArray(result.supporters) ? result.supporters : []);
        setAvailability(result.availability === 'ready' ? 'ready' : 'unavailable');
      } catch {
        if (active) setAvailability('unavailable');
      }
    };
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const latest = supporters[0];
  return <section aria-label="Verified support updates" className="border-b border-[#d9d6ce] bg-[#e9f0e9]"><div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><div className="flex items-center gap-3"><HeartHandshake size={18} className="text-[#1e5b49]" /><p><span className="font-black text-[#17221e]">Verified support updates</span> <span className="text-[#66716a]">{latest ? `A verified donation was recorded for ${latest.campaign}.` : availability === 'ready' ? 'No public verified donation update is available yet.' : 'Support updates will appear after verification is available.'}</span></p></div><p className="text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">No donor names or payment amounts displayed</p></div></section>;
}
