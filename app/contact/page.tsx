export const metadata = {
  title: 'Contact Us | Help-Meet Shine Initiative (HMSI)',
  description: 'Get in touch with Help-Meet Shine Initiative for partnerships, volunteer opportunities, and community support inquiries.',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Have questions about our programs, want to volunteer, or partner with our mission? We would love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Contact Information Cards */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="text-2xl">📧</div>
              <h3 className="text-white font-semibold text-lg">Email Us</h3>
              <p className="text-slate-400 text-sm">For official correspondence and inquiries:</p>
              <a href="mailto:support@helpmeetshine.org" className="text-blue-400 hover:underline block font-medium">
                support@helpmeetshine.org
              </a>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="text-2xl">📍</div>
              <h3 className="text-white font-semibold text-lg">Operational Base</h3>
              <p className="text-slate-400 text-sm">Headquartered in Nigeria, operating grassroot interventions nationwide.</p>
              <p className="text-white font-medium text-sm">Federal Republic of Nigeria</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="text-2xl">🏛️</div>
              <h3 className="text-white font-semibold text-lg">Legal Verification</h3>
              <p className="text-slate-400 text-sm">CAC Registration No:</p>
              <p className="text-white font-mono font-semibold">125103</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-white mb-6">Send Us a Message</h3>
            
            <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for reaching out! We will get back to you shortly.'); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Godspower Adebusoye" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Message</label>
                <textarea 
                  rows={4} 
                  required 
                  placeholder="How can we work together?" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none"
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg"
              >
                Send Message
              </button>
            </form>
          </div>

        </div>

      </div>
    </main>
  );
}
