import { NextResponse } from 'next/server';
import { getPortalIdentity } from '../../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getNamedDriveAdminEmail, parsePersonalGoogleDriveUrl, portalActor } from '../../../../lib/driveIntake';

export const runtime = 'nodejs';

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function viewer(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return null;
  return portalActor(identity);
}

export async function GET(request: Request) {
  const actor = await viewer(request);
  if (!actor) return error('Sign in to view your personal file submissions.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('File submissions are not configured yet.', 503);

  const { data, error: queryError } = await admin
    .from('external_drive_submissions')
    .select('id,personal_drive_url,status,access_request_note,archive_bucket,archive_object_key,ingested_at,cleared_at,created_at,updated_at')
    .eq('submitter_auth_user_id', actor.authUserId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (queryError) return error('Your file submissions are temporarily unavailable.', 503);

  return NextResponse.json({
    submissions: data || [],
    namedAdminEmail: getNamedDriveAdminEmail() || null,
    viewer: { name: actor.name, email: actor.email, role: actor.role },
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const actor = await viewer(request);
  if (!actor) return error('Sign in to submit a personal Google Drive link.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('File submissions are not configured yet.', 503);
  const namedAdminEmail = getNamedDriveAdminEmail();
  if (!namedAdminEmail) return error('The named HMSI Drive access account is not configured yet.', 503);

  const payload = await request.json().catch(() => ({}));
  const personalDriveUrl = parsePersonalGoogleDriveUrl(payload.personalDriveUrl);
  if (!personalDriveUrl) return error('Enter a valid HTTPS Google Drive or Google Docs sharing link.');

  const { data: submission, error: insertError } = await admin
    .from('external_drive_submissions')
    .insert({
      submitter_auth_user_id: actor.authUserId,
      submitter_profile_id: actor.profileId,
      submitter_email: actor.email,
      submitter_name: actor.name,
      submitter_role: actor.role,
      personal_drive_url: personalDriveUrl,
      status: 'pending_download',
    })
    .select('id,status,created_at')
    .single();
  if (insertError || !submission) return error('Unable to submit this Drive link.', 500);

  await admin.from('external_drive_submission_events').insert({
    submission_id: submission.id,
    action: 'submitted',
    actor_email: actor.email,
    actor_role: actor.role,
    detail: 'Submitter confirmed named-HMSI-administrator viewer sharing guidance.',
  });

  return NextResponse.json({
    submission,
    message: `Drive link submitted. Keep the file in your Drive until HMSI confirms secure AWS archive ingestion. Share it as Viewer with ${namedAdminEmail}.`,
  }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  const actor = await viewer(request);
  if (!actor) return error('Sign in to clear your submitted Drive link.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('File submissions are not configured yet.', 503);
  const payload = await request.json().catch(() => ({}));
  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (!id) return error('A submission ID is required.');

  const now = new Date().toISOString();
  const { data: cleared, error: updateError } = await admin
    .from('external_drive_submissions')
    .update({ personal_drive_url: null, status: 'link_cleared', cleared_at: now, cleared_by: actor.email })
    .eq('id', id)
    .eq('submitter_auth_user_id', actor.authUserId)
    .eq('status', 'ingested')
    .select('id,status,cleared_at')
    .maybeSingle();
  if (updateError) return error('Unable to clear this Drive link.', 500);
  if (!cleared) return error('Only an ingested submission that belongs to you can have its Drive link cleared.', 409);

  await admin.from('external_drive_submission_events').insert({ submission_id: id, action: 'link_cleared', actor_email: actor.email, actor_role: actor.role, detail: 'Submitter cleared the external Drive link after confirmed archive ingestion.' });
  return NextResponse.json({ submission: cleared, message: 'The external Drive link has been cleared from the HMSI intake record.' }, { headers: { 'Cache-Control': 'no-store' } });
}

