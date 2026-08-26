export const VOLUNTEER_ASSIGNMENT_STATUSES = ['assigned', 'in_progress', 'submitted', 'completed', 'revisions_requested', 'rejected', 'cancelled'] as const;
export const VOLUNTEER_ASSIGNMENT_CATEGORIES = ['community_outreach', 'field_verification', 'ground_assistance', 'digital_advocacy', 'training_support', 'other'] as const;
export const VOLUNTEER_ASSIGNMENT_PRIORITIES = ['high', 'medium', 'low'] as const;

export type VolunteerAssignmentStatus = typeof VOLUNTEER_ASSIGNMENT_STATUSES[number];
export type VolunteerAssignmentCategory = typeof VOLUNTEER_ASSIGNMENT_CATEGORIES[number];
export type VolunteerAssignmentPriority = typeof VOLUNTEER_ASSIGNMENT_PRIORITIES[number];

const GOOGLE_PROOF_HOSTS = new Set(['drive.google.com', 'docs.google.com']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) { return UUID.test(value); }
export function isVolunteerAssignmentStatus(value: string): value is VolunteerAssignmentStatus { return (VOLUNTEER_ASSIGNMENT_STATUSES as readonly string[]).includes(value); }
export function isVolunteerAssignmentCategory(value: string): value is VolunteerAssignmentCategory { return (VOLUNTEER_ASSIGNMENT_CATEGORIES as readonly string[]).includes(value); }
export function isVolunteerAssignmentPriority(value: string): value is VolunteerAssignmentPriority { return (VOLUNTEER_ASSIGNMENT_PRIORITIES as readonly string[]).includes(value); }

export function normalizeOptionalDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeGoogleProofUrl(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !GOOGLE_PROOF_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || url.hash) return null;
    return url.toString();
  } catch { return null; }
}

export function canVolunteerTransition(current: VolunteerAssignmentStatus, next: 'in_progress' | 'submitted') {
  return (next === 'in_progress' && (current === 'assigned' || current === 'revisions_requested')) || (next === 'submitted' && current === 'in_progress');
}

export function activeVolunteerAssignmentFilter(status: VolunteerAssignmentStatus) {
  return !['completed', 'rejected', 'cancelled'].includes(status);
}
