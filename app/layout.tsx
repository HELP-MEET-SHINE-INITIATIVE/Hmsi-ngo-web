import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Help Meet Shine Initiative (HMSI) | Official NGO Portal",
  description: "Empowering communities, facilitating humanitarian aid, and driving sustainable self-reliance across Nigeria.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col justify-between">
        {children}
      </body>
    </html>
  );
}
