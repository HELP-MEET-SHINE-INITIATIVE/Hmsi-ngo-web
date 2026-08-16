import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Help-Meet Shine Initiative (HMSI)",
  description: "Empowering Communities and Restoring Hope Across Nigeria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
