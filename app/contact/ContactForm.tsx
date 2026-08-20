'use client';

import React, { useState } from 'react';
import HmsiHeader from '../../components/HmsiHeader';

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not send your message.');
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not send your message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <HmsiHeader />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-red-600">Nigeria & Africa</p>
        <h1 className="mb-4 text-3xl font-black uppercase tracking-tighter">Contact HMSI</h1>
        <p className="mb-8 max-w-xl text-slate-600">Help-Meet Shine Initiative works with communities in Nigeria and across Africa. For support, email <a href="mailto:support@hmsi.org.ng" className="font-bold text-slate-900 underline underline-offset-4">support@hmsi.org.ng</a>. For partnerships and general enquiries, email <a href="mailto:contact@hmsi.org.ng" className="font-bold text-slate-900 underline underline-offset-4">contact@hmsi.org.ng</a>, or send us a message below.</p>

        {submitted ? (
          <div className="rounded-sm border border-teal-200 bg-teal-50 p-6 text-center">
            <p className="text-lg font-bold text-teal-700">Thank you for reaching out to Help-Meet Shine Initiative.</p>
            <p className="mt-2 text-sm text-slate-600">Your message has been received. Our team will get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}
            <div>
              <label htmlFor="contact-name" className="mb-1 block text-sm font-bold uppercase text-slate-700">Your Name</label>
              <input id="contact-name" type="text" placeholder="Enter your full name" required maxLength={160} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded-sm border-2 border-slate-300 p-3 font-medium outline-none focus:border-slate-900" />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1 block text-sm font-bold uppercase text-slate-700">Email Address</label>
              <input id="contact-email" type="email" placeholder="Enter your email" required value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="w-full rounded-sm border-2 border-slate-300 p-3 font-medium outline-none focus:border-slate-900" />
            </div>
            <div>
              <label htmlFor="contact-message" className="mb-1 block text-sm font-bold uppercase text-slate-700">Message</label>
              <textarea id="contact-message" rows={4} placeholder="How can we help you?" required maxLength={10000} value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} className="w-full resize-y rounded-sm border-2 border-slate-300 p-3 font-medium outline-none focus:border-slate-900" />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full rounded-sm bg-red-600 px-6 py-3 font-bold uppercase tracking-tight text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <p className="font-bold uppercase tracking-widest text-slate-900">Our base</p>
          <p className="mt-2">Lagos, Nigeria · Serving communities across Africa</p>
          <p className="mt-1"><a href="mailto:support@hmsi.org.ng" className="font-bold text-slate-900">support@hmsi.org.ng</a><br /><a href="mailto:contact@hmsi.org.ng" className="font-bold text-slate-900">contact@hmsi.org.ng</a></p>
        </div>
      </div>
    </div>
  );
}
