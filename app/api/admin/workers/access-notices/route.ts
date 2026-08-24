import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { createCredentialCode, createMemberNumber, hashCredentialCode } from '../../../../../lib/hmsiCredentials';
import { accessNoticeEmail, sendPortalEmail } from '../../../../../lib/portalEmail';

export const runtime = 'nodejs';
function result(body: Record<string, unknown>, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } }); }
function failure(message: string, status = 400) { return result({ error: message }, status); }

export async function POST(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return failure('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return failure('Supabase is not configured on the server.', 503);
  const body = await request.json().catch(() => ({}));
  if (body.confirm !== true) return failure('Explicit confirmation is required before sending access notices.');
  const workers = await admin.from('workers').select('id,name,email,role,status,onboarding_status').eq('status', 'active').eq('onboarding_status', 'completed').not('email', 'is', null).limit(500);
  if (workers.error) return failure('Verified worker records could not be loaded.', 500);
  let sent = 0, failed = 0, skipped = 0, reissued = 0;
  for (const worker of workers.data || []) {
    const email = typeof worker.email === 'string' ? worker.email.trim().toLowerCase() : '';
    if (!email) { skipped += 1; continue; }
    const card = await admin.from('hmsi_id_cards').select('id,member_number,activated_at').eq('holder_role', 'worker').eq('holder_id', worker.id).eq('status', 'active').order('issued_at', { ascending: false }).limit(1).maybeSingle();
    if (card.error) { failed += 1; continue; }
    let memberNumber = card.data?.member_number || '';
    let activationCode: string | undefined;
    const activated = Boolean(card.data?.activated_at);
    if (!card.data || !memberNumber || !activated) {
      await admin.from('hmsi_id_cards').update({ status: 'revoked' }).eq('holder_role', 'worker').eq('holder_id', worker.id).eq('status', 'active');
      activationCode = createCredentialCode();
      memberNumber = createMemberNumber('worker');
      const issued = await admin.from('hmsi_id_cards').insert({ holder_role: 'worker', holder_id: worker.id, holder_name: worker.name, holder_email: email, member_number: memberNumber, role_display: worker.role === 'coordinator' ? 'HMSI Worker Coordinator' : 'HMSI Worker', activation_code_hash: hashCredentialCode(activationCode), activation_code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'active', issued_by: getAdminEmailFromCookie(request.headers.get('cookie')) });
      if (issued.error) { failed += 1; continue; }
      reissued += 1;
    }
    try {
      const emailContent = accessNoticeEmail({ workerName: worker.name, memberNumber, activated, activationCode });
      const delivery = await sendPortalEmail({ to: email, subject: 'Your HMSI portal access ID', ...emailContent });
      if (delivery.sent) sent += 1; else skipped += 1;
    } catch (error) {
      console.error('[Admin] Bulk worker access email failed:', error instanceof Error ? error.message : 'unknown');
      failed += 1;
    }
  }
  return result({ ok: true, summary: { eligible: workers.data?.length || 0, sent, failed, skipped, reissued } }, 200);
}
