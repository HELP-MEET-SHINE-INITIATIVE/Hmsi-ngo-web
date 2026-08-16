import type { Metadata } from 'next';
import './globals.css';

// 🛑 Fix: Using '../components/' instead of '@/components/'
// If you have a Navbar or Footer, uncomment and use these exact paths:
// import Navbar from '../components/Navbar';
// import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'Help-Meet Shine Initiative',
  description: 'Impacting vulnerable households across Nigeria',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200 antialiased">
        {/* <Navbar /> */}
        
        <main className="min-h-screen flex flex-col">
          {children}
        </main>
        
        {/* <Footer /> */}
      </body>
    </html>
  );
}
