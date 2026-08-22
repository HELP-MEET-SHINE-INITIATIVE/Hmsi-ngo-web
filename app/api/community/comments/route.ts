import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getNewsletterViewer } from '../../../../lib/newsletterAccess';
import { checkCommunityAntiSpam } from '../../../../lib/communityAntiSpam';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const postId = String(body.postId || '').trim();
    const content = String(body.content || '').trim();
    if (!postId || !content || content.length > 2000) return NextResponse.json({ error: 'A post and comment up to 2,000 characters are required.' }, { status: 400 });
    const viewer = await getNewsletterViewer(request, admin, { email: body.email, role: body.authorRole });
    if (!viewer) return NextResponse.json({ error: 'Sign in with an approved HMSI account to comment.' }, { status: 401 });
    const { data: post } = await admin.from('community_posts').select('audience').eq('id', postId).maybeSingle();
    if (!post) return NextResponse.json({ error: 'This post was not found.' }, { status: 404 });
    if (viewer.role === 'worker') return NextResponse.json({ error: 'Workers use HMSI Worker Assistance for workflow guidance; direct room commenting is disabled.' }, { status: 403 });
    if (post.audience === 'worker' && viewer.role !== 'admin') return NextResponse.json({ error: 'Only administrators may interact with worker-room posts.' }, { status: 403 });
    const actorKey = `${viewer.email}:${viewer.role}`;
    const spam = await checkCommunityAntiSpam(admin, 'community_comments', actorKey, content);
    if (!spam.allowed) return NextResponse.json({ error: spam.error }, { status: spam.status || 503 });

    const { data, error } = await admin
      .from('community_comments')
      .insert({ post_id: postId, author_name: viewer.name, author_role: viewer.role, author_key: actorKey, content: spam.normalized, content_hash: spam.hash, moderation_status: spam.moderationStatus, spam_score: spam.spamScore })
      .select('id,post_id,author_name,author_role,content,created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ comment: data, moderationStatus: spam.moderationStatus }, { status: spam.moderationStatus === 'held' ? 202 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Community] Failed to create comment:', message);
    return NextResponse.json({ error: `We could not create the comment: ${message}` }, { status: 500 });
  }
}
