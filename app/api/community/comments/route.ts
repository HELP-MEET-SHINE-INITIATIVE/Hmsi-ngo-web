import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const postId = String(body.postId || '').trim();
    const authorName = String(body.authorName || '').trim();
    const authorRole = String(body.authorRole || '').trim().toLowerCase();
    const content = String(body.content || '').trim();
    if (!postId || !authorName || !content || content.length > 2000) return NextResponse.json({ error: 'A post, name, and comment up to 2,000 characters are required.' }, { status: 400 });
    if (!['volunteer', 'worker', 'admin'].includes(authorRole)) return NextResponse.json({ error: 'Invalid author role.' }, { status: 400 });

    const { data, error } = await admin
      .from('community_comments')
      .insert({ post_id: postId, author_name: authorName, author_role: authorRole, content })
      .select('id,post_id,author_name,author_role,content,created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Community] Failed to create comment:', message);
    return NextResponse.json({ error: `We could not create the comment: ${message}` }, { status: 500 });
  }
}
