"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import HmsiHeader from '../components/HmsiHeader';

export default function VolunteerPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans antialiased">
      <HmsiHeader />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row min-h-[85vh]">
        
        {/* LEFT SIDE: INSPIRATIONAL CONTEXT */}
        <div className="w-full lg:w-1/2 relative bg-slate-900 flex flex-col justify-center p-8 md:p-16 text-white overflow-hidden">
          <Image 
            src="/images/outreach-5.png" 
            alt="Volunteers in Action" 
            fill 
            className="object-cover opacity-40 mix-blend-overlay"
          />
          <div className="relative z-10">
            <div className="w-12 h-1 bg-red-500 mb-6"></div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 leading-tight">
              Become a <br/> Force for Good.
            </h1>
            <p className="text-lg md:text-xl font-medium mb-8 leading-relaxed max-w-md">
              Volunteers are the backbone of the Help-Meet Shine Initiative. Join our network of dedicated individuals transforming lives across Nigeria through fieldwork, medical outreach, and logistics.
            </p>
            <ul className="space-y-4 font-bold text-sm uppercase tracking-wide">
              <li className="flex items-center gap-3"><span className="text-red-500 text-xl">✓</span> Gain Field Experience</li>
              <li className="flex items-center gap-3"><span className="text-red-500 text-xl">✓</span> Make a Direct Impact</li>
              <li className="flex items-center gap-3"><span className="text-red-500 text-xl">✓</span> Join a Global Network</li>
            </ul>
          </div>
        </div>

        {/* RIGHT SIDE: APPLICATION FORM */}
        <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-slate-50">
          <h2 className="text-2xl font-black uppercase mb-8 tracking-tight text-slate-900">Volunteer Application</h2>
          
          {submitted ? (
            <div className="bg-teal-100 border-l-4 border-teal-500 p-8 text-teal-900">
              <h3 className="font-black text-xl mb-2">Application Received!</h3>
              <p>Thank you for offering your time. Our mobilization team will review your details and contact you regarding upcoming drives.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Full Name</label>
                  <input type="text" required className="w-full border border-slate-300 p-3 outline-none focus:border-red-600 transition-colors bg-white" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Phone Number</label>
                  <input type="tel" required className="w-full border border-slate-300 p-3 outline-none focus:border-red-600 transition-colors bg-white" placeholder="+234..." />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Email Address</label>
                <input type="email" required className="w-full border border-slate-300 p-3 outline-none focus:border-red-600 transition-colors bg-white" placeholder="john@example.com" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Area of Interest</label>
                <select className="w-full border border-slate-300 p-3 outline-none focus:border-red-600 transition-colors bg-white text-slate-700">
                  <option>Medical & Healthcare Outreach</option>
                  <option>Logistics & Distribution</option>
                  <option>Educational Tutoring</option>
                  <option>Media & Photography</option>
                  <option>General Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Why do you want to join HMSI?</label>
                <textarea rows={3} required className="w-full border border-slate-300 p-3 outline-none focus:border-red-600 transition-colors bg-white" placeholder="Tell us about your passion..."></textarea>
              </div>

              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 w-full uppercase tracking-widest text-sm transition-colors mt-4">
                Submit Application
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}