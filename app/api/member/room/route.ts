import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getMemberSessionFromCookie } from '../../../../lib/memberSession';
import { checkCommunityAntiSpam } from '../../../../lib/communityAntiSpam';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
async function getMember(request: Request) {
  const session = getMemberSessionFromCookie(request.headers.get('cookie')); const admin = getSupabaseAdmin();
  if (!admin || !session || session.holderRole !== 'member') return { admin: null, member: null };
  const member = await admin.from('hmsi_members').select('id,name,email,status').eq('id', session.holderId).eq('email', session.email).eq('status', 'active').maybeSingle();
  return { admin, member: member.data || null };
}
export async function GET(request: Request) {
  const { admin, member } = await getMember(request); if (!admin) return error('Activate an approved HMSI member ID card to access the member room.', 401); if (!member) return error('This HMSI member session is no longer active.', 403);
  const posts = await admin.from('community_posts').select('id,audience,author_name,author_role,content,created_at').in('audience', ['member', 'all']).eq('moderation_status', 'published').order('created_at', { ascending: false }).limit(100);
  if (posts.error) return error('Member-room posts are temporarily unavailable.', 503);
  const ids = (posts.data || []).map((post) => post.id); if (!ids.length) return NextResponse.json({ member, posts: [] });
  const [comments, likes] = await Promise.all([
    admin.from('community_comments').select('id,post_id,author_name,author_role,content,created_at').in('post_id', ids).eq('moderation_status', 'published').order('created_at', { ascending: true }),
    admin.from('community_likes').select('post_id,actor_key').in('post_id', ids),
  ]);
  const actorKey = `${member.email}:member`;
  const ranked = (posts.data || []).map((post) => { const postLikes = (likes.data || []).filter((like) => like.post_id === post.id); const postComments = (comments.data || []).filter((comment) => comment.post_id === post.id); const hours = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / 3_600_000); const score = postLikes.length * 3 + postComments.length * 2 + Math.max(0, 24 - hours) / 24; return { ...post, comments: postComments, likeCount: postLikes.length, likedByMe: postLikes.some((like) => like.actor_key === actorKey), rankingScore: score }; }).sort((a, b) => b.rankingScore - a.rankingScore).map(({ rankingScore, ...post }) => post);
  return NextResponse.json({ member, posts: ranked });
}
export async function POST(request: Request) {
  const { admin, member } = await getMember(request); if (!admin) return error('Activate an approved HMSI member ID card to use the member room.', 401); if (!member) return error('This HMSI member session is no longer active.', 403);
  const body = await request.json().catch(() => ({})); const action = typeof body.action === 'string' ? body.action : ''; const actorKey = `${member.email}:member`;
  if (action === 'post') {
    const raw = typeof body.content === 'string' ? body.content.trim() : ''; if (!raw || raw.length > 5000) return error('A member-room post up to 5,000 characters is required.');
    const spam = await checkCommunityAntiSpam(admin, 'community_posts', actorKey, raw); if (!spam.allowed) return error(spam.error, spam.status || 503);
    const inserted = await admin.from('community_posts').insert({ audience: 'member', author_name: member.name, author_role: 'member', author_key: actorKey, content: spam.normalized, content_hash: spam.hash, moderation_status: spam.moderationStatus, spam_score: spam.spamScore }).select('id,audience,author_name,author_role,content,created_at').single(); if (inserted.error) return error('The member-room post could not be saved.', 503);
    return NextResponse.json({ post: inserted.data, moderationStatus: spam.moderationStatus }, { status: spam.moderationStatus === 'held' ? 202 : 201 });
  }
  const postId = typeof body.post_id === 'string' ? body.post_id.trim() : ''; if (!postId) return error('A member-room post is required.');
  const visiblePost = await admin.from('community_posts').select('id').eq('id', postId).in('audience', ['member', 'all']).eq('moderation_status', 'published').maybeSingle(); if (visiblePost.error || !visiblePost.data) return error('This member-room post was not found.', 404);
  if (action === 'comment') {
    const raw = typeof body.content === 'string' ? body.content.trim() : ''; if (!raw || raw.length > 3000) return error('A comment up to 3,000 characters is required.');
    const spam = await checkCommunityAntiSpam(admin, 'community_comments', actorKey, raw); if (!spam.allowed) return error(spam.error, spam.status || 503);
    const inserted = await admin.from('community_comments').insert({ post_id: postId, author_name: member.name, author_role: 'member', author_key: actorKey, content: spam.normalized, content_hash: spam.hash, moderation_status: spam.moderationStatus, spam_score: spam.spamScore }).select('id,post_id,author_name,author_role,content,created_at').single(); if (inserted.error) return error('The member-room comment could not be saved.', 503);
    return NextResponse.json({ comment: inserted.data, moderationStatus: spam.moderationStatus }, { status: spam.moderationStatus === 'held' ? 202 : 201 });
  }
  if (action === 'like') {
    const existing = await admin.from('community_likes').select('id').eq('post_id', postId).eq('actor_key', actorKey).maybeSingle(); if (existing.data) { const removed = await admin.from('community_likes').delete().eq('id', existing.data.id); if (removed.error) return error('The reaction could not be updated.', 503); return NextResponse.json({ liked: false }); }
    const inserted = await admin.from('community_likes').insert({ post_id: postId, actor_key: actorKey }); if (inserted.error) return error('The reaction could not be updated.', 503); return NextResponse.json({ liked: true });
  }
  return error('Unsupported member-room action.');
}
