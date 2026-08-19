import type { Metadata } from 'next';
import { AuthProvider } from '../lib/auth';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.hmsi.org.ng'),
  title: {
    template: '%s | Help Meet Shine Initiative (HMSI)',
    default: 'Help Meet Shine Initiative (HMSI) | Empowering Communities in Nigeria',
  },
  description: 'HMSI provides humanitarian support, equips individuals for sustainable wealth creation, and drives community-led social growth across Nigeria.',
  keywords: ['NGO', 'Nigeria', 'Humanitarian Aid', 'Community Empowerment', 'HMSI', 'Social Growth', 'Charity'],
  authors: [{ name: 'HMSI' }],
  creator: 'HMSI',
  publisher: 'HMSI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Help Meet Shine Initiative (HMSI)',
    description: 'Empowering Communities. Restoring Hope Across Nigeria. Join us in building a stronger tomorrow.',
    url: 'https://www.hmsi.org.ng',
    siteName: 'Help Meet Shine Initiative',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Help Meet Shine Initiative (HMSI) - Empowering Communities in Nigeria',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Meet Shine Initiative (HMSI)',
    description: 'Empowering Communities. Restoring Hope Across Nigeria. Join us in building a stronger tomorrow.',
    images: ['/opengraph-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: 'https://www.hmsi.org.ng',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
