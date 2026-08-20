import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

type Audience = 'volunteer' | 'worker' | 'all';

function validAudience(value: string): value is Audience {
  return ['volunteer', 'worker', 'all'].includes(value);
}

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ posts: [] });

  const { searchParams } = new URL(request.url);
  const audience = searchParams.get('audience') || 'all';
  const actorKey = searchParams.get('actorKey') || '';
  const requestedAudience = validAudience(audience) ? audience : 'all';

  let query = admin
    .from('community_posts')
    .select('id,audience,author_name,author_role,content,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (requestedAudience !== 'all') query = query.in('audience', [requestedAudience, 'all']);

  const { data: posts, error: postsError } = await query;
  if (postsError) return NextResponse.json({ error: 'Community posts are temporarily unavailable.' }, { status: 503 });

  const ids = (posts || []).map((post) => post.id);
  if (ids.length === 0) return NextResponse.json({ posts: [] });

  const [{ data: comments }, { data: likes }] = await Promise.all([
    admin.from('community_comments').select('id,post_id,author_name,author_role,content,created_at').in('post_id', ids).order('created_at', { ascending: true }),
    admin.from('community_likes').select('post_id,actor_key').in('post_id', ids),
  ]);

  return NextResponse.json({ posts: (posts || []).map((post) => ({
    ...post,
    comments: (comments || []).filter((comment) => comment.post_id === post.id),
    likeCount: (likes || []).filter((like) => like.post_id === post.id).length,
    likedByMe: Boolean(actorKey && (likes || []).some((like) => like.post_id === post.id && like.actor_key === actorKey)),
  })) });
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const audience = String(body.audience || '').trim().toLowerCase();
    const authorName = String(body.authorName || '').trim();
    const authorRole = String(body.authorRole || '').trim().toLowerCase();
    const content = String(body.content || '').trim();
    if (!validAudience(audience)) return NextResponse.json({ error: 'Choose a valid room.' }, { status: 400 });
    if (!authorName || !content || content.length > 5000) return NextResponse.json({ error: 'A name and post up to 5,000 characters are required.' }, { status: 400 });
    if (!['volunteer', 'worker', 'admin'].includes(authorRole)) return NextResponse.json({ error: 'Invalid author role.' }, { status: 400 });
    if (audience === 'worker' && authorRole === 'volunteer') return NextResponse.json({ error: 'Volunteers cannot post in the worker room.' }, { status: 403 });

    const { data, error } = await admin
      .from('community_posts')
      .insert({ audience, author_name: authorName, author_role: authorRole, content })
      .select('id,audience,author_name,author_role,content,created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ post: { ...data, comments: [], likeCount: 0, likedByMe: false } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Community] Failed to create post:', message);
    return NextResponse.json({ error: `We could not create the post: ${message}` }, { status: 500 });
  }
}
