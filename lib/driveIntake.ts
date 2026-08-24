import type { PortalIdentity } from './portalAuth';

export type DriveSubmissionStatus = 'pending_download' | 'ingested' | 'access_error' | 'link_cleared';

export function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function getNamedDriveAdminEmail() {
  return (process.env.HMSI_DRIVE_ACCESS_EMAIL || process.env.HMSI_ADMIN_EMAIL || '').trim().toLowerCase();
}

export function getArchiveBucket() {
  return (process.env.HMSI_ARCHIVE_BUCKET || process.env.AWS_S3_BUCKET || '').trim();
}

export function parsePersonalGoogleDriveUrl(value: unknown) {
  const candidate = cleanText(value, 2000);
  try {
    const url = new URL(candidate);
    const allowedHosts = new Set(['drive.google.com', 'docs.google.com']);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseArchiveObjectKey(value: unknown) {
  const key = cleanText(value, 1024).replace(/^\/+/, '');
  if (!key || key.includes('..') || /[\u0000-\u001f]/.test(key)) return null;
  return key;
}

export function portalActor(identity: PortalIdentity) {
  return { email: identity.email, role: identity.role, authUserId: identity.authUserId, profileId: identity.profileId, name: identity.name };
}

export function statusLabel(status: DriveSubmissionStatus) {
  return status === 'pending_download'
    ? 'Pending Review · Keep file on Drive'
    : status === 'ingested'
      ? 'Files Ingested / Downloaded · Safe to delete'
      : status === 'access_error'
        ? 'Access Needed'
        : 'Link Cleared';
}

