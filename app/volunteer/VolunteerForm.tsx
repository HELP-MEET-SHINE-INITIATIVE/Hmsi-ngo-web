'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import HmsiHeader from '../../components/HmsiHeader';

export default function VolunteerForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    interest: 'Medical & Healthcare Outreach',
    message: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not save your application.');
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not save your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <HmsiHeader />
      <div className="mx-auto flex min-h-[85vh] max-w-7xl flex-col lg:flex-row">
        <div className="relative flex w-full flex-col justify-center overflow-hidden bg-slate-900 p-8 text-white md:p-16 lg:w-1/2">
          <Image src="/images/outreach-5.png" alt="Volunteers in action" fill className="object-cover opacity-40 mix-blend-overlay" />
          <div className="relative z-10">
            <div className="mb-6 h-1 w-12 bg-red-500" />
            <h1 className="mb-6 text-4xl font-black uppercase leading-tight tracking-tighter md:text-6xl">Become a <br />Force for Good.</h1>
            <p className="mb-8 max-w-md text-lg font-medium leading-relaxed md:text-xl">Volunteers are the backbone of Help-Meet Shine Initiative. Join dedicated people transforming lives through fieldwork, medical outreach, education, and logistics across Nigeria and Africa.</p>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-wide"><li className="flex items-center gap-3"><span className="text-xl text-red-500">✓</span> Gain field experience</li><li className="flex items-center gap-3"><span className="text-xl text-red-500">✓</span> Make a direct impact</li><li className="flex items-center gap-3"><span className="text-xl text-red-500">✓</span> Join a growing network</li></ul>
          </div>
        </div>
        <div className="flex w-full flex-col justify-center bg-slate-50 p-8 md:p-16 lg:w-1/2">
          <h2 className="mb-2 text-2xl font-black uppercase tracking-tight text-slate-900">Volunteer Application</h2>
          <p className="mb-8 text-sm text-slate-600">Applications are reviewed by the HMSI coordination team.</p>
          {submitted ? (
            <div className="border-l-4 border-teal-500 bg-teal-100 p-8 text-teal-900"><h3 className="mb-2 text-xl font-black">Application Received!</h3><p>Thank you for offering your time. Our team will review your application and contact you about upcoming opportunities.</p></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2"><div><label htmlFor="volunteer-name" className="mb-2 block text-xs font-bold uppercase text-slate-600">Full Name</label><input id="volunteer-name" type="text" required maxLength={160} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full border border-slate-300 bg-white p-3 outline-none transition-colors focus:border-red-600" placeholder="John Doe" /></div><div><label htmlFor="volunteer-phone" className="mb-2 block text-xs font-bold uppercase text-slate-600">Phone Number</label><input id="volunteer-phone" type="tel" required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="w-full border border-slate-300 bg-white p-3 outline-none transition-colors focus:border-red-600" placeholder="+234..." /></div></div>
              <div><label htmlFor="volunteer-email" className="mb-2 block text-xs font-bold uppercase text-slate-600">Email Address</label><input id="volunteer-email" type="email" required value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="w-full border border-slate-300 bg-white p-3 outline-none transition-colors focus:border-red-600" placeholder="john@example.com" /></div>
              <div><label htmlFor="volunteer-interest" className="mb-2 block text-xs font-bold uppercase text-slate-600">Area of Interest</label><select id="volunteer-interest" value={formData.interest} onChange={(event) => setFormData({ ...formData, interest: event.target.value })} className="w-full border border-slate-300 bg-white p-3 text-slate-700 outline-none transition-colors focus:border-red-600"><option>Medical & Healthcare Outreach</option><option>Logistics & Distribution</option><option>Educational Tutoring</option><option>Media & Photography</option><option>General Support</option></select></div>
              <div><label htmlFor="volunteer-message" className="mb-2 block text-xs font-bold uppercase text-slate-600">Why do you want to join HMSI?</label><textarea id="volunteer-message" rows={3} required maxLength={10000} value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} className="w-full border border-slate-300 bg-white p-3 outline-none transition-colors focus:border-red-600" placeholder="Tell us about your passion..." /></div>
              <button type="submit" disabled={isSubmitting} className="mt-4 w-full bg-red-600 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Submitting…' : 'Submit Application'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
