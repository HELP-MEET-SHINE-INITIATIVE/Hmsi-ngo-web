import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../../lib/adminSession';
import { getRecoveryRedirect, requestPortalPasswordReset } from '../../../../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!actor) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const { id } = await params;
  try {
    const worker = await admin.from('workers').select('id,email,status,onboarding_status,auth_user_id').eq('id', id).maybeSingle();
    if (worker.error) throw worker.error;
    if (!worker.data || worker.data.status !== 'active' || worker.data.onboarding_status !== 'completed' || !worker.data.auth_user_id) {
      return NextResponse.json({ error: 'Password recovery is available only for an active worker with a completed portal account.' }, { status: 409 });
    }
    await requestPortalPasswordReset(worker.data.email, getRecoveryRedirect());
    await admin.from('portal_access_events').insert({ worker_id: worker.data.id, event_type: 'password_reset_requested', actor_email: actor, metadata: { source: 'admin_directory' } }).then(() => undefined);
    return NextResponse.json({ message: 'A time-limited password reset link has been requested for the active worker.' });
  } catch (cause) {
    console.error('[Admin directory] Password recovery request failed:', cause instanceof Error ? cause.message : 'unknown');
    return NextResponse.json({ error: 'The password reset request could not be completed.' }, { status: 503 });
  }
}
