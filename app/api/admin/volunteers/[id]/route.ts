import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { createOnboardingInvitation } from '../../../../../lib/onboarding';
import { sendHmsiNotification, workerWelcomeTemplate } from '../../../../../lib/hmsiNotifications';
import { hasSameOrigin } from '../../../../../lib/editorialAdmin';

export const runtime = 'nodejs';
const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected']);
const PUBLISHER_ROLES = new Set(['community_publisher', 'humanitarian_activist', 'independent_field_reporter']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-site volunteer updates are not allowed.' }, { status: 403 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const { id } = await params;
    const body = await request.json();
    const accessStatus = body.accessStatus === 'banned' || body.accessStatus === 'active' ? body.accessStatus : null;
    const status = String(body.status || '').toLowerCase();
    const publisherRole = body.publisherRole === null || body.publisherRole === '' ? null : PUBLISHER_ROLES.has(body.publisherRole) ? body.publisherRole : undefined;
    if (!accessStatus && !ALLOWED_STATUSES.has(status) && publisherRole === undefined) return NextResponse.json({ error: 'Invalid volunteer update.' }, { status: 400 });

    const { data: application, error: applicationError } = await admin
      .from('volunteer_applications')
      .select('id,name,email,phone,applicant_role,status,account_status,publisher_role')
      .eq('id', id)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) return NextResponse.json({ error: 'This application was not found.' }, { status: 404 });

    const canManagePublisherRole = publisherRole !== undefined && application.applicant_role === 'volunteer' && (status === 'approved' || application.status === 'approved') && (accessStatus === 'active' || application.account_status === 'active');
    if (publisherRole !== undefined && !canManagePublisherRole) return NextResponse.json({ error: 'Publisher pathways can be assigned only to approved active volunteer accounts.' }, { status: 409 });
    const updateValues: Record<string, unknown> = {};
    if (accessStatus) updateValues.account_status = accessStatus;
    if (ALLOWED_STATUSES.has(status)) { updateValues.status = status; updateValues.reviewed_at = new Date().toISOString(); }
    if (publisherRole !== undefined) updateValues.publisher_role = publisherRole;
    const { data, error } = await admin
      .from('volunteer_applications')
      .update(updateValues)
      .eq('id', id)
      .select('id,status,account_status,applicant_role,publisher_role')
      .single();

    if (error) throw error;

    let workerId: string | null = null;
    if (!accessStatus && status === 'approved' && application.applicant_role === 'worker') {
      const { data: worker, error: workerError } = await admin.from('workers').upsert({ name: application.name, email: application.email, phone: application.phone, role: 'worker', status: 'active', onboarding_status: 'not_started', ads_manager_enabled: false, assignments_manager_enabled: false }, { onConflict: 'email' }).select('id').single();
      if (workerError) throw workerError;
      workerId = worker.id;
    }

    let onboarding: { emailSent: boolean; onboardingUrl: string | null; error?: string } | null = null;
    if (!accessStatus && status === 'approved') {
      const invitation = await createOnboardingInvitation({ applicationId: application.id, workerId, email: application.email, role: application.applicant_role === 'worker' ? 'worker' : 'volunteer' });
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng';
      const onboardingUrl = `${baseUrl}/onboarding?token=${encodeURIComponent(invitation.token)}`;
      const resendApiKey = process.env.RESEND_API_KEY?.trim();
      let emailSent = false;
      let emailError = '';
      if (resendApiKey) {
        try {
          const emailContent = workerWelcomeTemplate({ name: application.name, role: invitation.role, dashboardUrl: onboardingUrl });
          const emailResult = await sendHmsiNotification({ sender: 'onboarding', to: [invitation.email], subject: 'Welcome to HMSI — complete your onboarding', ...emailContent, idempotencyKey: `onboarding_invitation_${invitation.invitationId}` });
          emailSent = emailResult.sent;
        } catch (dispatchError) {
          emailError = dispatchError instanceof Error ? dispatchError.message : 'Onboarding invitation email could not be delivered.';
        }
      } else {
        emailError = 'Onboarding email delivery is not configured.';
      }
      onboarding = { emailSent, onboardingUrl, error: emailError || undefined };
    }

    return NextResponse.json({ volunteer: data, workerCreated: Boolean(workerId), onboarding });
  } catch (error) {
    console.error('[Admin] Failed to update volunteer application:', error);
    return NextResponse.json({ error: 'We could not update this application.' }, { status: 500 });
  }
}
