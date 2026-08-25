import type { Metadata } from 'next';
import FeaturedStoryContent from '../../../components/FeaturedStoryContent';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function absoluteImageUrl(image: string | null) {
  if (!image) return 'https://www.hmsi.org.ng/logo.png';
  return image.startsWith('http') ? image : `https://www.hmsi.org.ng${image}`;
}

async function loadPublishedStory(id: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.from('featured_story_drafts').select('id,title,excerpt,image_url,author_name,status,published_at,created_at').eq('id', id).in('status', ['published', 'approved']).maybeSingle();
  if (error) {
    console.warn('[StoryPage] Story metadata unavailable:', error.message);
    return null;
  }
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const story = await loadPublishedStory(id);
  if (!story) return { title: 'HMSI Field Story', description: 'Read an approved field story from Help Meet Shine Initiative communities.' };

  const title = `${story.title} | HMSI Field Story`;
  const description = story.excerpt || 'Read an approved field story from Help Meet Shine Initiative communities.';
  const url = `https://www.hmsi.org.ng/stories/${id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'Help Meet Shine Initiative',
      images: [{ url: absoluteImageUrl(story.image_url), alt: story.title }],
      publishedTime: story.published_at || story.created_at,
      authors: [story.author_name || 'Help Meet Shine Initiative'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteImageUrl(story.image_url)],
    },
  };
}

export default function FeaturedStoryPage() {
  return <FeaturedStoryContent />;
}
