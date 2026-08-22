import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getNewsletterViewer } from '../../../lib/newsletterAccess';
import { checkCommunityAntiSpam } from '../../../lib/communityAntiSpam';

export const runtime = 'nodejs';

type Audience = 'volunteer' | 'worker' | 'all';

type DatabaseError = { code?: string; message?: string };

function explainDatabaseError(error: DatabaseError) {
  if (error.code === '42P01' || error.code === '42703') return 'Community tables are not migrated yet. Run the latest supabase/schema.sql in Supabase SQL Editor.';
  if (error.code === '42501') return 'Supabase rejected this post because the community insert policy is missing. Run the latest supabase/schema.sql in Supabase SQL Editor.';
  return error.message || 'Supabase rejected the community post.';
}

function validAudience(value: string): value is Audience {
  return ['volunteer', 'worker', 'all'].includes(value);
}

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ posts: [] });

  const { searchParams } = new URL(request.url);
  const audience = searchParams.get('audience') || 'all';
  const requestedAudience = validAudience(audience) ? audience : 'all';
  const viewer = await getNewsletterViewer(request, admin, {
    email: searchParams.get('email') || undefined,
    role: searchParams.get('role') || undefined,
  });
  if (!viewer) return NextResponse.json({ error: 'Sign in with an approved HMSI account to access community rooms.' }, { status: 401 });
  if (requestedAudience === 'worker' && viewer.role !== 'worker' && viewer.role !== 'admin') return NextResponse.json({ error: 'Only approved workers and administrators can access the worker room.' }, { status: 403 });
  const actorKey = `${viewer.email}:${viewer.role}`;

  let query = admin
    .from('community_posts')
    .select('id,audience,author_name,author_role,content,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  query = query.eq('moderation_status', 'published');
  if (requestedAudience !== 'all') query = query.in('audience', [requestedAudience, 'all']);

  const { data: posts, error: postsError } = await query;
  if (postsError) return NextResponse.json({ error: `Community tables are unavailable: ${explainDatabaseError(postsError)}` }, { status: 503 });

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
    const content = String(body.content || '').trim();
    if (!validAudience(audience)) return NextResponse.json({ error: 'Choose a valid room.' }, { status: 400 });
    if (!content || content.length > 5000) return NextResponse.json({ error: 'A post up to 5,000 characters is required.' }, { status: 400 });
    const viewer = await getNewsletterViewer(request, admin, { email: body.email, role: body.authorRole });
    if (!viewer) return NextResponse.json({ error: 'Sign in with an approved HMSI account to publish community posts.' }, { status: 401 });
    if (viewer.role === 'worker') return NextResponse.json({ error: 'Workers use HMSI Worker Assistance for workflow guidance; direct room posting is disabled.' }, { status: 403 });
    if (audience === 'worker' && viewer.role !== 'admin') return NextResponse.json({ error: 'Only administrators may post in the worker room.' }, { status: 403 });
    const actorKey = `${viewer.email}:${viewer.role}`;
    const spam = await checkCommunityAntiSpam(admin, 'community_posts', actorKey, content);
    if (!spam.allowed) return NextResponse.json({ error: spam.error }, { status: spam.status || 503 });

    const { data, error } = await admin
      .from('community_posts')
      .insert({ audience, author_name: viewer.name, author_role: viewer.role, author_key: actorKey, content: spam.normalized, content_hash: spam.hash, moderation_status: spam.moderationStatus, spam_score: spam.spamScore })
      .select('id,audience,author_name,author_role,content,created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ post: { ...data, comments: [], likeCount: 0, likedByMe: false }, moderationStatus: spam.moderationStatus }, { status: spam.moderationStatus === 'held' ? 202 : 201 });
  } catch (error) {
    const databaseError = error as DatabaseError;
    const message = explainDatabaseError(databaseError);
    console.error('[Community] Failed to create post:', databaseError);
    return NextResponse.json({ error: `We could not create the post: ${message}` }, { status: databaseError.code === '42P01' || databaseError.code === '42703' || databaseError.code === '42501' ? 503 : 500 });
  }
}
