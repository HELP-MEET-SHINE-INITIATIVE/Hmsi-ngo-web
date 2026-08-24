'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type NewsArticle = { id: string; headline: string; summary: string; body: string; body_format?: string; category: string; image_url: string | null; author_name: string; published_at: string | null; created_at: string };

function InlineRichText({ text }: { text: string }) { return <>{text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part.startsWith('_') && part.endsWith('_') ? <em key={index}>{part.slice(1, -1)}</em> : part)}</>; }
function ArticleBody({ article }: { article: NewsArticle }) { if (article.body_format !== 'markdown_lite') return <p>{article.body}</p>; return <>{article.body.split('\n').map((line, index) => !line.trim() ? null : line.startsWith('## ') ? <h2 key={index} className="mt-7 text-2xl font-black"><InlineRichText text={line.slice(3)} /></h2> : line.startsWith('- ') ? <li key={index} className="ml-6 list-disc"><InlineRichText text={line.slice(2)} /></li> : <p key={index} className="mt-4"><InlineRichText text={line} /></p>)}</>; }

export default function NewsArticleContent() {
  const params = useParams();
  const id = params.id as string;
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    fetch(`/api/news?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.articles?.[0]) throw new Error(result.error || 'News article not found.');
        setArticle(result.articles[0]);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'News article not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const shareArticle = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: article?.headline || 'HMSI News', text: article?.summary || 'Read the latest HMSI news.', url });
        setShareStatus('News shared successfully.');
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus('News link copied.');
      }
    } catch (shareError) {
      if (!(shareError instanceof DOMException && shareError.name === 'AbortError')) setShareStatus('Unable to share right now. You can copy the page URL from your browser.');
    }
  };

  if (isLoading) return <main className="flex min-h-[70vh] items-center justify-center bg-[#f6f4ef] text-[#66716a]">Loading article…</main>;
  if (error || !article) return <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[#f6f4ef] px-6 text-center"><h1 className="text-3xl font-black">{error || 'News article not found.'}</h1><Link href="/news" className="mt-5 inline-flex items-center gap-2 font-black text-[#1e5b49]"><ArrowLeft size={16} /> Back to news</Link></main>;

  return <main className="bg-[#f6f4ef] px-6 py-12 text-[#17221e] sm:py-20"><article className="mx-auto max-w-4xl"><Link href="/news" className="inline-flex items-center gap-2 text-sm font-black text-[#66716a] transition hover:text-[#1e5b49]"><ArrowLeft size={17} /> Back to newsroom</Link><header className="mt-10"><p className="text-xs font-black uppercase tracking-[0.22em] text-[#b56b3b]">{article.category}</p><h1 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">{article.headline}</h1><div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest text-[#66716a]"><span className="inline-flex items-center gap-2"><Calendar size={14} /> {new Date(article.published_at || article.created_at).toLocaleDateString('en-NG')}</span><span>By {article.author_name}</span></div></header><div className="relative mt-10 h-72 overflow-hidden rounded-[32px] bg-[#17221e] sm:h-[460px]">{article.image_url ? <Image src={article.image_url} alt={article.headline} fill sizes="(max-width: 640px) 100vw, 896px" className="object-cover" /> : <Image src="/images/outreach-10.png" alt="HMSI field work" fill sizes="100vw" className="object-cover" />}</div><p className="mt-10 text-xl font-bold leading-9 text-[#66716a]">{article.summary}</p><div className="prose prose-lg mt-8 max-w-none whitespace-pre-line leading-8 text-[#17221e]"><ArticleBody article={article} /></div><div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[#d9d6ce] pt-6"><button type="button" onClick={shareArticle} className="inline-flex items-center gap-2 rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#17221e] focus:outline-none focus:ring-2 focus:ring-[#1e5b49] focus:ring-offset-2"><Share2 size={15} /> Share news</button>{shareStatus && <p className="text-sm font-bold text-[#1e5b49]" role="status" aria-live="polite">{shareStatus}</p>}</div></article></main>;
}
