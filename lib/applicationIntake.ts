import type { SupabaseClient } from '@supabase/supabase-js';

export type ApplicantRole = 'volunteer' | 'worker' | 'member';

export const DUPLICATE_APPLICATION_MESSAGE = 'We already have an HMSI application on record for this email. Please wait for an approval decision or follow the official instructions already sent to you.';

type Reservation = { id: string };

export async function reserveApplicationEmail(admin: SupabaseClient, input: { email: string; role: ApplicantRole; sourceTable: 'volunteer_applications' | 'hmsi_member_applications' }) {
  const reserved = await admin
    .from('application_email_registry')
    .insert({ email: input.email, applicant_role: input.role, source_table: input.sourceTable })
    .select('id')
    .single();

  if (!reserved.error && reserved.data) return { reservation: reserved.data as Reservation, duplicate: false };
  if ((reserved.error as { code?: string } | null)?.code === '23505') return { reservation: null, duplicate: true };
  throw reserved.error || new Error('Application email could not be reserved.');
}

export async function attachApplicationReservation(admin: SupabaseClient, reservationId: string, sourceId: string) {
  const update = await admin.from('application_email_registry').update({ source_id: sourceId, updated_at: new Date().toISOString() }).eq('id', reservationId);
  if (update.error) throw update.error;
}

export async function releaseApplicationReservation(admin: SupabaseClient, reservationId: string) {
  const removal = await admin.from('application_email_registry').delete().eq('id', reservationId);
  if (removal.error) console.warn('[Applications] An unused email reservation could not be released.');
}
