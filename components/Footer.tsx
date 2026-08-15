export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-3">Help-Meet Shine Initiative</h3>
          <p className="text-sm leading-relaxed">
            Equipping individuals for sustainable wealth creation and providing humanitarian support across Nigeria.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:text-white transition">Home</a></li>
            <li><a href="/about" className="hover:text-white transition">About Us</a></li>
            <li><a href="/donate" className="hover:text-white transition text-blue-400 font-semibold">Donate & Support</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Legal & Compliance</h4>
          <p className="text-sm">Registered NGO in Nigeria</p>
          <p className="text-sm font-mono text-slate-300 mt-1">CAC Registration No: 125103</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-slate-900 pt-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Help-Meet Shine Initiative (HMSI). All rights reserved.
      </div>
    </footer>
  );
}
