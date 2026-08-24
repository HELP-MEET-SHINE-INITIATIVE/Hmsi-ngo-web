function result(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function failure(message, status = 400) {
  return result({ error: message }, status);
}

function hasTrustedRequestOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site';
  return origin === new URL(request.url).origin;
}

/**
 * Executes the bulk worker access-notice workflow with explicit dependencies so
 * route behavior can be verified without contacting Supabase or Resend.
 */
export async function handleBulkWorkerAccessNotices(request, dependencies) {
  const actor = dependencies.getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!actor) return failure('Admin authentication required.', 401);

  if (!hasTrustedRequestOrigin(request)) return failure('Cross-site administrative requests are not permitted.', 403);

  const admin = dependencies.getSupabaseAdmin();
  if (!admin) return failure('Supabase is not configured on the server.', 503);

  const body = await request.json().catch(() => ({}));
  if (body.confirm !== true) return failure('Explicit confirmation is required before sending access notices.');

  const workers = await admin
    .from('workers')
    .select('id,name,email,role,status,onboarding_status')
    .eq('status', 'active')
    .eq('onboarding_status', 'completed')
    .not('email', 'is', null)
    .limit(500);
  if (workers.error) return failure('Verified worker records could not be loaded.', 500);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let reissued = 0;

  for (const worker of workers.data || []) {
    const email = typeof worker.email === 'string' ? worker.email.trim().toLowerCase() : '';
    if (!email) {
      skipped += 1;
      continue;
    }

    const card = await admin
      .from('hmsi_id_cards')
      .select('id,member_number,activated_at')
      .eq('holder_role', 'worker')
      .eq('holder_id', worker.id)
      .eq('status', 'active')
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (card.error) {
      failed += 1;
      continue;
    }

    let memberNumber = typeof card.data?.member_number === 'string' ? card.data.member_number.trim() : '';
    let activationCode;
    const activated = Boolean(card.data?.activated_at);

    if (!card.data || !memberNumber || !activated) {
      const revoked = await admin
        .from('hmsi_id_cards')
        .update({ status: 'revoked' })
        .eq('holder_role', 'worker')
        .eq('holder_id', worker.id)
        .eq('status', 'active');
      if (revoked.error) {
        failed += 1;
        continue;
      }

      activationCode = dependencies.createCredentialCode();
      memberNumber = dependencies.createMemberNumber('worker');
      const issued = await admin.from('hmsi_id_cards').insert({
        holder_role: 'worker',
        holder_id: worker.id,
        holder_name: worker.name,
        holder_email: email,
        member_number: memberNumber,
        role_display: worker.role === 'coordinator' ? 'HMSI Worker Coordinator' : 'HMSI Worker',
        activation_code_hash: dependencies.hashCredentialCode(activationCode),
        activation_code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        issued_by: actor,
      });
      if (issued.error) {
        failed += 1;
        continue;
      }
      reissued += 1;
    }

    try {
      const emailContent = dependencies.accessNoticeEmail({ workerName: worker.name, memberNumber, activated, activationCode });
      const delivery = await dependencies.sendPortalEmail({ to: email, subject: 'Your HMSI portal access ID', ...emailContent });
      if (delivery.sent) sent += 1;
      else skipped += 1;
    } catch (error) {
      dependencies.logError('[Admin] Bulk worker access email failed:', error instanceof Error ? error.message : 'unknown');
      failed += 1;
    }
  }

  return result({ ok: true, summary: { eligible: workers.data?.length || 0, sent, failed, skipped, reissued } });
}
