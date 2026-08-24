import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { cleanText, getArchiveBucket, parseArchiveObjectKey } from '../../../../lib/driveIntake';
import { hmsiDriveFilesIngestedTemplate, sendHmsiNotification } from '../../../../lib/hmsiNotifications';
import { hasSameOrigin } from '../../../../lib/editorialAdmin';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function getActor(request: Request) {
  return getAdminEmailFromCookie(request.headers.get('cookie'));
}

async function event(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, submissionId: string, action: 'access_requested' | 'ingested' | 'link_cleared', actorEmail: string, detail: string) {
  const { error: eventError } = await admin.from('external_drive_submission_events').insert({ submission_id: submissionId, action, actor_email: actorEmail, actor_role: 'admin', detail });
  if (eventError) throw eventError;
}

export async function GET(request: Request) {
  const actor = getActor(request);
  if (!actor) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Drive intake routing is not configured yet.', 503);

  const { data, error: queryError } = await admin
    .from('external_drive_submissions')
    .select('id,submitter_name,submitter_email,submitter_role,personal_drive_url,status,access_request_note,access_requested_at,archive_bucket,archive_object_key,ingested_at,ingested_by,cleared_at,cleared_by,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (queryError) return error('Drive intake records are temporarily unavailable.', 503);
  return NextResponse.json({ submissions: data || [], archiveBucket: getArchiveBucket() || null }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function PATCH(request: Request) {
  const actor = getActor(request);
  if (!actor) return error('Admin authentication required.', 401);
  if (!hasSameOrigin(request)) return error('Cross-site intake updates are not allowed.', 403);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Drive intake routing is not configured yet.', 503);

  try {
    const payload = await request.json().catch(() => ({}));
    const id = cleanText(payload.id, 80);
    const action = payload.action === 'confirm_ingest' || payload.action === 'request_access' || payload.action === 'clear_link' ? payload.action : '';
    if (!id || !action) return error('A submission and a valid intake action are required.');
    const { data: existing, error: lookupError } = await admin
      .from('external_drive_submissions')
      .select('id,submitter_name,submitter_email,personal_drive_url,status')
      .eq('id', id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return error('Drive submission not found.', 404);

    const now = new Date().toISOString();
    if (action === 'confirm_ingest') {
      if (!existing.personal_drive_url || existing.status === 'link_cleared') return error('This Drive link is no longer available for ingestion.', 409);
      const archiveBucket = getArchiveBucket();
      const archiveObjectKey = parseArchiveObjectKey(payload.archiveObjectKey);
      if (!archiveBucket) return error('The HMSI AWS/S3 archive bucket is not configured on the server.', 503);
      if (!archiveObjectKey) return error('Record the AWS/S3 archive object key before confirming ingestion.');
      const { data: submission, error: updateError } = await admin
        .from('external_drive_submissions')
        .update({ status: 'ingested', archive_bucket: archiveBucket, archive_object_key: archiveObjectKey, ingested_at: now, ingested_by: actor, access_request_note: null })
        .eq('id', id)
        .select('id,status,ingested_at,archive_bucket,archive_object_key')
        .single();
      if (updateError || !submission) throw updateError || new Error('Ingestion update failed.');
      await event(admin, id, 'ingested', actor, `Administrator confirmed secure archive storage in ${archiveBucket}.`);

      let notification = 'not_configured';
      try {
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hmsi.org.ng').replace(/\/$/, '');
        const content = hmsiDriveFilesIngestedTemplate({ name: existing.submitter_name, submissionsUrl: `${siteUrl}/portal/submissions` });
        const outcome = await sendHmsiNotification({ sender: 'admin', to: [existing.submitter_email], subject: 'HMSI files archived — personal Drive cleanup available', ...content, idempotencyKey: `drive-intake:${id}:ingested:v1` });
        notification = outcome.sent ? 'sent' : outcome.reason;
      } catch (notificationError) {
        console.error('[Drive intake] Ingestion notification failed:', notificationError instanceof Error ? notificationError.message : 'unknown');
        notification = 'delivery_failed';
      }
      return NextResponse.json({ submission, notification, message: 'Archive ingestion recorded. The submitter may now clear or delete the original personal Drive file.' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'request_access') {
      if (!existing.personal_drive_url) return error('This submission no longer has a Drive link to review.', 409);
      const note = cleanText(payload.note, 500) || 'Grant Viewer access to the named HMSI administrative account, then keep the file in your Drive until archive ingestion is confirmed.';
      const { data: submission, error: updateError } = await admin
        .from('external_drive_submissions')
        .update({ status: 'access_error', access_request_note: note, access_requested_at: now, access_requested_by: actor })
        .eq('id', id)
        .select('id,status,access_request_note,access_requested_at')
        .single();
      if (updateError || !submission) throw updateError || new Error('Access request update failed.');
      await event(admin, id, 'access_requested', actor, note);
      return NextResponse.json({ submission, message: 'Access needed has been recorded for the submitter dashboard.' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (existing.status !== 'ingested') return error('Only a confirmed ingested submission can have its external Drive link cleared.', 409);
    const { data: submission, error: updateError } = await admin
      .from('external_drive_submissions')
      .update({ personal_drive_url: null, status: 'link_cleared', cleared_at: now, cleared_by: actor })
      .eq('id', id)
      .select('id,status,cleared_at')
      .single();
    if (updateError || !submission) throw updateError || new Error('Link cleanup failed.');
    await event(admin, id, 'link_cleared', actor, 'Administrator cleared the external Drive link after confirmed archive ingestion.');
    return NextResponse.json({ submission, message: 'External Drive link cleared while the archive audit record remains.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    console.error('[Drive intake] Update failed:', cause instanceof Error ? cause.message : 'unknown');
    return error('Unable to update this Drive intake record.', 500);
  }
}
