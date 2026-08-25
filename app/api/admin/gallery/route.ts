import { NextResponse } from 'next/server';
import { getNewsletterViewer, getNewsletterViewerPayload } from '../../../../lib/newsletterAccess';
import { optimizeUploadedImage } from '../../../../lib/optimizeImage';
import { getSupabaseAdmin, getSupabaseStorageBucket, hasSupabaseConfig } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const clean = (value: unknown, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function requireAdmin(request: Request) {
  const admin = getSupabaseAdmin();
  if (!hasSupabaseConfig() || !admin) return { admin: null, viewer: null, response: NextResponse.json({ error: 'Gallery storage is not configured.' }, { status: 503 }) };
  const viewer = await getNewsletterViewer(request, admin, getNewsletterViewerPayload(request));
  if (!viewer || viewer.role !== 'admin') return { admin, viewer: null, response: NextResponse.json({ error: 'Only the HMSI administrator can manage outreach gallery images.' }, { status: 403 }) };
  return { admin, viewer, response: null };
}

async function recordEvent(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, storyId: string, imageId: string | null, action: string, actorEmail: string, detail?: string) {
  await admin.from('outreach_gallery_events').insert({ story_id: storyId, image_id: imageId, action, actor_email: actorEmail, detail: detail || null });
}

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (access.response || !access.admin) return access.response!;
  const storyId = new URL(request.url).searchParams.get('storyId')?.trim() || '';
  if (!storyId) return NextResponse.json({ error: 'A story ID is required.' }, { status: 400 });
  const { data, error } = await access.admin.from('outreach_gallery_images').select('id,story_id,image_url,caption,sort_order,created_at,updated_at').eq('story_id', storyId).eq('is_deleted', false).order('sort_order').order('created_at');
  if (error) return NextResponse.json({ error: 'Unable to load gallery images.' }, { status: 503 });
  return NextResponse.json({ images: data || [] });
}

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (access.response || !access.admin || !access.viewer) return access.response!;
  const form = await request.formData().catch(() => null);
  const storyId = clean(form?.get('storyId'), 80);
  const caption = clean(form?.get('caption'), 300) || null;
  const image = form?.get('image');
  if (!storyId || !(image instanceof File) || image.size === 0) return NextResponse.json({ error: 'Choose an image and story before uploading.' }, { status: 400 });
  if (!ALLOWED_IMAGE_TYPES.has(image.type) || image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Images must be JPG, PNG, or WEBP files no larger than 8 MB.' }, { status: 400 });
  const { data: story } = await access.admin.from('featured_story_drafts').select('id').eq('id', storyId).maybeSingle();
  if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  let optimized;
  try { optimized = await optimizeUploadedImage(image); } catch { return NextResponse.json({ error: 'The selected image could not be processed.' }, { status: 400 }); }
  const path = `outreach-gallery/${storyId}/${crypto.randomUUID()}.${optimized.extension}`;
  const bucket = getSupabaseStorageBucket();
  const { error: uploadError } = await access.admin.storage.from(bucket).upload(path, optimized.buffer, { contentType: optimized.contentType, cacheControl: '31536000', upsert: false });
  if (uploadError) return NextResponse.json({ error: 'The gallery image could not be stored.' }, { status: 500 });
  const { data: last } = await access.admin.from('outreach_gallery_images').select('sort_order').eq('story_id', storyId).eq('is_deleted', false).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { data: publicUrl } = access.admin.storage.from(bucket).getPublicUrl(path);
  const { data, error } = await access.admin.from('outreach_gallery_images').insert({ story_id: storyId, image_url: publicUrl.publicUrl, storage_path: path, caption, sort_order: (last?.sort_order ?? -1) + 1, created_by: access.viewer.email }).select('id,story_id,image_url,caption,sort_order,created_at,updated_at').single();
  if (error || !data) { await access.admin.storage.from(bucket).remove([path]); return NextResponse.json({ error: 'Unable to record the gallery image.' }, { status: 500 }); }
  await recordEvent(access.admin, storyId, data.id, 'added', access.viewer.email);
  return NextResponse.json({ image: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin(request);
  if (access.response || !access.admin || !access.viewer) return access.response!;
  const payload = await request.json().catch(() => ({}));
  const imageId = clean(payload.imageId, 80);
  const caption = clean(payload.caption, 300) || null;
  const sortOrder = Number(payload.sortOrder);
  if (!imageId || !Number.isInteger(sortOrder) || sortOrder < 0) return NextResponse.json({ error: 'A valid image, caption, and priority are required.' }, { status: 400 });
  const { data: current } = await access.admin.from('outreach_gallery_images').select('id,story_id').eq('id', imageId).eq('is_deleted', false).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Gallery image not found.' }, { status: 404 });
  const { data, error } = await access.admin.from('outreach_gallery_images').update({ caption, sort_order: sortOrder }).eq('id', imageId).select('id,story_id,image_url,caption,sort_order,created_at,updated_at').single();
  if (error || !data) return NextResponse.json({ error: 'Unable to update the gallery image.' }, { status: 500 });
  await recordEvent(access.admin, current.story_id, imageId, 'caption_updated', access.viewer.email);
  return NextResponse.json({ image: data });
}

export async function DELETE(request: Request) {
  const access = await requireAdmin(request);
  if (access.response || !access.admin || !access.viewer) return access.response!;
  const imageId = clean((await request.json().catch(() => ({}))).imageId, 80);
  if (!imageId) return NextResponse.json({ error: 'A gallery image is required.' }, { status: 400 });
  const { data: image } = await access.admin.from('outreach_gallery_images').select('id,story_id,storage_path').eq('id', imageId).eq('is_deleted', false).maybeSingle();
  if (!image) return NextResponse.json({ error: 'Gallery image not found.' }, { status: 404 });
  if (!image.storage_path.startsWith(`outreach-gallery/${image.story_id}/`)) return NextResponse.json({ error: 'This storage object is not eligible for gallery deletion.' }, { status: 409 });
  const bucket = getSupabaseStorageBucket();
  const { error: storageError } = await access.admin.storage.from(bucket).remove([image.storage_path]);
  const { error: updateError } = await access.admin.from('outreach_gallery_images').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: access.viewer.email, storage_deleted_at: storageError ? null : new Date().toISOString() }).eq('id', imageId);
  if (updateError) return NextResponse.json({ error: 'Unable to record the gallery deletion.' }, { status: 500 });
  await recordEvent(access.admin, image.story_id, imageId, storageError ? 'storage_delete_failed' : 'deleted', access.viewer.email, storageError ? 'Gallery metadata was hidden; storage cleanup requires review.' : undefined);
  return NextResponse.json({ deleted: true, storageDeleted: !storageError, message: storageError ? 'The gallery photo is hidden. Storage cleanup requires review.' : 'Gallery photo deleted.' });
}
