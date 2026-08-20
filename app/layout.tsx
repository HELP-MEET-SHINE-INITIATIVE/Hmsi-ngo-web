import type { Metadata } from 'next';
import { AuthProvider } from '../lib/auth';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.hmsi.org.ng'),
  title: {
    template: '%s | Help Meet Shine Initiative (HMSI)',
    default: 'Help Meet Shine Initiative (HMSI) | Supporting Communities in Nigeria and Africa',
  },
  description: 'Need help? Share your story and connect with support from caring people. HMSI provides humanitarian assistance for medical bills, education, and housing across Nigeria and Africa.',
  keywords: ['NGO Nigeria', 'NGO Africa', 'get financial help Nigeria', 'medical bill assistance', 'education support Africa', 'humanitarian aid', 'HMSI', 'charity Nigeria', 'crowdfunding Africa'],
  authors: [{ name: 'HMSI' }],
  creator: 'HMSI',
  publisher: 'HMSI',
  manifest: '/manifest.json',
  verification: {
    google: 'google-site-verification-placeholder',
    yandex: 'yandex-verification-placeholder',
    other: {
      'msvalidate.01': 'bing-verification-placeholder',
    },
  },
  openGraph: {
    title: 'Help Meet Shine Initiative (HMSI) | Empowering Communities',
    description: 'Empowering communities and restoring hope across Nigeria and Africa. Post your need or support a verified cause today.',
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
    description: 'Empowering communities and restoring hope across Nigeria and Africa. Join us in building a stronger tomorrow.',
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
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    'name': 'Help Meet Shine Initiative',
    'alternateName': 'HMSI',
    'url': 'https://www.hmsi.org.ng',
    'logo': 'https://www.hmsi.org.ng/logo.png',
    'description': 'HMSI provides humanitarian support, equips individuals for sustainable wealth creation, and drives community-led social growth across Nigeria and Africa.',
    'address': {
      '@type': 'PostalAddress',
      'addressCountry': 'NG',
    },
    'areaServed': [
      { '@type': 'Country', 'name': 'Nigeria' },
      { '@type': 'Continent', 'name': 'Africa' },
    ],
    'contactPoint': [
      {
        '@type': 'ContactPoint',
        'email': 'support@hmsi.org.ng',
        'contactType': 'customer support',
        'areaServed': ['NG', 'Africa'],
      },
      {
        '@type': 'ContactPoint',
        'email': 'contact@hmsi.org.ng',
        'contactType': 'general enquiries and partnerships',
        'areaServed': ['NG', 'Africa'],
      },
    ],
    'sameAs': [
      'https://twitter.com/hmsi_ngo',
      'https://facebook.com/hmsi_ngo',
      'https://instagram.com/hmsi_ngo',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'Help Meet Shine Initiative',
    'url': 'https://www.hmsi.org.ng',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': 'https://www.hmsi.org.ng/fundraise?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
