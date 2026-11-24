import { NextResponse } from 'next/server';
import { createFundraiser, getFundraisers } from '../../../lib/fundraisers';
import { optimizeUploadedImage } from '../../../lib/optimizeImage';
import { getSupabaseAdmin, getSupabaseStorageBucket, hasSupabaseConfig } from '../../../lib/supabaseAdmin';
import { normalizeFundraiserContact } from '../../../lib/fundraiserContacts';
import { sendFundraiserSubmissionReceived } from '../../../lib/fundraiserNotifications';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_CATEGORIES = new Set(['medical', 'education', 'housing', 'emergency', 'community']);

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
    const contact = normalizeFundraiserContact({ email: formData.get('email'), phone: formData.get('phone'), location: formData.get('location') });

    if (contact.ok === false) {
      return NextResponse.json({ error: contact.error, field: contact.field, code: 'INVALID_CONTACT' }, { status: 400 });
    }
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

    let optimizedImage;
    try {
      optimizedImage = await optimizeUploadedImage(image);
    } catch (optimizationError) {
      console.error('[Fundraisers] Failed to optimize cover image:', optimizationError);
      return NextResponse.json({ error: 'The cover image could not be processed. Please choose a valid JPG, PNG, or WEBP image.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    uploadedPath = `fundraisers/${id}.${optimizedImage.extension}`;
    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(uploadedPath, optimizedImage.buffer, {
        contentType: optimizedImage.contentType,
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
      contactEmail: contact.value.email,
      contactPhone: contact.value.phone,
      contactLocation: contact.value.location,
    });

    void sendFundraiserSubmissionReceived({ fundraiserId: id, title, targetAmount, recipientEmail: contact.value.email }).catch((notificationError) => {
      console.warn('[Fundraisers] Submission email dispatch failed:', notificationError instanceof Error ? notificationError.message : 'unknown');
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
    return NextResponse.json({ error: 'We could not submit this fundraiser right now. Please try again.' }, { status: 500 });
  }
}
