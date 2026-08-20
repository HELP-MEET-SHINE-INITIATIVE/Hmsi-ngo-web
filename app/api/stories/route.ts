import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../lib/supabaseAdmin';
import { getNewsletterViewer, getNewsletterViewerPayload } from '../../../lib/newsletterAccess';

export const runtime = 'nodejs';

const MAX_TITLE = 160;
const MAX_EXCERPT = 320;
const MAX_BODY = 6000;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function getViewer(request: Request, admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  return getNewsletterViewer(request, admin, getNewsletterViewerPayload(request));
}

async function recordEvent(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, storyId: string, action: string, viewer: { email: string; role: 'admin' | 'worker' | 'volunteer' }, reason?: string) {
  await admin.from('featured_story_approval_events').insert({
    story_id: storyId,
    action,
    actor_email: viewer.email,
    actor_role: viewer.role,
    reason: reason || null,
  });
}

export async function GET(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ stories: [], setupRequired: true });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ stories: [], setupRequired: true });

  const viewer = await getViewer(request, admin);
  const storyId = new URL(request.url).searchParams.get('id')?.trim() || '';
  let query = admin
    .from('featured_story_drafts')
    .select('id,title,excerpt,body,category,image_url,author_name,author_email,author_role,status,rejection_reason,approved_by,approved_at,published_at,created_at,updated_at')
    .order('created_at', { ascending: false });

  if (!viewer) {
    query = query.eq('status', 'published').order('published_at', { ascending: false });
    if (storyId) query = query.eq('id', storyId);
  } else if (viewer.role !== 'admin') {
    query = query.eq('author_email', viewer.email);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Stories] Failed to load stories:', error.message);
    return NextResponse.json({ error: 'Stories are temporarily unavailable.' }, { status: 503 });
  }

  return NextResponse.json({ stories: data || [], viewerRole: viewer?.role || 'public', setupRequired: false });
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: 'Story publishing is not configured yet.' }, { status: 503 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Story publishing is not configured yet.' }, { status: 503 });

  const viewer = await getViewer(request, admin);
  if (!viewer) return NextResponse.json({ error: 'Only the administrator and approved active workers or volunteers can submit stories.' }, { status: 403 });

  const payload = await request.json().catch(() => ({}));
  const title = cleanText(payload.title, MAX_TITLE);
  const excerpt = cleanText(payload.excerpt, MAX_EXCERPT);
  const body = cleanText(payload.body, MAX_BODY);
  const category = cleanText(payload.category, 80) || 'HMSI field story';
  const imageUrl = cleanText(payload.image_url, 500) || null;

  if (title.length < 5 || excerpt.length < 20 || body.length < 40) {
    return NextResponse.json({ error: 'Add a title, an excerpt of at least 20 characters, and a story of at least 40 characters.' }, { status: 400 });
  }

  const isAdmin = viewer.role === 'admin';
  const { data: story, error } = await admin
    .from('featured_story_drafts')
    .insert({
      title,
      excerpt,
      body,
      category,
      image_url: imageUrl,
      author_name: viewer.name,
      author_email: viewer.email,
      author_role: viewer.role,
      status: isAdmin ? 'published' : 'pending_admin_approval',
      approved_by: isAdmin ? viewer.email : null,
      approved_at: isAdmin ? new Date().toISOString() : null,
      published_at: isAdmin ? new Date().toISOString() : null,
    })
    .select('id,title,status')
    .single();

  if (error || !story) {
    console.error('[Stories] Failed to create story:', error?.message);
    return NextResponse.json({ error: 'Unable to submit this story.' }, { status: 500 });
  }

  await recordEvent(admin, story.id, isAdmin ? 'published' : 'submitted', viewer);
  return NextResponse.json({ story, message: isAdmin ? 'Story published on the homepage.' : 'Story submitted for administrator approval.' }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: 'Story publishing is not configured yet.' }, { status: 503 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Story publishing is not configured yet.' }, { status: 503 });

  const viewer = await getViewer(request, admin);
  if (!viewer || viewer.role !== 'admin') return NextResponse.json({ error: 'Only the administrator can approve, reject, or publish stories.' }, { status: 403 });

  const payload = await request.json().catch(() => ({}));
  const id = cleanText(payload.id, 80);
  const action = payload.action === 'approve' || payload.action === 'reject' || payload.action === 'publish' || payload.action === 'update' ? payload.action : '';
  const reason = cleanText(payload.reason, 500);
  if (!id || !action) return NextResponse.json({ error: 'A story and review action are required.' }, { status: 400 });
  if (action === 'reject' && reason.length < 3) return NextResponse.json({ error: 'Add a short reason when requesting changes or rejecting a story.' }, { status: 400 });

  const { data: existing, error: lookupError } = await admin.from('featured_story_drafts').select('id,status').eq('id', id).maybeSingle();
  if (lookupError || !existing) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });

  if (action === 'update') {
    const title = cleanText(payload.title, MAX_TITLE);
    const excerpt = cleanText(payload.excerpt, MAX_EXCERPT);
    const body = cleanText(payload.body, MAX_BODY);
    const category = cleanText(payload.category, 80) || 'HMSI field story';
    const imageUrl = cleanText(payload.image_url, 500) || null;
    if (title.length < 5 || excerpt.length < 20 || body.length < 40) {
      return NextResponse.json({ error: 'Add a title, an excerpt of at least 20 characters, and a story of at least 40 characters.' }, { status: 400 });
    }
    const { data: story, error } = await admin
      .from('featured_story_drafts')
      .update({ title, excerpt, body, category, image_url: imageUrl })
      .eq('id', id)
      .select('id,title,status')
      .single();
    if (error || !story) {
      console.error('[Stories] Failed to edit story:', error?.message);
      return NextResponse.json({ error: 'Unable to edit this story.' }, { status: 500 });
    }
    await recordEvent(admin, id, 'updated', viewer);
    return NextResponse.json({ story, message: 'Story changes saved.' });
  }

  if (existing.status === 'published' && action !== 'update') return NextResponse.json({ error: 'Published stories can be edited with Edit or removed with Delete.' }, { status: 409 });

  const isPublishing = action === 'publish';
  const nextStatus = action === 'reject' ? 'rejected' : isPublishing ? 'published' : 'approved';
  if (isPublishing && existing.status !== 'approved') return NextResponse.json({ error: 'Approve the story before publishing it.' }, { status: 409 });

  const { data: story, error } = await admin
    .from('featured_story_drafts')
    .update({
      status: nextStatus,
      rejection_reason: action === 'reject' ? reason : null,
      approved_by: action === 'reject' ? null : viewer.email,
      approved_at: action === 'reject' ? null : new Date().toISOString(),
      published_at: isPublishing ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('id,title,status')
    .single();

  if (error || !story) {
    console.error('[Stories] Failed to review story:', error?.message);
    return NextResponse.json({ error: 'Unable to update this story.' }, { status: 500 });
  }

  await recordEvent(admin, id, action === 'reject' ? 'rejected' : isPublishing ? 'published' : 'approved', viewer, reason);
  return NextResponse.json({ story, message: action === 'reject' ? 'Story rejected and returned with a revision reason.' : isPublishing ? 'Story published on the homepage.' : 'Story approved. Publish it when ready.' });
}

export async function DELETE(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: 'Story publishing is not configured yet.' }, { status: 503 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Story publishing is not configured yet.' }, { status: 503 });
  const viewer = await getViewer(request, admin);
  if (!viewer || viewer.role !== 'admin') return NextResponse.json({ error: 'Only the administrator can delete stories.' }, { status: 403 });
  const payload = await request.json().catch(() => ({}));
  const id = cleanText(payload.id, 80);
  if (!id) return NextResponse.json({ error: 'A story ID is required.' }, { status: 400 });
  const { data, error } = await admin.from('featured_story_drafts').delete().eq('id', id).select('id').maybeSingle();
  if (error) {
    console.error('[Stories] Failed to delete story:', error.message);
    return NextResponse.json({ error: 'Unable to delete this story.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  return NextResponse.json({ deleted: true, id, message: 'Story permanently deleted.' });
}
