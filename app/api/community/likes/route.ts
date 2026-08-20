import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const postId = String(body.postId || '').trim();
    const actorKey = String(body.actorKey || '').trim();
    if (!postId || !actorKey) return NextResponse.json({ error: 'A post and actor are required.' }, { status: 400 });

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
