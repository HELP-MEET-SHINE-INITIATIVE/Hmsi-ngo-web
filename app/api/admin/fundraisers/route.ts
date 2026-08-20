import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const ALLOWED_CATEGORIES = new Set(['medical', 'education', 'housing', 'emergency']);
const ALLOWED_CAMPAIGN_TYPES = new Set(['organisation', 'programme']);

export async function POST(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim().toLowerCase() : '';
    const targetAmount = Number(body.targetAmount);
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const imagePath = typeof body.imagePath === 'string' ? body.imagePath.trim() : '';
    const campaignType = typeof body.campaignType === 'string' ? body.campaignType.trim().toLowerCase() : 'programme';
    const programmeName = typeof body.programmeName === 'string' ? body.programmeName.trim() : '';

    if (title.length < 3 || title.length > 160) return NextResponse.json({ error: 'Title must be between 3 and 160 characters.' }, { status: 400 });
    if (description.length < 20 || description.length > 10000) return NextResponse.json({ error: 'Description must be between 20 and 10,000 characters.' }, { status: 400 });
    if (!ALLOWED_CATEGORIES.has(category)) return NextResponse.json({ error: 'Choose a valid fundraiser category.' }, { status: 400 });
    if (!ALLOWED_CAMPAIGN_TYPES.has(campaignType)) return NextResponse.json({ error: 'Choose organisation-wide or programme campaign.' }, { status: 400 });
    if (campaignType === 'programme' && programmeName.length < 2) return NextResponse.json({ error: 'Add the programme name for a programme campaign.' }, { status: 400 });
    if (programmeName.length > 160) return NextResponse.json({ error: 'Programme name is too long.' }, { status: 400 });
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return NextResponse.json({ error: 'Target amount must be greater than zero.' }, { status: 400 });
    if (imageUrl.length > 1000) return NextResponse.json({ error: 'Image URL is too long.' }, { status: 400 });
    if (imagePath && !imagePath.startsWith('publisher-images/')) return NextResponse.json({ error: 'The uploaded image reference is invalid.' }, { status: 400 });

    const id = crypto.randomUUID();
    const { data, error } = await admin
      .from('fundraisers')
      .insert({
        id,
        title,
        description,
        category,
        target_amount: targetAmount,
        raised_amount: 0,
        image_url: imageUrl || '/images/outreach-1.png',
        image_path: imagePath || null,
        campaign_type: campaignType,
        programme_name: campaignType === 'programme' ? programmeName : null,
        status: 'active',
      })
      .select('id,title,description,category,target_amount,raised_amount,image_url,image_path,status,campaign_type,programme_name,created_at,updated_at')
      .single();

    if (error || !data) throw error || new Error('Fundraiser was not created.');
    return NextResponse.json({ fundraiser: data, message: 'Fundraiser published on the homepage and impact page.' }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Admin] Failed to create fundraiser:', message);
    return NextResponse.json({ error: `We could not publish this fundraiser: ${message}` }, { status: 500 });
  }
}
