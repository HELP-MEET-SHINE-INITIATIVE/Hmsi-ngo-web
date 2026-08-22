import type { Metadata } from 'next';
import { AuthProvider } from '../lib/auth';
import Navbar from '../components/Navbar';
import GoogleTagManager from '../components/GoogleTagManager';
import PageViewTracker from '../components/PageViewTracker';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.hmsi.org.ng'),
  title: {
    template: '%s | Help Meet Shine Initiative (HMSI)',
    default: 'Help Meet Shine Initiative (HMSI) | Nigeria nonprofit organization',
  },
  description: 'Help Meet Shine Initiative (HMSI) is a Nigerian nonprofit organization based in Benin City, Edo State, working in humanitarian assistance, education, livelihoods, and community development.',
  keywords: ['Help Meet Shine Initiative', 'HMSI Nigeria', 'Nigerian nonprofit organization', 'humanitarian organization Benin City', 'community development Nigeria'],
  authors: [{ name: 'HMSI' }],
  creator: 'HMSI',
  publisher: 'HMSI',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Help Meet Shine Initiative (HMSI) | Nigerian nonprofit organization',
    description: 'Public information about Help Meet Shine Initiative, its stated activities, governance, and ways to contact or support the organization.',
    url: 'https://www.hmsi.org.ng',
    siteName: 'Help Meet Shine Initiative',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Help Meet Shine Initiative (HMSI) logo',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Meet Shine Initiative (HMSI) | About the organization',
    description: 'Learn about Help Meet Shine Initiative, its stated program areas in Nigeria, and public contact information.',
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
    'legalName': 'The Incorporated Trustees of HELP-MEET SHINE INITIATIVE',
    'alternateName': 'HMSI',
    'url': 'https://www.hmsi.org.ng',
    'logo': 'https://www.hmsi.org.ng/logo.png',
    'description': 'HMSI describes its activities as humanitarian assistance, education, empowerment, livelihoods, and community development in Nigeria and Africa.',
    'foundingDate': '2019-02-21',
    'identifier': 'CAC/IT/NO 125103',
    'taxID': '21249981',
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': 'Benin City',
      'addressRegion': 'Edo State',
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
      'https://www.linkedin.com/company/help-meet-shine-initiative/',
      'https://www.facebook.com/@hmsinitiative/',
      'https://www.instagram.com/hmsinitiative/',
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
        <GoogleTagManager />
        <PageViewTracker />
        <AuthProvider>
          <a href="#main-content" className="sr-only z-[100] bg-[#e1ad45] px-4 py-3 text-sm font-black text-[#17221e] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-full focus:outline-none focus:ring-2 focus:ring-[#17221e]">Skip to main content</a>
          <Navbar />
          <div id="main-content">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
