import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import Footer from '../../../components/Footer';
import VerifyCertificateForm from './VerifyCertificateForm';

export const metadata: Metadata = {
  title: 'Verify Volunteer Certificate | HMSI',
  description: 'Verify an HMSI volunteer service certificate using its certificate number and private verification code.',
  openGraph: {
    title: 'Verify HMSI Volunteer Certificate',
    description: 'A private verification page for HMSI volunteer service certificates.',
    url: 'https://www.hmsi.org.ng/certificates/verify',
  },
  alternates: { canonical: 'https://www.hmsi.org.ng/certificates/verify' },
};

export default function VerifyCertificatePage() {
  return <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]"><main><section className="bg-[#17221e] px-6 py-20 text-white sm:px-8 sm:py-28 lg:px-12"><div className="mx-auto max-w-[1200px]"><Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-white/70 transition hover:text-white"><ArrowLeft size={16} /> Back to homepage</Link><p className="mt-14 flex items-center gap-3 text-xs font-black uppercase tracking-[0.24em] text-[#e1ad45]"><BadgeCheck size={16} /> Certificate verification</p><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl">Verify volunteer service.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">Confirm whether an HMSI volunteer service certificate matches an active administrative record without exposing private volunteer information.</p></div></section><section className="px-6 py-14 sm:px-8 sm:py-20 lg:px-12"><div className="mx-auto max-w-[1200px]"><VerifyCertificateForm /><div className="mt-8 border-t border-[#d9d6ce] pt-6 text-xs leading-6 text-[#66716a]"><p><strong className="text-[#17221e]">Verification limitations:</strong> a valid result confirms a matching HMSI certificate record; it does not independently verify the quality, duration, or outcome of the service.</p><p className="mt-2">If a certificate cannot be verified, contact <a className="font-bold text-[#1e5b49] underline" href="mailto:contact@hmsi.org.ng">contact@hmsi.org.ng</a> and do not submit private verification codes through public channels.</p></div></div></section></main><Footer /></div>;
}
