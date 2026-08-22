import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getNewsletterViewer } from '../../../../lib/newsletterAccess';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const postId = String(body.postId || '').trim();
    if (!postId) return NextResponse.json({ error: 'A post is required.' }, { status: 400 });
    const viewer = await getNewsletterViewer(request, admin, { email: body.email, role: body.role });
    if (!viewer) return NextResponse.json({ error: 'Sign in with an approved HMSI account to like posts.' }, { status: 401 });
    if (viewer.role === 'worker') return NextResponse.json({ error: 'Workers use HMSI Worker Assistance; direct community interactions are disabled.' }, { status: 403 });
    const { data: post } = await admin.from('community_posts').select('audience').eq('id', postId).maybeSingle();
    if (!post) return NextResponse.json({ error: 'This post was not found.' }, { status: 404 });
    if (post.audience === 'worker' && viewer.role !== 'admin') return NextResponse.json({ error: 'Only administrators may interact with worker-room posts.' }, { status: 403 });
    const actorKey = `${viewer.email}:${viewer.role}`;

    const { data: existing } = await admin
      .from('community_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('actor_key', actorKey)
      .maybeSingle();

    if (existing) {
      const { error } = await admin.from('community_likes').delete().eq('id', existing.id);
      if (error) throw error;
      return NextResponse.json({ liked: false });
    }

    const { error } = await admin.from('community_likes').insert({ post_id: postId, actor_key: actorKey });
    if (error) throw error;
    return NextResponse.json({ liked: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Community] Failed to toggle like:', message);
    return NextResponse.json({ error: `We could not update the like: ${message}` }, { status: 500 });
  }
}
