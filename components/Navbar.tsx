export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="/" className="flex items-center space-x-3">
          <span className="text-xl font-black tracking-wider text-white">HMSI</span>
        </a>
        <div className="flex items-center space-x-8 text-sm font-medium text-slate-300">
          <a href="/" className="hover:text-white transition">Home</a>
          <a href="/about" className="hover:text-white transition">About Us</a>
          <a href="/donate" className="hover:text-white transition">Donate</a>
          <a href="/contact" className="hover:text-white transition text-blue-400 font-semibold">Contact Us</a>
        </div>
      </div>
    </nav>
  );
}