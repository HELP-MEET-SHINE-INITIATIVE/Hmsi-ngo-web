import { NextResponse } from 'next/server';
import { createFundraiser, getFundraisers } from '../../../lib/fundraisers';
import { getSupabaseAdmin, getSupabaseStorageBucket, hasSupabaseConfig } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_CATEGORIES = new Set(['medical', 'education', 'housing', 'emergency']);

export async function GET() {
  try {
    const fundraisers = await getFundraisers();
    return NextResponse.json({ fundraisers });
  } catch (error) {
    console.error('[Fundraisers] Failed to load fundraisers:', error);
    return NextResponse.json({ error: 'Fundraisers are temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: 'Fundraiser submissions are not configured yet. Add Supabase server credentials.' },
      { status: 503 },
    );
  }

  let uploadedPath: string | null = null;

  try {
    const formData = await request.formData();
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const category = String(formData.get('category') || '').trim().toLowerCase();
    const targetAmount = Number(formData.get('targetAmount'));
    const image = formData.get('image');

    if (!title || title.length > 160) {
      return NextResponse.json({ error: 'Title is required and must be 160 characters or fewer.' }, { status: 400 });
    }
    if (!description || description.length > 10000) {
      return NextResponse.json({ error: 'A story is required and must be 10,000 characters or fewer.' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Please choose a valid fundraiser category.' }, { status: 400 });
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json({ error: 'Target amount must be greater than zero.' }, { status: 400 });
    }
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: 'Please choose a cover image.' }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return NextResponse.json({ error: 'Cover image must be JPG, PNG, or WEBP.' }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Cover image must be 8 MB or smaller.' }, { status: 413 });
    }

    const admin = getSupabaseAdmin();
    const bucket = getSupabaseStorageBucket();
    if (!admin) throw new Error('Supabase storage is not configured.');

    const id = crypto.randomUUID();
    const extension = image.type === 'image/jpeg' ? 'jpg' : image.type.split('/')[1];
    uploadedPath = `fundraisers/${id}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(uploadedPath, await image.arrayBuffer(), {
        contentType: image.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(uploadedPath);
    const fundraiser = await createFundraiser({
      id,
      title,
      description,
      category,
      targetAmount,
      imageUrl: publicUrlData.publicUrl,
      imagePath: uploadedPath,
    });

    return NextResponse.json({ fundraiser }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      const admin = getSupabaseAdmin();
      const bucket = getSupabaseStorageBucket();
      await admin?.storage.from(bucket).remove([uploadedPath]).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : 'Unknown storage or database error';
    console.error('[Fundraisers] Failed to create fundraiser:', message);
    return NextResponse.json({ error: `We could not submit this fundraiser: ${message}` }, { status: 500 });
  }
}
