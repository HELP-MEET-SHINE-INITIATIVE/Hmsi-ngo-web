'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trackVolunteerApplication } from '../../lib/gtm';
type ApplicationRole = 'volunteer' | 'worker';

export default function VolunteerForm({ applicationRole = 'volunteer' }: { applicationRole?: ApplicationRole }) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    interest: applicationRole === 'worker' ? 'Worker support and field operations' : 'Medical & Healthcare Outreach',
    publisherRole: '',
    message: '',
    privacyAcknowledged: false,
  });

  useEffect(() => {
    const requestedInterest = new URLSearchParams(window.location.search).get('interest');
    if (requestedInterest) {
      setFormData((current) => ({ ...current, interest: requestedInterest }));
    }
  }, []);

  const interestOptions = applicationRole === 'worker'
    ? ['Worker support and field operations', 'Fundraising, partnerships and campaign operations', 'Donor communications and reporting', 'Community mobilisation and outreach', 'Programme and logistics coordination']
    : ['Medical & Healthcare Outreach', 'Fundraising ambassador and donor outreach', 'Campaign planning and community outreach', 'Partnerships and sponsorship support', 'Logistics & Distribution', 'Educational Tutoring', 'Media & Photography', 'General Support'];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, role: applicationRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not save your application.');

      // Dispatch Google Tag Manager lead conversion event
      trackVolunteerApplication({
        role: applicationRole,
        interest: formData.interest,
      });

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not save your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <div className="mx-auto flex min-h-[85vh] max-w-7xl flex-col lg:flex-row">
        <div className="relative flex w-full flex-col justify-center overflow-hidden bg-slate-900 p-8 text-white md:p-16 lg:w-1/2">
          <Image src="/images/outreach-5.png" alt="Volunteers in action" fill className="object-cover opacity-40 mix-blend-overlay" />
          <div className="relative z-10">
            <div className="mb-6 h-1 w-12 bg-red-500" />
            <h1 className="mb-6 text-4xl font-black uppercase leading-tight tracking-tighter md:text-6xl">{applicationRole === 'worker' ? <>Apply to <br />Work with HMSI.</> : <>Become a <br />Force for Good.</>}</h1>
            <p className="mb-8 max-w-md text-lg font-medium leading-relaxed md:text-xl">{applicationRole === 'worker' ? 'Worker applications are reviewed by the HMSI coordination team before a worker record and dashboard access are created.' : 'Volunteers are the backbone of Help-Meet Shine Initiative. Join dedicated people transforming lives through fieldwork, medical outreach, education, and logistics across Nigeria and Africa.'}</p>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-wide"><li className="flex items-center gap-3"><span className="text-xl text-red-500">✓</span> Gain field experience</li><li className="flex items-center gap-3"><span className="text-xl text-red-500">✓</span> Make a direct impact</li><li className="flex items-center gap-3"><span className="text-xl text-red-500">✓</span> Join a growing network</li></ul>
          </div>
        </div>
        <div className="flex w-full flex-col justify-center bg-slate-50 p-8 md:p-16 lg:w-1/2">
          <h2 className="mb-2 text-2xl font-black uppercase tracking-tight text-slate-900">{applicationRole === 'worker' ? 'Worker application' : 'Volunteer application'}</h2>
          <p className="mb-8 text-sm text-slate-600">{applicationRole === 'worker' ? 'Submit your application for administrator approval. Do not create a worker login until HMSI approves your application.' : 'Applications are reviewed by the HMSI coordination team.'}</p>
          <div className="mb-8 flex flex-wrap gap-3 text-xs font-black uppercase tracking-widest">
            {applicationRole === 'volunteer' ? <><Link href="/login" className="rounded-full border border-[#d9d6ce] bg-white px-4 py-3 text-[#1e5b49] hover:border-[#1e5b49]">Volunteer login</Link><Link href="/signup" className="rounded-full bg-[#1e5b49] px-4 py-3 text-white hover:bg-[#17221e]">Volunteer signup</Link><Link href="/worker-apply" className="rounded-full border border-[#d9d6ce] bg-white px-4 py-3 text-[#66716a] hover:border-[#1e5b49]">Worker application</Link></> : <Link href="/login" className="rounded-full border border-[#d9d6ce] bg-white px-4 py-3 text-[#1e5b49] hover:border-[#1e5b49]">Approved worker login</Link>}
          </div>
          {submitted ? (
            <div className="border-l-4 border-teal-500 bg-teal-100 p-8 text-teal-900"><h3 className="mb-2 text-xl font-black">Application Received!</h3><p>Thank you for offering your time. Our team will review your application and contact you about upcoming opportunities.</p></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2"><div><label htmlFor="volunteer-name" className="mb-2 block text-xs font-bold uppercase text-slate-600">Full Name</label><input id="volunteer-name" type="text" required maxLength={160} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full border border-slate-300 bg-white p-3 outline-none transition-colors focus:border-red-600" placeholder="John Doe" /></div><div><label htmlFor="volunteer-phone" className="mb-2 block text-xs font-bold uppercase text-slate-600">Phone Number</label><input id="volunteer-phone" type="tel" required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="w-full border border-slate-300 bg-white p-3 outline-none transition-colors focus:border-red-600" placeholder="+234..." /></div></div>
              <div><label htmlFor="volunteer-email" className="mb-2 block text-xs font-bold uppercase text-slate-600">Email Address</label><input id="volunteer-email" type="email" required value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="w-full border border-slate-300 bg-white p-3 outline-none transition-colors focus:border-red-600" placeholder="john@example.com" /></div>
              <div><label htmlFor="volunteer-interest" className="mb-2 block text-xs font-bold uppercase text-slate-600">Area of Interest</label><select id="volunteer-interest" value={formData.interest} onChange={(event) => setFormData({ ...formData, interest: event.target.value })} className="w-full border border-slate-300 bg-white p-3 text-slate-700 outline-none transition-colors focus:border-red-600">{interestOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
              {applicationRole === 'volunteer' ? <div><label htmlFor="publisher-role" className="mb-2 block text-xs font-bold uppercase text-slate-600">Publisher pathway (optional)</label><select id="publisher-role" value={formData.publisherRole} onChange={(event) => setFormData({ ...formData, publisherRole: event.target.value })} className="w-full border border-slate-300 bg-white p-3 text-slate-700 outline-none transition-colors focus:border-red-600"><option value="">General volunteer pathway</option><option value="community_publisher">Community Publisher</option><option value="humanitarian_activist">Humanitarian Activist</option><option value="independent_field_reporter">Independent Field Reporter</option></select><p className="mt-2 text-xs leading-5 text-slate-500">Approved publisher volunteers can submit stories for editorial review. They cannot publish directly to the public news feed.</p></div> : null}
              <div><label htmlFor="volunteer-message" className="mb-2 block text-xs font-bold uppercase text-slate-600">Why do you want to join HMSI?</label><textarea id="volunteer-message" rows={3} required maxLength={10000} value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} className="w-full border border-slate-300 bg-white p-3 outline-none transition-colors focus:border-red-600" placeholder={formData.interest.toLowerCase().includes('fundrais') || formData.interest.toLowerCase().includes('campaign') ? 'Tell us about your audience, community, fundraising, communications, or campaign skills...' : 'Tell us about your passion...'} /></div>
              <label htmlFor="volunteer-privacy" className="flex items-start gap-3 text-sm leading-6 text-slate-600"><input id="volunteer-privacy" type="checkbox" required checked={formData.privacyAcknowledged} onChange={(event) => setFormData({ ...formData, privacyAcknowledged: event.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-slate-900" /> <span>I have read the <Link href="/privacy" className="font-bold text-slate-900 underline underline-offset-4">Privacy notice</Link> and <Link href="/safeguarding" className="font-bold text-slate-900 underline underline-offset-4">Safeguarding commitment</Link>. I will not submit unnecessary sensitive information about another person.</span></label>
              <button type="submit" disabled={isSubmitting} className="mt-4 w-full bg-red-600 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Submitting…' : applicationRole === 'worker' ? 'Submit for approval' : 'Submit Application'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
