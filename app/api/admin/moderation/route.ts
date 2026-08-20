import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getNewsletterViewer } from '../../../../lib/newsletterAccess';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const { data, error } = await admin.from('community_comment_flags').select('id,comment_id,post_id,reporter_email,reporter_role,reason,status,reviewed_by,reviewed_at,created_at').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Moderation records are unavailable. Run supabase/moderation_access_patch.sql.' }, { status: 503 });
  return NextResponse.json({ flags: data || [] });
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  try {
    const body = await request.json();
    const viewer = await getNewsletterViewer(request, admin, { email: body.email, role: body.role });
    if (!viewer || (viewer.role !== 'worker' && viewer.role !== 'admin')) return NextResponse.json({ error: 'Only approved workers or administrators can flag comments.' }, { status: 403 });
    const commentId = String(body.commentId || '').trim();
    const reason = String(body.reason || 'Inappropriate or harmful comment.').trim().slice(0, 500);
    if (!commentId) return NextResponse.json({ error: 'A comment is required.' }, { status: 400 });
    const { data: comment } = await admin.from('community_comments').select('id,post_id').eq('id', commentId).maybeSingle();
    if (!comment) return NextResponse.json({ error: 'This comment was not found.' }, { status: 404 });
    const { data, error } = await admin.from('community_comment_flags').upsert({ comment_id: comment.id, post_id: comment.post_id, reporter_email: viewer.email, reporter_role: viewer.role, reason, status: 'pending' }, { onConflict: 'comment_id,reporter_email' }).select('id,comment_id,post_id,reason,status,created_at').single();
    if (error) throw error;
    return NextResponse.json({ flag: data }, { status: 201 });
  } catch { return NextResponse.json({ error: 'We could not flag this comment.' }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const client = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  try {
    const body = await request.json();
    const action = String(body.action || '');
    if (action === 'delete_comment') {
      const commentId = String(body.commentId || '').trim();
      if (!commentId) return NextResponse.json({ error: 'A comment is required.' }, { status: 400 });
      const { error } = await client.from('community_comments').delete().eq('id', commentId);
      if (error) throw error;
      await client.from('community_comment_flags').update({ status: 'resolved', reviewed_by: adminEmail, reviewed_at: new Date().toISOString() }).eq('comment_id', commentId);
      return NextResponse.json({ deleted: true });
    }
    const flagId = String(body.flagId || '').trim();
    const status = body.status === 'dismissed' ? 'dismissed' : 'resolved';
    if (!flagId) return NextResponse.json({ error: 'A moderation flag is required.' }, { status: 400 });
    const { error } = await client.from('community_comment_flags').update({ status, reviewed_by: adminEmail, reviewed_at: new Date().toISOString() }).eq('id', flagId);
    if (error) throw error;
    return NextResponse.json({ updated: true });
  } catch { return NextResponse.json({ error: 'We could not complete the moderation action.' }, { status: 500 }); }
}
