import type { SupabaseClient } from '@supabase/supabase-js';

export type ApprovedContactRole = 'volunteer' | 'worker' | 'member';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function contactNotificationStatus(email: string) {
  return EMAIL_PATTERN.test(email.trim()) ? 'ready' : 'invalid';
}

export async function syncApprovedContact(
  admin: SupabaseClient,
  input: { role: ApprovedContactRole; sourceId: string; name: string; email: string; approvedAt?: string | null },
) {
  const email = input.email.trim().toLowerCase();
  const result = await admin.from('approved_contact_directory').upsert({
    role: input.role,
    source_id: input.sourceId,
    name: input.name.trim(),
    email,
    notification_status: contactNotificationStatus(email),
    approved_at: input.approvedAt || new Date().toISOString(),
    disabled_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'role,source_id' });
  if (result.error) throw result.error;
}

export async function blockApprovedContact(admin: SupabaseClient, role: ApprovedContactRole, email: string) {
  const result = await admin.from('approved_contact_directory').update({
    notification_status: 'blocked',
    disabled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('role', role).eq('email', email.trim().toLowerCase());
  if (result.error) throw result.error;
}
