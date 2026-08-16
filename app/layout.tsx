      images: [
        {
          url: '/opengraph-image.png', // We will add this later
          width: 1200,
          height: 630,
          alt: 'HMSI Volunteers distributing supplies',
        },
      ],
      locale: 'en_NG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Help Meet Shine Initiative (HMSI)',
      description: 'Empowering Communities. Restoring Hope.',
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
