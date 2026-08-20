'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Footer from '../../../components/Footer';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  Plus,
  Target,
  Type,
} from 'lucide-react';
import Link from 'next/link';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function CreateFundraiserContent() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'medical',
    targetAmount: '',
  });

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageChange = (file?: File) => {
    setError('');
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError('Please choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Please choose an image that is 8 MB or smaller.');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedImage) {
      setError('Please add a cover image for your fundraiser.');
      return;
    }

    const targetAmount = Number(formData.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError('Enter a target amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = new FormData();
      body.append('title', formData.title.trim());
      body.append('description', formData.description.trim());
      body.append('category', formData.category);
      body.append('targetAmount', String(targetAmount));
      body.append('image', selectedImage);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 60_000);
      let response: Response;
      try {
        response = await fetch('/api/fundraisers', { method: 'POST', body, signal: controller.signal });
      } finally {
        window.clearTimeout(timeout);
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not submit this fundraiser.');

      setIsSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof DOMException && submitError.name === 'AbortError'
        ? 'The upload took too long. Please try a smaller image or try again.'
        : submitError instanceof Error ? submitError.message : 'We could not submit this fundraiser.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#e9f0e9] text-[#1e5b49]">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight">Request Submitted</h1>
          <p className="mb-10 text-lg text-[#66716a]">Your help request has been received and is being verified by our team. It will be live on the platform within 24 hours.</p>
          <Link href="/fundraise" className="rounded-full bg-[#17221e] px-10 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-[#1e5b49]">
            Back to Fundraisers
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/fundraise" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#66716a] transition-colors hover:text-[#1e5b49]">
          <ChevronLeft size={18} /> Back to listing
        </Link>

        <div className="overflow-hidden rounded-[40px] border border-[#d9d6ce] bg-white shadow-sm">
          <div className="border-b border-[#f6f4ef] bg-[#17221e] p-8 text-white md:p-12">
            <h1 className="mb-2 text-3xl font-black tracking-tight">Start a Fundraiser</h1>
            <p className="text-white/60">Tell your story and get the support you need.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 p-8 md:p-12">
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#17221e]">
                  <Type size={16} className="text-[#e1ad45]" /> Fundraiser Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Help Baby Tobi's Heart Surgery"
                  className="w-full rounded-2xl bg-[#f6f4ef] px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#17221e]">
                    <Plus size={16} className="text-[#e1ad45]" /> Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full appearance-none rounded-2xl bg-[#f6f4ef] px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]"
                  >
                    <option value="medical">Medical</option>
                    <option value="education">Education</option>
                    <option value="housing">Housing</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#17221e]">
                    <Target size={16} className="text-[#e1ad45]" /> Target Amount (₦)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="e.g. 500000"
                    className="w-full rounded-2xl bg-[#f6f4ef] px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#17221e]">
                  <FileText size={16} className="text-[#e1ad45]" /> The Story
                </label>
                <textarea
                  required
                  maxLength={10000}
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the situation and why you need help..."
                  className="w-full resize-none rounded-2xl bg-[#f6f4ef] px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]"
                />
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#17221e]">
                  <ImageIcon size={16} className="text-[#e1ad45]" /> Cover Image
                </label>
                <label className="relative flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-[32px] border-2 border-dashed border-[#d9d6ce] bg-[#f6f4ef] transition-all hover:bg-[#e9f0e9]">
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Selected fundraiser cover preview" fill unoptimized sizes="100vw" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <div className={`relative flex flex-col items-center justify-center px-6 py-8 text-center ${imagePreview ? 'bg-[#17221e]/70 text-white' : ''}`}>
                    <ImageIcon className="mb-3 h-10 w-10" />
                    <p className="mb-2 text-sm font-bold">{imagePreview ? 'Choose a different image' : 'Click to upload or drag and drop'}</p>
                    <p className="text-xs opacity-80">JPG, PNG or WEBP, up to 8 MB</p>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handleImageChange(e.target.files?.[0])} />
                </label>
                <p className="mt-2 text-[10px] italic text-[#66716a]">Your image is securely stored in Supabase Storage.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#1e5b49] py-5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[#1e5b49]/20 transition-all hover:bg-[#17221e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Uploading and submitting…' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
