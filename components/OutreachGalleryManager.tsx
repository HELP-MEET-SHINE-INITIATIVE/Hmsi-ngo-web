'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Save, Trash2 } from 'lucide-react';

type GalleryImage = { id: string; story_id: string; image_url: string; caption: string | null; sort_order: number; created_at: string; updated_at: string };

export default function OutreachGalleryManager({ storyId }: { storyId: string }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/gallery?storyId=${encodeURIComponent(storyId)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load gallery.');
    setImages(result.images || []);
  }, [storyId]);

  useEffect(() => { void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load gallery.')); }, [load]);

  const patchImage = async (image: GalleryImage, nextCaption: string, nextSortOrder: number) => {
    const response = await fetch('/api/admin/gallery', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId: image.id, caption: nextCaption, sortOrder: nextSortOrder }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to save gallery image.');
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) { setError('Choose a JPG, PNG, or WEBP image first.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(); form.set('storyId', storyId); form.set('caption', caption); form.set('image', file);
      const response = await fetch('/api/admin/gallery', { method: 'POST', body: form }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to upload gallery image.');
      setFile(null); setCaption(''); await load(); setNotice('Gallery image added.');
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload gallery image.'); } finally { setBusy(false); }
  };

  const save = async (image: GalleryImage, nextCaption = image.caption || '', nextSortOrder = image.sort_order) => {
    setBusy(true); setError(''); setNotice('');
    try { await patchImage(image, nextCaption, nextSortOrder); await load(); setNotice('Gallery image updated.'); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save gallery image.'); } finally { setBusy(false); }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const image = images[index];
    const neighbor = images[index + direction];
    if (!image || !neighbor) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await patchImage(image, image.caption || '', neighbor.sort_order);
      await patchImage(neighbor, neighbor.caption || '', image.sort_order);
      await load(); setNotice('Gallery photo priority updated.');
    } catch (moveError) { setError(moveError instanceof Error ? moveError.message : 'Unable to update gallery priority.'); } finally { setBusy(false); }
  };

  const remove = async (image: GalleryImage) => {
    if (!window.confirm('Delete this photo from Outreach Gallery?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/gallery', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId: image.id }) }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete gallery image.');
      await load(); setNotice(result.message || 'Gallery photo deleted.');
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete gallery image.'); } finally { setBusy(false); }
  };

  return <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6">
    <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#b56b3b]">Outreach gallery</p><h2 className="mt-2 text-2xl font-black">Story photos</h2><p className="mt-2 text-sm leading-6 text-[#66716a]">Photos are optimized, stored under this story’s gallery path, and may be removed only through this audited control.</p></div>
    {(error || notice) && <p role="status" className={`mt-5 rounded-2xl p-4 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || notice}</p>}
    <form onSubmit={upload} className="mt-6 grid gap-3 rounded-2xl bg-[#f6f4ef] p-4 md:grid-cols-[1fr_1fr_auto]"><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} className="text-sm" /><input value={caption} maxLength={300} onChange={(event) => setCaption(event.target.value)} placeholder="Accessible image caption (optional)" className="rounded-xl bg-white px-3 py-2 text-sm" /><button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><ImagePlus size={15} />Add gallery image</button></form>
    <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{images.map((image, index) => <article key={image.id} className="overflow-hidden rounded-2xl border border-[#d9d6ce]"><div className="relative h-48 bg-[#17221e]"><Image src={image.image_url} alt={image.caption || 'HMSI outreach gallery image'} fill className="object-cover" sizes="(max-width: 1024px) 50vw, 33vw" /></div><div className="space-y-3 p-4"><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Photo {index + 1} · priority {image.sort_order}</label><input defaultValue={image.caption || ''} maxLength={300} onBlur={(event) => { if (event.target.value !== (image.caption || '')) void save(image, event.target.value); }} className="w-full rounded-xl bg-[#f6f4ef] px-3 py-2 text-sm" aria-label={`Caption for photo ${index + 1}`} /><div className="flex flex-wrap gap-2"><button disabled={busy || index === 0} onClick={() => void move(index, -1)} type="button" className="rounded-lg border p-2 disabled:opacity-40" aria-label={`Move photo ${index + 1} up`}><ArrowUp size={15} /></button><button disabled={busy || index === images.length - 1} onClick={() => void move(index, 1)} type="button" className="rounded-lg border p-2 disabled:opacity-40" aria-label={`Move photo ${index + 1} down`}><ArrowDown size={15} /></button><button disabled={busy} onClick={() => void save(image)} type="button" className="inline-flex items-center gap-1 rounded-lg border px-3 text-xs font-black text-[#1e5b49] disabled:opacity-40"><Save size={14} />Save</button><button disabled={busy} onClick={() => void remove(image)} type="button" className="ml-auto rounded-lg border border-red-200 p-2 text-red-600 disabled:opacity-40" aria-label={`Delete image ${index + 1} from Outreach Gallery`} title="Delete image"><Trash2 size={15} /></button></div></div></article>)}</div>
    {!images.length && <p className="mt-6 rounded-2xl border border-dashed border-[#d9d6ce] p-6 text-sm text-[#66716a]">No gallery photos yet. Add the first image above.</p>}
  </section>;
}
