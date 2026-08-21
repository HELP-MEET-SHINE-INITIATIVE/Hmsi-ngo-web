"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useEffect, useState } from 'react';

const links = [
  { href: '/about', label: 'About us' },
  { href: '/fundraise', label: 'Help Me' },
  { href: '/impact', label: 'Top Impact' },
  { href: '/news', label: 'News' },
  { href: '/stories', label: 'Field Stories' },
  { href: '/get-help', label: 'Get Help' },
  { href: '/projects', label: 'Projects' },
  { href: '/volunteer', label: 'Volunteer' },
  { href: '/worker-apply', label: 'Work with HMSI' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 border-b border-[#d9d6ce] bg-[#f6f4ef]/95 text-[#17221e] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-3" aria-label="HMSI home">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#272178] shadow-sm transition-transform duration-200 group-hover:scale-105"><Image src="/logo.png" alt="HMSI logo" width={48} height={48} priority className="h-full w-full object-cover" /></span>
          <span className="text-xs font-black uppercase tracking-[0.18em]">HMSI</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-bold lg:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-[#1e5b49]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[#e9f0e9] text-[#1e5b49] text-xs font-black uppercase tracking-widest hover:bg-[#1e5b49] hover:text-white transition-all"
              >
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <button 
                onClick={logout}
                className="p-2 rounded-full hover:bg-red-50 text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/login" className="text-xs font-black uppercase tracking-widest hover:text-[#1e5b49] transition-colors">
                Login
              </Link>
              <Link href="/donate" className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-5 py-3 text-xs font-black uppercase tracking-[0.13em] text-white transition hover:bg-[#1e5b49]">
                Donate now <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
          
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full p-3 text-[#17221e] transition-colors hover:bg-[#e9f0e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e5b49] lg:hidden"
            aria-label={menuOpen ? 'Close site menu' : 'Open site menu'}
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div id="site-mobile-menu" className="lg:hidden border-t border-[#d9d6ce] bg-white p-6 shadow-xl" role="region" aria-label="Mobile site navigation">
          <nav className="flex flex-col gap-4">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                onClick={() => setMenuOpen(false)}
                className="text-sm font-bold hover:text-[#1e5b49]"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link 
                href="/dashboard" 
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-sm font-bold text-[#1e5b49]"
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-bold"
                >
                  Login
                </Link>
                <Link 
                  href="/donate" 
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#17221e] px-6 py-3 text-xs font-black uppercase tracking-[0.13em] text-white w-fit"
                >
                  Donate now <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
