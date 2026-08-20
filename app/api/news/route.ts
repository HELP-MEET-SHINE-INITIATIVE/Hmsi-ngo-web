import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../lib/supabaseAdmin';
import { getNewsletterViewer, getNewsletterViewerPayload } from '../../../lib/newsletterAccess';

export const runtime = 'nodejs';

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function getViewer(request: Request, admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  return getNewsletterViewer(request, admin, getNewsletterViewerPayload(request));
}

async function recordEvent(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, newsId: string, action: string, viewer: { email: string; role: 'admin' | 'worker' | 'volunteer' }, reason?: string) {
  await admin.from('news_approval_events').insert({ news_id: newsId, action, actor_email: viewer.email, actor_role: viewer.role, reason: reason || null });
}

export async function GET(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ articles: [], setupRequired: true });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ articles: [], setupRequired: true });

  const url = new URL(request.url);
  const requestedId = cleanText(url.searchParams.get('id'), 80);
  const viewer = await getViewer(request, admin);
  let query = admin
    .from('news_articles')
    .select('id,headline,summary,body,category,image_url,author_name,author_email,author_role,status,rejection_reason,approved_by,approved_at,published_at,created_at,updated_at')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (requestedId) {
    query = query.eq('id', requestedId);
  }

  if (!viewer) {
    query = query.eq('status', 'published');
  } else if (viewer.role !== 'admin') {
    query = query.eq('author_email', viewer.email);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[News] Failed to load articles:', error.message);
    return NextResponse.json({ error: 'News is temporarily unavailable.' }, { status: 503 });
  }

  return NextResponse.json({ articles: data || [], viewerRole: viewer?.role || 'public', setupRequired: false });
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: 'News publishing is not configured yet.' }, { status: 503 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'News publishing is not configured yet.' }, { status: 503 });

  const viewer = await getViewer(request, admin);
  if (!viewer) return NextResponse.json({ error: 'Only the administrator and approved active workers or volunteers can submit news.' }, { status: 403 });

  const payload = await request.json().catch(() => ({}));
  const headline = cleanText(payload.headline, 220);
  const summary = cleanText(payload.summary, 500);
  const body = cleanText(payload.body, 10000);
  const category = cleanText(payload.category, 100) || 'HMSI news';
  const imageUrl = cleanText(payload.image_url, 500) || null;

  if (headline.length < 8 || summary.length < 20 || body.length < 50) {
    return NextResponse.json({ error: 'Add a headline of at least 8 characters, a summary of at least 20 characters, and news copy of at least 50 characters.' }, { status: 400 });
  }

  const isAdmin = viewer.role === 'admin';
  const { data: article, error } = await admin.from('news_articles').insert({
    headline,
    summary,
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
  }).select('id,headline,status').single();

  if (error || !article) {
    console.error('[News] Failed to create article:', error?.message);
    return NextResponse.json({ error: 'Unable to submit this news article.' }, { status: 500 });
  }

  await recordEvent(admin, article.id, isAdmin ? 'published' : 'submitted', viewer);
  return NextResponse.json({ article, message: isAdmin ? 'News published.' : 'News submitted for administrator approval.' }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: 'News publishing is not configured yet.' }, { status: 503 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'News publishing is not configured yet.' }, { status: 503 });

  const viewer = await getViewer(request, admin);
  if (!viewer || viewer.role !== 'admin') return NextResponse.json({ error: 'Only the administrator can approve, reject, or publish news.' }, { status: 403 });

  const payload = await request.json().catch(() => ({}));
  const id = cleanText(payload.id, 80);
  const action = payload.action === 'approve' || payload.action === 'reject' || payload.action === 'publish' ? payload.action : '';
  const reason = cleanText(payload.reason, 500);
  if (!id || !action) return NextResponse.json({ error: 'A news article and review action are required.' }, { status: 400 });
  if (action === 'reject' && reason.length < 3) return NextResponse.json({ error: 'Add a short reason when requesting changes or rejecting news.' }, { status: 400 });

  const { data: existing, error: lookupError } = await admin.from('news_articles').select('id,status').eq('id', id).maybeSingle();
  if (lookupError || !existing) return NextResponse.json({ error: 'News article not found.' }, { status: 404 });
  if (existing.status === 'published') return NextResponse.json({ error: 'Published news cannot be changed from this review action.' }, { status: 409 });

  const isPublishing = action === 'publish';
  if (isPublishing && existing.status !== 'approved') return NextResponse.json({ error: 'Approve the news article before publishing it.' }, { status: 409 });
  const nextStatus = action === 'reject' ? 'rejected' : isPublishing ? 'published' : 'approved';

  const { data: article, error } = await admin.from('news_articles').update({
    status: nextStatus,
    rejection_reason: action === 'reject' ? reason : null,
    approved_by: action === 'reject' ? null : viewer.email,
    approved_at: action === 'reject' ? null : new Date().toISOString(),
    published_at: isPublishing ? new Date().toISOString() : null,
  }).eq('id', id).select('id,headline,status').single();

  if (error || !article) {
    console.error('[News] Failed to review article:', error?.message);
    return NextResponse.json({ error: 'Unable to update this news article.' }, { status: 500 });
  }

  await recordEvent(admin, id, action === 'reject' ? 'rejected' : isPublishing ? 'published' : 'approved', viewer, reason);
  return NextResponse.json({ article, message: action === 'reject' ? 'News rejected and returned with a revision reason.' : isPublishing ? 'News published.' : 'News approved. Publish it when ready.' });
}
