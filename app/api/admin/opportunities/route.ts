import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const audience = String(body.audience || '').trim().toLowerCase();
    const location = String(body.location || '').trim();
    const imageUrl = String(body.image_url || '').trim();
    const imagePath = String(body.image_path || '').trim();
    const startsAt = String(body.startsAt || '').trim();
    const endsAt = String(body.endsAt || '').trim();
    const status = String(body.status || 'open').trim().toLowerCase();
    if (!title || title.length > 200 || !description || description.length > 10000) return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
    if (!['volunteer', 'worker', 'both'].includes(audience)) return NextResponse.json({ error: 'Choose volunteer, worker, or both.' }, { status: 400 });
    if (!location || !startsAt || Number.isNaN(Date.parse(startsAt))) return NextResponse.json({ error: 'A valid location and start date are required.' }, { status: 400 });
    if (!['draft', 'open', 'closed'].includes(status)) return NextResponse.json({ error: 'Invalid opportunity status.' }, { status: 400 });
    if (imageUrl.length > 1000) return NextResponse.json({ error: 'Opportunity image URL is too long.' }, { status: 400 });
    if (imagePath && !imagePath.startsWith('publisher-images/')) return NextResponse.json({ error: 'The uploaded opportunity image reference is invalid.' }, { status: 400 });

    const { data, error } = await admin
      .from('opportunities')
      .insert({ title, description, audience, location, image_url: imageUrl || null, image_path: imagePath || null, starts_at: new Date(startsAt).toISOString(), ends_at: endsAt && !Number.isNaN(Date.parse(endsAt)) ? new Date(endsAt).toISOString() : null, status, created_by: getAdminEmailFromCookie(request.headers.get('cookie')) })
      .select('id,title,description,audience,location,image_url,image_path,starts_at,ends_at,status,created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ opportunity: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Admin] Failed to create opportunity:', message);
    return NextResponse.json({ error: `We could not create the opportunity: ${message}` }, { status: 500 });
  }
}
