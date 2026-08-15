import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata = {
  title: 'Help-Meet Shine Initiative (HMSI)',
  description: 'Empowering communities and restoring hope across Nigeria.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
