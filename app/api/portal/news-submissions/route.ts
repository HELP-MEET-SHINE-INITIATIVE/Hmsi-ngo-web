import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getPortalIdentity } from '../../../../lib/portalAuth';

export const runtime = 'nodejs';

const PUBLISHER_ROLES = new Set(['community_publisher', 'humanitarian_activist', 'independent_field_reporter']);
const CATEGORIES = new Set(['Field News', 'Emergency Relief', 'Local Impact', 'Opinion/Activism']);

function text(value: unknown, maxLength: number) { return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''; }
function safeHttpsUrl(value: unknown) {
  const raw = text(value, 2000);
  if (!raw) return '';
  try { const parsed = new URL(raw); return parsed.protocol === 'https:' ? parsed.toString() : ''; } catch { return ''; }
}
function safeDriveUrl(value: unknown) {
  const url = safeHttpsUrl(value);
  if (!url) return '';
  const host = new URL(url).hostname.toLowerCase();
  return host === 'drive.google.com' || host.endsWith('.drive.google.com') || host === 'docs.google.com' || host.endsWith('.docs.google.com') ? url : '';
}
async function identityForSubmission(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return { error: NextResponse.json({ error: 'Portal sign-in is required.' }, { status: 401 }) };
  if (identity.role !== 'volunteer' || !identity.publisherRole || !PUBLISHER_ROLES.has(identity.publisherRole)) return { error: NextResponse.json({ error: 'An approved Community Publisher, Humanitarian Activist, or Independent Field Reporter role is required.' }, { status: 403 }) };
  return { identity };
}

export async function GET(request: Request) {
  const access = await identityForSubmission(request);
  if (access.error) return access.error;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'News submissions are not configured.' }, { status: 503 });
  const articles = await admin.from('news_articles').select('id,headline,summary,body,body_format,category,image_url,media_drive_url,status,rejection_reason,revision_feedback,revision_requested_at,created_at,updated_at,reviewed_at').eq('author_email', access.identity.email).eq('author_role', 'volunteer').eq('publisher_role', access.identity.publisherRole).order('created_at', { ascending: false }).limit(50);
  if (articles.error) return NextResponse.json({ error: 'Your news submissions are temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ publisherRole: access.identity.publisherRole, articles: articles.data || [] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const access = await identityForSubmission(request);
  if (access.error) return access.error;
  const payload = await request.json().catch(() => ({}));
  const headline = text(payload.headline, 220);
  const summary = text(payload.summary, 500);
  const body = text(payload.body, 10000);
  const category = text(payload.category, 100);
  const imageUrl = safeHttpsUrl(payload.imageUrl);
  const mediaDriveUrl = safeDriveUrl(payload.mediaDriveUrl);
  const articleId = text(payload.articleId, 80);
  if (!CATEGORIES.has(category)) return NextResponse.json({ error: 'Choose one of the approved dispatch categories.' }, { status: 400 });
  if (payload.imageUrl && !imageUrl) return NextResponse.json({ error: 'The uploaded image reference is invalid.' }, { status: 400 });
  if (payload.mediaDriveUrl && !mediaDriveUrl) return NextResponse.json({ error: 'Heavy media links must be HTTPS Google Drive or Google Docs links.' }, { status: 400 });
  if (headline.length < 8 || summary.length < 20 || body.length < 50) return NextResponse.json({ error: 'Add a title of at least 8 characters, an excerpt of at least 20 characters, and a dispatch body of at least 50 characters.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'News submissions are not configured.' }, { status: 503 });

  const values = { headline, summary, body, body_format: 'markdown_lite', category, image_url: imageUrl || null, media_drive_url: mediaDriveUrl || null, status: 'pending_editorial_review', revision_feedback: null, revision_requested_at: null, verification_status: 'not_reviewed' };
  if (articleId) {
    const existing = await admin.from('news_articles').select('id,status').eq('id', articleId).eq('author_email', access.identity.email).eq('author_role', 'volunteer').eq('publisher_role', access.identity.publisherRole).maybeSingle();
    if (existing.error) return NextResponse.json({ error: 'Your draft could not be loaded for re-submission.' }, { status: 503 });
    if (!existing.data || existing.data.status !== 'revision_requested') return NextResponse.json({ error: 'Only a dispatch with an editor revision request can be re-submitted.' }, { status: 409 });
    const article = await admin.from('news_articles').update(values).eq('id', articleId).eq('status', 'revision_requested').select('id,headline,status,created_at').maybeSingle();
    if (article.error || !article.data) return NextResponse.json({ error: 'Your revised dispatch could not be submitted.' }, { status: 503 });
    const event = await admin.from('news_approval_events').insert({ news_id: article.data.id, action: 'resubmitted', actor_email: access.identity.email, actor_role: 'volunteer', reason: `publisher_role:${access.identity.publisherRole}` });
    if (event.error) return NextResponse.json({ error: 'Your revised dispatch was saved but its review audit record could not be created.' }, { status: 503 });
    return NextResponse.json({ article: article.data, message: 'Your revised dispatch has been submitted to the HMSI Editorial Team for review.' });
  }

  const article = await admin.from('news_articles').insert({ ...values, author_name: access.identity.name, author_email: access.identity.email, author_role: 'volunteer', publisher_role: access.identity.publisherRole }).select('id,headline,status,created_at').single();
  if (article.error || !article.data) return NextResponse.json({ error: 'Your dispatch could not be submitted.' }, { status: 503 });
  const event = await admin.from('news_approval_events').insert({ news_id: article.data.id, action: 'submitted', actor_email: access.identity.email, actor_role: 'volunteer', reason: `publisher_role:${access.identity.publisherRole}` });
  if (event.error) return NextResponse.json({ error: 'Your dispatch was saved but its review audit record could not be created.' }, { status: 503 });
  return NextResponse.json({ article: article.data, message: 'Your dispatch has been submitted to the HMSI Editorial Team for review.' }, { status: 201 });
}
