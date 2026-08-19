use client

import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold text-gray-900">HMSI</Link>
        </div>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-6">
            <li><Link href="/" className="text-gray-700 hover:text-gray-900">Home</Link></li>
            <li><Link href="/campaigns" className="text-gray-700 hover:text-gray-900">Campaigns</Link></li>
            <li><Link href="/news" className="text-gray-700 hover:text-gray-900">News</Link></li>
            <li><Link href="/volunteer" className="text-gray-700 hover:text-gray-900">Volunteer</Link></li>
            <li><Link href="/contact" className="text-gray-700 hover:text-gray-900">Contact</Link></li>
            <li>
              <Link href="/donate" className="ml-3 inline-block bg-red-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-red-700">Donate</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
