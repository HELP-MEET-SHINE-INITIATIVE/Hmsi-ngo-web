import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseStorageBucket } from '../../../../lib/supabaseAdmin';
import { getPortalIdentity } from '../../../../lib/portalAuth';
export const runtime = 'nodejs';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export async function GET(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return error('Portal authentication required.', 401);
  return NextResponse.json({ profile: identity });
}
export async function POST(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return error('Portal authentication required.', 401);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return error('Choose a profile image.');
  if (!ALLOWED_TYPES.has(file.type) || file.size < 1 || file.size > MAX_BYTES) return error('Use a JPEG, PNG, or WebP image no larger than 5 MB.');
  const admin = getSupabaseAdmin();
  if (!admin) return error('Profile media is temporarily unavailable.', 503);
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `portal-profiles/${identity.role}/${identity.profileId}/${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bucket = getSupabaseStorageBucket();
  const uploaded = await admin.storage.from(bucket).upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploaded.error) return error('The profile image could not be uploaded.', 503);
  const table = identity.role === 'worker' ? 'workers' : identity.role === 'volunteer' ? 'volunteer_applications' : 'hmsi_members';
  const updated = await admin.from(table).update({ profile_photo_path: path, profile_photo_url: null }).eq('id', identity.profileId).eq('auth_user_id', identity.authUserId);
  if (updated.error) return error('The profile image was uploaded but could not be linked to your account.', 503);
  const signed = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return NextResponse.json({ profile: { ...identity, profilePhotoPath: path, profilePhotoUrl: signed.data?.signedUrl || null } });
}
