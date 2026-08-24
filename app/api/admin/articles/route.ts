import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { ARTICLE_SELECT, getEditorialAdmin } from '../../../../lib/editorialAdmin';

export const runtime = 'nodejs';

const FILTERS: Record<string, string[]> = {
  pending: ['pending_admin_approval'],
  published: ['published'],
  drafts: ['draft', 'rejected'],
  archived: ['archived'],
  all: ['draft', 'pending_admin_approval', 'approved', 'rejected', 'published', 'archived'],
};

export async function GET(request: Request) {
  const actor = getEditorialAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const filter = new URL(request.url).searchParams.get('filter') || 'pending';
  const statuses = FILTERS[filter] || FILTERS.pending;
  const { data, error } = await admin
    .from('news_articles')
    .select(ARTICLE_SELECT)
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[Editorial] Failed to load articles:', error.message);
    return NextResponse.json({ error: 'Editorial articles are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({ articles: data || [], filter, reviewer: actor }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

