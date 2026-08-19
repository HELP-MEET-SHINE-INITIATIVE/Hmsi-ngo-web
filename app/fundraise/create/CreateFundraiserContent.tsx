"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadData, saveData } from "../../../lib/data";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import { 
  ChevronLeft, 
  Plus, 
  Image as ImageIcon, 
  Target, 
  Type, 
  FileText,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function CreateFundraiserContent() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "medical",
    targetAmount: "",
    image: "/images/outreach-1.png"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadData();
    const newFundraiser = {
      id: `f${Date.now()}`,
      ...formData,
      targetAmount: Number(formData.targetAmount),
      raisedAmount: 0,
      status: "active",
      createdAt: new Date().toISOString()
    };
    
    data.fundraisers.unshift(newFundraiser);
    saveData(data);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="w-24 h-24 rounded-full bg-[#e9f0e9] flex items-center justify-center text-[#1e5b49] mx-auto mb-8">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4">Request Submitted</h1>
          <p className="text-[#66716a] text-lg mb-10">Your help request has been received and is being verified by our team. It will be live on the platform within 24 hours.</p>
          <Link href="/fundraise" className="px-10 py-4 rounded-full bg-[#17221e] text-white font-black uppercase tracking-widest text-sm hover:bg-[#1e5b49] transition-all">
            Back to Fundraisers
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/fundraise" className="inline-flex items-center gap-2 text-sm font-bold text-[#66716a] hover:text-[#1e5b49] mb-8 transition-colors">
          <ChevronLeft size={18} /> Back to listing
        </Link>

        <div className="bg-white rounded-[40px] border border-[#d9d6ce] shadow-sm overflow-hidden">
          <div className="p-8 md:p-12 border-b border-[#f6f4ef] bg-[#17221e] text-white">
            <h1 className="text-3xl font-black tracking-tight mb-2">Start a Fundraiser</h1>
            <p className="text-white/60">Tell your story and get the support you need.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[#17221e] mb-3 flex items-center gap-2">
                  <Type size={16} className="text-[#e1ad45]" /> Fundraiser Title
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Help Baby Tobi's Heart Surgery"
                  className="w-full px-6 py-4 rounded-2xl bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-[#17221e] mb-3 flex items-center gap-2">
                    <Plus size={16} className="text-[#e1ad45]" /> Category
                  </label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none text-sm appearance-none"
                  >
                    <option value="medical">Medical</option>
                    <option value="education">Education</option>
                    <option value="housing">Housing</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-[#17221e] mb-3 flex items-center gap-2">
                    <Target size={16} className="text-[#e1ad45]" /> Target Amount (₦)
                  </label>
                  <input 
                    type="number" 
                    required
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                    placeholder="e.g. 500000"
                    className="w-full px-6 py-4 rounded-2xl bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[#17221e] mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-[#e1ad45]" /> The Story
                </label>
                <textarea 
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the situation and why you need help..."
                  className="w-full px-6 py-4 rounded-2xl bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[#17221e] mb-3 flex items-center gap-2">
                  <ImageIcon size={16} className="text-[#e1ad45]" /> Cover Image
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-[#d9d6ce] border-dashed rounded-[32px] cursor-pointer bg-[#f6f4ef] hover:bg-[#e9f0e9] transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-10 h-10 mb-3 text-[#66716a]" />
                      <p className="mb-2 text-sm text-[#66716a] font-bold">Click to upload or drag and drop</p>
                      <p className="text-xs text-[#66716a]">PNG, JPG or WEBP (MAX. 800x400px)</p>
                    </div>
                    <input type="file" className="hidden" disabled />
                  </label>
                </div>
                <p className="mt-2 text-[10px] text-[#66716a] italic">* For this demo, a default image will be used.</p>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-5 rounded-full bg-[#1e5b49] text-white font-black uppercase tracking-widest text-sm hover:bg-[#17221e] transition-all shadow-lg shadow-[#1e5b49]/20"
            >
              Submit for Verification
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
