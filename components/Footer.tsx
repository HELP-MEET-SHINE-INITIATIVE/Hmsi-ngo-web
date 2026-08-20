import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#102019] text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_0.6fr_0.6fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-3" aria-label="HMSI home">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e1ad45] text-xl font-black text-[#17221e]">H</span>
              <span className="text-sm font-black uppercase tracking-[0.17em]">HMSI</span>
            </Link>
            <p className="mt-6 max-w-xs text-sm leading-6 text-white/60">A community-rooted humanitarian initiative helping people move from crisis to possibility across Nigeria and Africa.</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#e1ad45]">Explore</p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-white/70"><Link href="/about" className="transition hover:text-white">About us</Link><Link href="/outreach/1" className="transition hover:text-white">Stories</Link><Link href="/#impact" className="transition hover:text-white">Our impact</Link></div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#e1ad45]">Join in</p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-white/70"><Link href="/donate" className="transition hover:text-white">Donate</Link><Link href="/volunteer" className="transition hover:text-white">Volunteer</Link><Link href="/contact" className="transition hover:text-white">Partner with us</Link></div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#e1ad45]">Follow HMSI</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black uppercase tracking-widest">
              <a href="https://www.instagram.com/hmsinitiative/" target="_blank" rel="noopener noreferrer" aria-label="Follow HMSI on Instagram" className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-white/75 transition hover:border-[#e1ad45] hover:text-white">Instagram <ExternalLink size={12} aria-hidden="true" /></a>
              <a href="https://facebook.com/hmsi_ngo" target="_blank" rel="noopener noreferrer" aria-label="Follow HMSI on Facebook" className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-white/75 transition hover:border-[#e1ad45] hover:text-white">Facebook <ExternalLink size={12} aria-hidden="true" /></a>
              <a href="https://twitter.com/hmsi_ngo" target="_blank" rel="noopener noreferrer" aria-label="Follow HMSI on X/Twitter" className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-white/75 transition hover:border-[#e1ad45] hover:text-white">X / Twitter <ExternalLink size={12} aria-hidden="true" /></a>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#e1ad45]">Contact</p>
            <p className="mt-5 text-sm leading-6 text-white/70">Lagos, Nigeria<br />Serving communities across Africa<br /><a href="mailto:support@hmsi.org.ng" className="transition hover:text-white">support@hmsi.org.ng</a><br /><a href="mailto:contact@hmsi.org.ng" className="transition hover:text-white">contact@hmsi.org.ng</a></p>
            <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#e1ad45]">Start a conversation <ArrowRight size={14} /></Link>
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-white/15 pt-6 text-[11px] font-semibold text-white/40 sm:flex-row"><span>© {new Date().getFullYear()} Help-Meet Shine Initiative. All rights reserved.</span><span>Built for dignity, action and shared possibility.</span></div>
      </div>
    </footer>
  );
}
