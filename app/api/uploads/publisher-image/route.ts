import { NextResponse } from 'next/server';
import { getNewsletterViewer, getNewsletterViewerPayload } from '../../../../lib/newsletterAccess';
import { getPortalIdentity } from '../../../../lib/portalAuth';
import { optimizeUploadedImage } from '../../../../lib/optimizeImage';
import { getSupabaseAdmin, getSupabaseStorageBucket, hasSupabaseConfig } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PUBLISHER_ROLES = new Set(['community_publisher', 'humanitarian_activist', 'independent_field_reporter']);

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: 'Image uploads are not configured yet.' }, { status: 503 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Image uploads are not configured yet.' }, { status: 503 });

  const portalIdentity = await getPortalIdentity(request);
  const publisher = portalIdentity?.role === 'volunteer' && portalIdentity.publisherRole && PUBLISHER_ROLES.has(portalIdentity.publisherRole) ? portalIdentity : null;
  const viewer = publisher ? { email: publisher.email, name: publisher.name, role: 'publisher-volunteer' } : await getNewsletterViewer(request, admin, getNewsletterViewerPayload(request));
  if (!viewer) return NextResponse.json({ error: 'Only an HMSI administrator or an approved publisher volunteer can upload a dispatch image.' }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  const image = formData?.get('image');
  if (!(image instanceof File) || image.size === 0) return NextResponse.json({ error: 'Choose an image before uploading.' }, { status: 400 });
  if (!ALLOWED_IMAGE_TYPES.has(image.type)) return NextResponse.json({ error: 'Images must be JPG, PNG, or WEBP files.' }, { status: 400 });
  if (image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Images must be 8 MB or smaller.' }, { status: 413 });

  let optimizedImage;
  try {
    optimizedImage = await optimizeUploadedImage(image);
  } catch (optimizationError) {
    console.error('[Publisher uploads] Failed to optimize image:', optimizationError);
    return NextResponse.json({ error: 'The image could not be processed. Please choose a valid JPG, PNG, or WEBP image.' }, { status: 400 });
  }

  const path = `publisher-images/${viewer.role}/${crypto.randomUUID()}.${optimizedImage.extension}`;
  const bucket = getSupabaseStorageBucket();
  const { error: uploadError } = await admin.storage.from(bucket).upload(path, optimizedImage.buffer, {
    contentType: optimizedImage.contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadError) {
    console.error('[Publisher uploads] Failed to store image:', uploadError.message);
    return NextResponse.json({ error: 'The image could not be uploaded. Please try again.' }, { status: 500 });
  }

  const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({
    imageUrl: publicUrlData.publicUrl,
    imagePath: path,
    optimized: true,
    originalBytes: optimizedImage.originalBytes,
    optimizedBytes: optimizedImage.optimizedBytes,
  });
}
