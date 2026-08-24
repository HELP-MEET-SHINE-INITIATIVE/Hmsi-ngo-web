import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getPortalIdentity } from '../../../../lib/portalAuth';

export const runtime = 'nodejs';
const PUBLISHER_ROLES = new Set(['community_publisher', 'humanitarian_activist', 'independent_field_reporter']);

function text(value: unknown, maxLength: number) { return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''; }
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
  const articles = await admin.from('news_articles').select('id,headline,summary,category,status,rejection_reason,created_at,updated_at,reviewed_at').eq('author_email', access.identity.email).eq('author_role', 'volunteer').eq('publisher_role', access.identity.publisherRole).order('created_at', { ascending: false }).limit(50);
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
  const category = text(payload.category, 100) || 'Community report';
  if (headline.length < 8 || summary.length < 20 || body.length < 50) return NextResponse.json({ error: 'Add a headline of at least 8 characters, a summary of at least 20 characters, and a story of at least 50 characters.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'News submissions are not configured.' }, { status: 503 });
  const article = await admin.from('news_articles').insert({ headline, summary, body, category, author_name: access.identity.name, author_email: access.identity.email, author_role: 'volunteer', publisher_role: access.identity.publisherRole, status: 'pending_admin_approval', verification_status: 'not_reviewed' }).select('id,headline,status,created_at').single();
  if (article.error || !article.data) return NextResponse.json({ error: 'Your story could not be submitted.' }, { status: 503 });
  await admin.from('news_approval_events').insert({ news_id: article.data.id, action: 'submitted', actor_email: access.identity.email, actor_role: 'volunteer', reason: `publisher_role:${access.identity.publisherRole}` });
  return NextResponse.json({ article: article.data, message: 'Your story is queued for HMSI editorial review. It is not public until an administrator approves and publishes it.' }, { status: 201 });
}
