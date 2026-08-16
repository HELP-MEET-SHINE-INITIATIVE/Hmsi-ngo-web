"use client";

import React, { useState } from 'react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-white min-h-screen text-slate-900 py-12 px-6 max-w-2xl mx-auto font-sans">
      <h1 className="text-3xl font-black uppercase mb-6 tracking-tighter">Contact HMSI</h1>
      {submitted ? (
        <div className="bg-teal-50 border border-teal-200 p-6 rounded-sm text-center">
          <p className="text-teal-700 font-bold text-lg">Thank you for reaching out to Help-Meet Shine Initiative!</p>
          <p className="text-slate-600 text-sm mt-2">We will get back to you shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold uppercase text-slate-700 mb-1">Your Name</label>
            <input 
              type="text" 
              placeholder="Enter your full name" 
              required 
              className="w-full border-2 border-slate-300 p-3 rounded-sm outline-none focus:border-slate-900 font-medium" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold uppercase text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              placeholder="Enter your email" 
              required 
              className="w-full border-2 border-slate-300 p-3 rounded-sm outline-none focus:border-slate-900 font-medium" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold uppercase text-slate-700 mb-1">Message</label>
            <textarea 
              rows={4} 
              placeholder="How can we help you?" 
              required 
              className="w-full border-2 border-slate-300 p-3 rounded-sm outline-none focus:border-slate-900 font-medium" 
            ></textarea>
          </div>
          <button 
            type="submit" 
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-sm w-full uppercase tracking-tight transition-colors"
          >
            Send Message
          </button>
        </form>
      )}
    </div>
  );
}