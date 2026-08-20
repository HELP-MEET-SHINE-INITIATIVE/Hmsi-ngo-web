import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin, getSupabaseStorageBucket } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = new Set(['active', 'pending', 'archived', 'rejected', 'completed']);
const ALLOWED_CATEGORIES = new Set(['medical', 'education', 'housing', 'emergency']);

type RouteContext = { params: Promise<{ id: string }> };

async function getExistingFundraiser(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, id: string) {
  const { data, error } = await admin
    .from('fundraisers')
    .select('id,image_path,image_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function permanentlyDeleteFundraiser(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, id: string) {
  const existing = await getExistingFundraiser(admin, id);
  if (!existing) return false;

  if (existing.image_path) {
    const { error: storageError } = await admin.storage
      .from(getSupabaseStorageBucket())
      .remove([existing.image_path]);
    if (storageError) throw storageError;
  }

  const { data: deleted, error: deleteError } = await admin
    .from('fundraisers')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (deleteError) throw deleteError;
  return Boolean(deleted);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = body.status === undefined ? undefined : String(body.status).toLowerCase();

    if (status && !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid fundraiser status.' }, { status: 400 });
    }

    if (status === 'rejected') {
      const deleted = await permanentlyDeleteFundraiser(admin, id);
      if (!deleted) return NextResponse.json({ error: 'Fundraiser record was not found.' }, { status: 404 });
      return NextResponse.json({ deleted: true, id, message: 'Fundraiser and uploaded image permanently deleted.' });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (title.length < 3 || title.length > 160) return NextResponse.json({ error: 'Title must be between 3 and 160 characters.' }, { status: 400 });
      updates.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      if (description.length < 20) return NextResponse.json({ error: 'Description must be at least 20 characters.' }, { status: 400 });
      updates.description = description;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'category')) {
      const category = typeof body.category === 'string' ? body.category.trim().toLowerCase() : '';
      if (!ALLOWED_CATEGORIES.has(category)) return NextResponse.json({ error: 'Choose a valid fundraiser category.' }, { status: 400 });
      updates.category = category;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'targetAmount')) {
      const targetAmount = Number(body.targetAmount);
      if (!Number.isFinite(targetAmount) || targetAmount <= 0) return NextResponse.json({ error: 'Target amount must be greater than zero.' }, { status: 400 });
      updates.target_amount = targetAmount;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'raisedAmount')) {
      const raisedAmount = Number(body.raisedAmount);
      if (!Number.isFinite(raisedAmount) || raisedAmount < 0) return NextResponse.json({ error: 'Raised amount cannot be negative.' }, { status: 400 });
      updates.raised_amount = raisedAmount;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'imageUrl')) {
      const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
      if (imageUrl.length > 1000) return NextResponse.json({ error: 'Image URL is too long.' }, { status: 400 });
      const existing = await getExistingFundraiser(admin, id);
      if (!existing) return NextResponse.json({ error: 'Fundraiser record was not found.' }, { status: 404 });
      const nextImageUrl = imageUrl || '/images/outreach-1.png';
      if (existing.image_path && existing.image_url !== nextImageUrl) {
        const { error: storageError } = await admin.storage.from(getSupabaseStorageBucket()).remove([existing.image_path]);
        if (storageError) throw storageError;
        updates.image_path = null;
      }
      updates.image_url = nextImageUrl;
    }

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Add at least one fundraiser change.' }, { status: 400 });

    const { data, error } = await admin
      .from('fundraisers')
      .update(updates)
      .eq('id', id)
      .select('id,title,description,category,target_amount,raised_amount,image_url,image_path,status,created_at,updated_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Fundraiser record was not found.' }, { status: 404 });
    return NextResponse.json({ fundraiser: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Admin] Failed to update fundraiser:', message);
    return NextResponse.json({ error: `We could not update this fundraiser: ${message}` }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const { id } = await params;
    const deleted = await permanentlyDeleteFundraiser(admin, id);
    if (!deleted) return NextResponse.json({ error: 'Fundraiser record was not found.' }, { status: 404 });
    return NextResponse.json({ deleted: true, id, message: 'Fundraiser and uploaded image permanently deleted.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Admin] Failed to delete fundraiser:', message);
    return NextResponse.json({ error: `We could not delete this fundraiser: ${message}` }, { status: 500 });
  }
}
