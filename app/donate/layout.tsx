import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Support Our Cause",
  description: "Partner with us to make a difference.",
};
export default function DonateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
