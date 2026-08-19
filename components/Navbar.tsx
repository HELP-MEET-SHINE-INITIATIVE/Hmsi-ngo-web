import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const links = [
  { href: '/about', label: 'About us' },
  { href: '/outreach/1', label: 'Stories' },
  { href: '/volunteer', label: 'Get involved' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#d9d6ce] bg-[#f6f4ef]/95 text-[#17221e] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-3" aria-label="HMSI home">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e1ad45] text-lg font-black transition-transform duration-200 group-hover:rotate-6">H</span>
          <span className="text-xs font-black uppercase tracking-[0.18em]">HMSI</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-bold lg:flex" aria-label="Primary navigation">
          {links.map((link) => <Link key={link.href} href={link.href} className="transition-colors hover:text-[#1e5b49]">{link.label}</Link>)}
        </nav>
        <Link href="/donate" className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-5 py-3 text-xs font-black uppercase tracking-[0.13em] text-white transition hover:bg-[#1e5b49]">Donate now <ArrowUpRight size={15} /></Link>
      </div>
    </header>
  );
}
