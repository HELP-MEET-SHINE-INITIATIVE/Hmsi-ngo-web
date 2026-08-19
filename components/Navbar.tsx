import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <span className="text-xl font-black tracking-wider text-white">HMSI</span>
        </Link>
        <div className="flex items-center space-x-8 text-sm font-medium text-slate-300">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <Link href="/about" className="hover:text-white transition">About Us</Link>
          <Link href="/donate" className="hover:text-white transition">Donate</Link>
          <Link href="/contact" className="hover:text-white transition text-blue-400 font-semibold">Contact Us</Link>
        </div>
      </div>
    </nav>
  );
}