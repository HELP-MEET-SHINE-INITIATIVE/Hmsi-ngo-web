import type { Metadata } from 'next';
import './globals.css';
// Global SEO and Open Graph Configuration
export const metadata: Metadata = {
  title: {
    template: '%s | Help Meet Shine Initiative (HMSI)',
    default: 'Help Meet Shine Initiative (HMSI) | Empowering Communities in Nigeria',
  },
  description: 'We provide humanitarian support, equip individuals for sustainable wealth creation.',
  metadataBase: new URL('https://www.hmsi.org.ng'),
  openGraph: {
    title: 'Help Meet Shine Initiative (HMSI)',
    description: 'Empowering Communities. Restoring Hope Across Nigeria.',
    url: 'https://www.hmsi.org.ng',
    siteName: 'HMSI NGO',
    images: [
      {
        url: '/opengraph-image.png', // We will add this file to your /app directory
        width: 1200,
        height: 630,
        alt: 'HMSI Volunteers distributing supplies in Nigeria',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Meet Shine Initiative (HMSI)',
    description: 'Empowering Communities. Restoring Hope Across Nigeria.',
  },
  alternates: {
    canonical: 'https://www.hmsi.org.ng',
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
