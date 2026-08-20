'use client';

import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

type UploadViewer = { email: string; role: 'admin' | 'worker' | 'volunteer' };

type OptionalImageUploadProps = {
  viewer: UploadViewer;
  value: string;
  imagePath?: string;
  onChange: (imageUrl: string, imagePath?: string) => void;
  label?: string;
  helpText?: string;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function OptionalImageUpload({ viewer, value, onChange, label = 'Optional picture', helpText = 'JPG, PNG, or WEBP up to 8 MB. You can publish without a picture.' }: OptionalImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async (file?: File) => {
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

    setIsUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const query = new URLSearchParams({ email: viewer.email, role: viewer.role });
      const response = await fetch(`/api/uploads/publisher-image?${query.toString()}`, { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The image could not be uploaded.');
      onChange(result.imageUrl, result.imagePath);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The image could not be uploaded.');
    } finally {
      setIsUploading(false);
    }
  };

  return <div className="rounded-2xl border border-dashed border-[#d9d6ce] bg-[#f6f4ef] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-[#66716a]">{value ? <div role="img" aria-label="Selected picture preview" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(value).slice(1, -1)})` }} /> : <ImagePlus size={22} />}</div><div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-[#17221e]">{label}</p><p className="mt-1 text-xs leading-5 text-[#66716a]">{helpText}</p></div></div><div className="flex shrink-0 gap-2"><label className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49] shadow-sm transition hover:bg-[#e9f0e9] ${isUploading ? 'pointer-events-none opacity-60' : ''}`}><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploading} onChange={(event) => { handleChange(event.target.files?.[0]); event.currentTarget.value = ''; }} />{isUploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><ImagePlus size={14} /> {value ? 'Change picture' : 'Add picture'}</>}</label>{value && <button type="button" disabled={isUploading} onClick={() => { setError(''); onChange(''); }} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50"><Trash2 size={14} /> Remove</button>}</div></div>{error && <p className="mt-3 text-xs font-bold text-red-600" role="alert">{error}</p>}</div>;
}
