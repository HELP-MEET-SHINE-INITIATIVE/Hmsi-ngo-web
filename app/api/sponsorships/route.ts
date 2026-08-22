import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlPattern = /^https?:\/\/[^\s]+$/i;

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ sponsorships: [] });
  const result = await admin.from('sponsorship_requests').select('id,organisation_name,title,description,target_url,creative_url,starts_at,ends_at,status').eq('status', 'active').order('starts_at', { ascending: true }).limit(50);
  if (result.error) return NextResponse.json({ error: 'Sponsored content is temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ sponsorships: result.data || [] }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'A valid JSON sponsorship request is required.' }, { status: 400 }); }
  const requesterName = typeof body.requester_name === 'string' ? body.requester_name.trim() : '';
  const requesterEmail = typeof body.requester_email === 'string' ? body.requester_email.trim().toLowerCase() : '';
  const organisationName = typeof body.organisation_name === 'string' ? body.organisation_name.trim() : null;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const targetUrl = typeof body.target_url === 'string' ? body.target_url.trim() : '';
  const creativeUrl = typeof body.creative_url === 'string' && body.creative_url.trim() ? body.creative_url.trim() : null;
  const budgetNgn = Number(body.budget_ngn);
  if (requesterName.length < 2 || requesterName.length > 160) return NextResponse.json({ error: 'Please provide a valid requester name.' }, { status: 400 });
  if (!emailPattern.test(requesterEmail) || requesterEmail.length > 320) return NextResponse.json({ error: 'Please provide a valid requester email.' }, { status: 400 });
  if (title.length < 3 || title.length > 200 || description.length < 20 || description.length > 2000) return NextResponse.json({ error: 'Please provide a clear title and description.' }, { status: 400 });
  if (!urlPattern.test(targetUrl) || (creativeUrl && !urlPattern.test(creativeUrl))) return NextResponse.json({ error: 'Target and creative links must use HTTPS or HTTP URLs.' }, { status: 400 });
  if (!Number.isFinite(budgetNgn) || budgetNgn < 1000 || budgetNgn > 100000000) return NextResponse.json({ error: 'Budget must be between ₦1,000 and ₦100,000,000.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Sponsorship requests are not configured yet.' }, { status: 503 });
  const result = await admin.from('sponsorship_requests').insert({ requester_name: requesterName, requester_email: requesterEmail, organisation_name: organisationName, title, description, target_url: targetUrl, creative_url: creativeUrl, budget_ngn: budgetNgn, status: 'pending' }).select('id,title,status,created_at').single();
  if (result.error) { console.error('[Sponsorships] Failed to save request:', result.error); return NextResponse.json({ error: 'We could not save your sponsorship request.' }, { status: 503 }); }
  return NextResponse.json({ sponsorship: result.data, message: 'Your sponsorship request is pending HMSI administrator review.' }, { status: 201 });
}
