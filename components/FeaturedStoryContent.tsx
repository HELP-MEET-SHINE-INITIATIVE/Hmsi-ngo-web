'use client';

import Image from 'next/image';
import Link from 'next/link';
import PromotedSharePanel from './PromotedSharePanel';
import { ArrowLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { trackStoryClick } from '../lib/storyAnalytics';

type GalleryImage = { id: string; image_url: string; caption: string | null; sort_order: number };
type FeaturedStory = { id: string; title: string; excerpt: string; body: string; category: string; image_url: string | null; author_name: string; published_at: string | null; created_at: string; gallery_images?: GalleryImage[] };

function StoryImage({ story, sizes }: { story: FeaturedStory; sizes: string }) {
  return story.image_url ? <Image src={story.image_url} alt={story.title} fill sizes={sizes} className="object-cover" /> : <Image src="/images/outreach-10.png" alt="HMSI community field work" fill sizes={sizes} className="object-cover" />;
}

export default function FeaturedStoryContent() {
  const params = useParams();
  const id = params.id as string;
  const [story, setStory] = useState<FeaturedStory | null>(null);
  const [relatedStories, setRelatedStories] = useState<FeaturedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const storyResponse = await fetch(`/api/stories?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const storyResult = await storyResponse.json();
        if (!storyResponse.ok || !storyResult.stories?.[0]) throw new Error(storyResult.error || 'Story not found.');
        const currentStory = storyResult.stories[0] as FeaturedStory;
        const [categoryResponse, fallbackResponse] = await Promise.all([
          fetch(`/api/stories?exclude=${encodeURIComponent(id)}&category=${encodeURIComponent(currentStory.category)}&limit=3`, { cache: 'no-store' }),
          fetch(`/api/stories?exclude=${encodeURIComponent(id)}&limit=20`, { cache: 'no-store' }),
        ]);
        const categoryResult = categoryResponse.ok ? await categoryResponse.json() : { stories: [] };
        const fallbackResult = fallbackResponse.ok ? await fallbackResponse.json() : { stories: [] };
        const candidates = [...(Array.isArray(categoryResult.stories) ? categoryResult.stories : []), ...(Array.isArray(fallbackResult.stories) ? fallbackResult.stories : [])] as FeaturedStory[];
        const related = candidates.filter((candidate, index, all) => candidate.id !== id && all.findIndex((item) => item.id === candidate.id) === index).slice(0, 3);
        if (!active) return;
        setStory(currentStory);
        setRelatedStories(related);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Story not found.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  if (isLoading) return <main className="flex min-h-[70vh] items-center justify-center bg-[#f6f4ef] text-[#66716a]">Loading story…</main>;
  if (error || !story) return <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[#f6f4ef] px-6 text-center"><h1 className="text-3xl font-black text-[#17221e]">{error || 'Story not found.'}</h1><Link href="/#featured-stories" className="mt-5 inline-flex items-center gap-2 font-black text-[#1e5b49]"><ArrowLeft size={16} /> Back to featured stories</Link></main>;

  return <main className="bg-[#f6f4ef] px-6 py-12 text-[#17221e] sm:py-20">
    <article className="mx-auto max-w-4xl">
      <Link href="/#featured-stories" className="inline-flex items-center gap-2 text-sm font-black text-[#66716a] transition hover:text-[#1e5b49]"><ArrowLeft size={17} /> Back to featured stories</Link>
      <header className="mt-10"><p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">{story.category}</p><h1 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">{story.title}</h1><div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest text-[#66716a]"><span className="inline-flex items-center gap-2"><Calendar size={14} /> {new Date(story.published_at || story.created_at).toLocaleDateString('en-NG')}</span><span>By {story.author_name}</span></div></header>
      <div className="relative mt-10 h-72 overflow-hidden rounded-[32px] bg-[#17221e] sm:h-[460px]"><StoryImage story={story} sizes="(max-width: 640px) 100vw, 896px" /></div>
      <p className="mt-10 text-xl font-bold leading-9 text-[#66716a]">{story.excerpt}</p>
      <div className="prose prose-lg mt-8 max-w-none whitespace-pre-line leading-8 text-[#17221e]"><p>{story.body}</p></div>
      {story.gallery_images?.length ? <section aria-labelledby="story-gallery" className="mt-12 border-t border-[#d9d6ce] pt-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Outreach documentation</p><h2 id="story-gallery" className="mt-2 text-3xl font-black">Field gallery</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{story.gallery_images.map((image) => <figure key={image.id} className="overflow-hidden rounded-3xl bg-white"><div className="relative h-64 bg-[#17221e]"><Image src={image.image_url} alt={image.caption || 'HMSI outreach gallery image'} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /></div>{image.caption && <figcaption className="p-4 text-sm leading-6 text-[#66716a]">{image.caption}</figcaption>}</figure>)}</div></section> : null}
      <div className="mt-10 border-t border-[#d9d6ce] pt-6"><PromotedSharePanel title={story.title} description={story.excerpt} type="story" /></div>
    </article>
    <section aria-labelledby="related-field-stories" className="mx-auto mt-16 max-w-6xl border-t border-[#d9d6ce] pt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Continue reading</p><h2 id="related-field-stories" className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Related field stories</h2></div><Link href="/stories" className="text-xs font-black uppercase tracking-widest text-[#1e5b49]">All field stories</Link></div>{relatedStories.length ? <div className="mt-7 grid gap-5 md:grid-cols-3">{relatedStories.map((related) => { const href = `/stories/${related.id}`; return <Link key={related.id} href={href} onClick={() => trackStoryClick(href)} className="group rounded-3xl border border-[#d9d6ce] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#1e5b49]/40 hover:shadow-lg"><div className="relative h-36 overflow-hidden rounded-2xl bg-[#17221e]"><StoryImage story={related} sizes="(max-width: 768px) 100vw, 33vw" /></div><p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#b56b3b]">{related.category}</p><p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#66716a]"><Calendar size={11} /> {new Date(related.published_at || related.created_at).toLocaleDateString('en-NG')}</p><h3 className="mt-2 text-lg font-black leading-tight">{related.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-[#66716a]">{related.excerpt}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#1e5b49]">Read story <ArrowUpRight size={14} /></span></Link>; })}</div> : <div className="mt-7 rounded-3xl border border-dashed border-[#c8c7bf] bg-white p-8 text-sm leading-6 text-[#66716a]">More published field stories will appear here as they are approved. <Link href="/stories" className="font-black text-[#1e5b49]">Explore the field story archive</Link>.</div>}</section>
  </main>;
}
