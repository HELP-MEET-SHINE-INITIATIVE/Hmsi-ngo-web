import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 px-6 mt-20 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand & Mission */}
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center space-x-3 mb-4">
            <Image 
              src="/logo.png" 
              alt="HMSI Logo" 
              width={50} 
              height={50} 
              className="object-contain"
            />
            <h3 className="text-white text-lg font-bold leading-tight">Help-Meet Shine<br/>Initiative</h3>
          </div>
          <p className="mb-4 opacity-80 leading-relaxed">
            Equipping individuals for sustainable wealth creation and providing humanitarian support across Nigeria.
          </p>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-white font-semibold mb-4 tracking-wide uppercase text-xs">Contact Us</h3>
          <ul className="space-y-3 opacity-80">
            {/* TODO: Update with your physical HQ address */}
            <li className="flex items-start space-x-2">
              <span>📍</span>
              <span>[Insert Physical Office Address, e.g., Abuja, FCT]</span>
            </li>
            <li className="flex items-center space-x-2">
              <span>✉️</span>
              <a href="mailto:contact@hmsi.org.ng" className="hover:text-white transition">contact@hmsi.org.ng</a>
            </li>
            <li className="flex items-center space-x-2">
              <span>📞</span>
              <a href="tel:+2340000000000" className="hover:text-white transition">+234 (0) [Insert Phone]</a>
            </li>
          </ul>
        </div>

        {/* Legal & Compliance */}
        <div>
          <h3 className="text-white font-semibold mb-4 tracking-wide uppercase text-xs">Transparency</h3>
          <ul className="space-y-3 opacity-80">
            <li className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Registered NGO in Nigeria</span>
            </li>
            <li><strong>CAC Reg No:</strong> 125103</li>
            <li><strong>Date of Incorp:</strong> Feb 21, 2019</li>
            <li className="pt-2">
              <Link href="/privacy-policy" className="hover:text-white transition underline underline-offset-2">Privacy Policy</Link>
            </li>
          </ul>
        </div>

        {/* Secure Donations */}
        <div>
          <h3 className="text-white font-semibold mb-4 tracking-wide uppercase text-xs">Secure Donations</h3>
          <p className="mb-4 text-xs opacity-75">
            100% of public donations go directly toward our community outreach and food distribution drives.
          </p>
          <div className="p-3 bg-slate-800 rounded-lg inline-block border border-slate-700">
            <p className="text-xs font-medium text-white flex items-center">
              <span className="mr-2">🔒</span> Secured by Paystack
            </p>
          </div>
        </div>
        
      </div>
      
      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-800 text-center flex flex-col md:flex-row justify-between items-center opacity-60 text-xs">
        <p>© {new Date().getFullYear()} Help-Meet Shine Initiative. All rights reserved.</p>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <Link href="#" className="hover:text-white transition">Facebook</Link>
          <Link href="#" className="hover:text-white transition">Instagram</Link>
          <Link href="#" className="hover:text-white transition">Twitter / X</Link>
        </div>
      </div>
    </footer>
  );
}
