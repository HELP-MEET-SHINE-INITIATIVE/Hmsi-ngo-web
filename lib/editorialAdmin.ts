import { getAdminEmailFromCookie } from './adminSession';

export const ARTICLE_SELECT = 'id,headline,summary,body,category,image_url,author_name,author_email,author_role,publisher_role,status,rejection_reason,approved_by,approved_at,published_at,created_at,updated_at,reviewed_by,reviewed_at,scheduled_archive_at,archived_at,archive_reason,verification_status,verification_notes,source_name,source_url';

export type EditorialAction = 'approve_publish' | 'save_draft' | 'reject' | 'archive' | 'edit';

export function getEditorialAdmin(request: Request) {
  return getAdminEmailFromCookie(request.headers.get('cookie'));
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function allowedAction(value: unknown): EditorialAction | null {
  return value === 'approve_publish' || value === 'save_draft' || value === 'reject' || value === 'archive' || value === 'edit' ? value : null;
}
