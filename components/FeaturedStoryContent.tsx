'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type FeaturedStory = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  image_url: string | null;
  author_name: string;
  published_at: string | null;
  created_at: string;
};

export default function FeaturedStoryContent() {
  const params = useParams();
  const id = params.id as string;
  const [story, setStory] = useState<FeaturedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    fetch(`/api/stories?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.stories?.[0]) throw new Error(result.error || 'Story not found.');
        setStory(result.stories[0]);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Story not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const shareStory = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: story?.title || 'HMSI field story', text: story?.excerpt || 'Read this HMSI field story.', url });
        setShareStatus('Story shared successfully.');
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus('Story link copied.');
      }
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === 'AbortError')) setShareStatus('Unable to share right now. You can copy the page URL from your browser.');
    }
  };

  if (isLoading) return <main className="flex min-h-[70vh] items-center justify-center bg-[#f6f4ef] text-[#66716a]">Loading story…</main>;
  if (error || !story) return <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[#f6f4ef] px-6 text-center"><h1 className="text-3xl font-black text-[#17221e]">{error || 'Story not found.'}</h1><Link href="/#featured-stories" className="mt-5 inline-flex items-center gap-2 font-black text-[#1e5b49]"><ArrowLeft size={16} /> Back to featured stories</Link></main>;

  return <main className="bg-[#f6f4ef] px-6 py-12 text-[#17221e] sm:py-20"><article className="mx-auto max-w-4xl"><Link href="/#featured-stories" className="inline-flex items-center gap-2 text-sm font-black text-[#66716a] transition hover:text-[#1e5b49]"><ArrowLeft size={17} /> Back to featured stories</Link><header className="mt-10"><p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">{story.category}</p><h1 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">{story.title}</h1><div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest text-[#66716a]"><span className="inline-flex items-center gap-2"><Calendar size={14} /> {new Date(story.published_at || story.created_at).toLocaleDateString('en-NG')}</span><span>By {story.author_name}</span></div></header><div className="relative mt-10 h-72 overflow-hidden rounded-[32px] bg-[#17221e] sm:h-[460px]">{story.image_url ? <img src={story.image_url} alt={story.title} className="h-full w-full object-cover" /> : <Image src="/images/outreach-10.png" alt="HMSI community field work" fill sizes="100vw" className="object-cover" />}</div><p className="mt-10 text-xl font-bold leading-9 text-[#66716a]">{story.excerpt}</p><div className="prose prose-lg mt-8 max-w-none whitespace-pre-line leading-8 text-[#17221e]"><p>{story.body}</p></div><div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[#d9d6ce] pt-6"><button type="button" onClick={shareStory} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#17221e] focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2"><Share2 size={15} /> Share story</button>{shareStatus && <p className="text-sm font-bold text-[#1e5b49]" role="status" aria-live="polite">{shareStatus}</p>}</div></article></main>;
}
