import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getTrainingAnalyticsOverview, type RegionalTrainingMetric, type TrainingAnalyticsOverview } from '../../../../lib/trainingAnalytics';
import { sendResendEmailWithRetry } from '../../../../lib/resendRetryQueue';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MASTER_RECIPIENT = 'contact@hmsi.org.ng';

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char);
}

function buildCoordinatorEmail(office: RegionalTrainingMetric, globalAnalytics: TrainingAnalyticsOverview) {
  const isGreen = office.ragStatus === 'GREEN';
  const isAmber = office.ragStatus === 'AMBER';
  const isRed = office.ragStatus === 'RED';

  const badgeColor = isGreen ? '#065f46' : isAmber ? '#92400e' : '#991b1b';
  const badgeBg = isGreen ? '#d1fae5' : isAmber ? '#fef3c7' : '#fee2e2';
  const borderAccent = isGreen ? '#1e5b49' : isAmber ? '#d97706' : '#dc2626';

  const remainingHeadcount = Math.max(0, office.activeHeadcount - office.completedCount);
  const gapToGreen = Math.max(0, Math.ceil(office.activeHeadcount * 0.85) - office.completedCount);

  const subject = `[HMSI Monday Briefing] ${office.name} RAG Compliance Summary · ${office.ragStatus} Status`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 32px 20px; color: #17221e; background: #ffffff;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #1e5b49; padding-bottom: 16px; margin-bottom: 24px;">
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #b56b3b; font-weight: 800; margin: 0 0 4px 0;">Help Meet Shine Initiative · Monday Morning Governance</p>
        <h1 style="font-size: 24px; font-weight: 900; color: #17221e; margin: 0;">Weekly RAG Compliance Summary</h1>
        <p style="font-size: 14px; color: #66716a; margin: 4px 0 0 0;">Unit: <strong>${escapeHtml(office.name)}</strong> (${escapeHtml(office.state)} State · Code: ${escapeHtml(office.code)})</p>
      </div>

      <!-- Status Banner -->
      <div style="background: ${badgeBg}; border-left: 4px solid ${borderAccent}; padding: 18px 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: ${badgeColor};">
            Current Status: ${office.ragStatus}
          </span>
          <span style="font-size: 18px; font-weight: 900; color: ${borderAccent};">
            ${office.completionRate}% Completed
          </span>
        </div>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #17221e;">
          ${
            isGreen
              ? '🎉 <strong>Optimal Status:</strong> Your unit meets or exceeds the institutional benchmark (≥85% completion & ≥4.0 score). Maintain this standard with a 5-minute micro-refresher drill before this week’s outreach activities.'
              : isAmber
              ? `⚠️ <strong>Attention Required:</strong> Your unit is in Amber (${office.completionRate}%). Only <strong>${gapToGreen} additional team member(s)</strong> must complete the simulation survey to achieve Green status.`
              : '🚨 <strong>Urgent Action Needed:</strong> Your unit is in Red (<70% completion). Please schedule a mandatory 30-minute peer roleplay simulation session immediately.'
          }
        </p>
      </div>

      <!-- Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px;">
        <div style="background: #f6f4ef; padding: 14px 10px; text-align: center; border: 1px solid #e8e5dc;">
          <p style="margin: 0; font-size: 20px; font-weight: 900; color: #17221e;">${office.activeHeadcount}</p>
          <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #66716a;">Headcount</p>
        </div>
        <div style="background: #f6f4ef; padding: 14px 10px; text-align: center; border: 1px solid #e8e5dc;">
          <p style="margin: 0; font-size: 20px; font-weight: 900; color: #1e5b49;">${office.completedCount}</p>
          <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #66716a;">Completed</p>
        </div>
        <div style="background: #f6f4ef; padding: 14px 10px; text-align: center; border: 1px solid #e8e5dc;">
          <p style="margin: 0; font-size: 20px; font-weight: 900; color: ${remainingHeadcount > 0 ? '#b56b3b' : '#1e5b49'};">${remainingHeadcount}</p>
          <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #66716a;">Pending</p>
        </div>
        <div style="background: #f6f4ef; padding: 14px 10px; text-align: center; border: 1px solid #e8e5dc;">
          <p style="margin: 0; font-size: 20px; font-weight: 900; color: #1e5b49;">${office.avgPostConfidence > 0 ? `${office.avgPostConfidence}` : '—'}</p>
          <p style="margin: 4px 0 0 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #66716a;">Avg Score (/5)</p>
        </div>
      </div>

      <!-- Weekly Coordinator Operating Checklist -->
      <div style="border: 1px solid #d9d6ce; padding: 18px 20px; margin-bottom: 24px; background: #faf9f6;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #17221e;">
          📋 Your Coordinator Action Plan for This Week
        </h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7; color: #333d37;">
          <li><strong>Monday:</strong> Review your pending team list in the Admin Control Panel at <a href="https://www.hmsi.org.ng/hmsi-control" style="color: #1e5b49; font-weight: bold;">hmsi.org.ng/hmsi-control</a>.</li>
          <li><strong>Wednesday:</strong> Pair active field outreach teams to run a 5-minute simulation drill using the <em>1-Page Pocket Reference Card</em>.</li>
          <li><strong>Friday:</strong> Ensure all participating staff and community mobilizers submit their survey response via the online portal.</li>
        </ul>
      </div>

      <!-- Standard Holding Script Reminder -->
      <div style="background: #fff8e8; border-left: 4px solid #e1ad45; padding: 14px 18px; margin-bottom: 24px; font-size: 12px; line-height: 1.6; color: #7a5b16;">
        <p style="margin: 0 0 6px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Approved Verbal Holding Line for Field Staff:</p>
        <p style="margin: 0; font-style: italic;">
          “Thank you for contacting Help Meet Shine Initiative. I am not authorized to provide on-record statements, but I will refer your inquiry to our designated spokesperson for verified information. Please send your deadline and specific questions to <strong>contact@hmsi.org.ng</strong>.”
        </p>
      </div>

      <!-- Footer & National Context -->
      <div style="border-top: 1px solid #eeeae2; padding-top: 16px; font-size: 11px; line-height: 1.5; color: #66716a;">
        <p style="margin: 0 0 4px 0;">
          <strong>National Baseline Context:</strong> Global Completion: ${globalAnalytics.summary.globalCompletionRate}% · Child Data Privacy Mastery: ${globalAnalytics.summary.dataProtectionMasteryPct}% · Net Confidence Delta: +${globalAnalytics.summary.overallDelta} pts.
        </p>
        <p style="margin: 0; color: #999;">
          Automated Monday governance digest dispatched by HMSI Cron Service · Escalation and inquiries: <a href="mailto:contact@hmsi.org.ng" style="color: #1e5b49;">contact@hmsi.org.ng</a>.
        </p>
      </div>
    </div>
  `;

  const text = `
Help Meet Shine Initiative (HMSI) - Monday Morning Regional RAG Summary

Unit: ${office.name} (${office.state} State · Code: ${office.code})
Status: ${office.ragStatus}
Completion Rate: ${office.completionRate}% (${office.completedCount} / ${office.activeHeadcount} staff & volunteers)
Pending Headcount: ${remainingHeadcount} (Gap to Green: ${gapToGreen})
Avg Post-Training Confidence Score: ${office.avgPostConfidence > 0 ? `${office.avgPostConfidence}/5.0` : 'Not recorded'}

Coordinator Action Plan This Week:
1. Monday: Review pending staff list at https://www.hmsi.org.ng/hmsi-control
2. Wednesday: Run 5-minute pair simulation drills before field distribution
3. Friday: Verify online survey submissions for all participants

Approved Holding Script:
"Thank you for contacting Help Meet Shine Initiative. I am not authorized to provide on-record statements, but I will refer your inquiry to our designated spokesperson for verified information. Please send your deadline and specific questions to contact@hmsi.org.ng."

National Status: ${globalAnalytics.summary.globalCompletionRate}% global completion, ${globalAnalytics.summary.dataProtectionMasteryPct}% child privacy mastery.
  `.trim();

  return { subject, html, text };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'contact@hmsi.org.ng';

  if (!apiKey) {
    return NextResponse.json({ error: 'Resend API key is not configured.' }, { status: 503 });
  }

  try {
    const analytics = await getTrainingAnalyticsOverview('MEDIA_SAFETY_2026');
    const dispatchResults: Array<{ office: string; code: string; status: string; recipient: string; resendId?: string; error?: string }> = [];

    // 1. Dispatch individual customized briefing to each regional coordinator
    for (const office of analytics.regionalBreakdown) {
      const emailContent = buildCoordinatorEmail(office, analytics);
      const recipient = office.leadCoordinatorEmail && office.leadCoordinatorEmail.includes('@')
        ? office.leadCoordinatorEmail.trim().toLowerCase()
        : MASTER_RECIPIENT;

      const dispatch = await sendResendEmailWithRetry(
        apiKey,
        {
          from: fromEmail,
          to: [recipient],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          idempotencyKey: `monday_briefing_${office.code}_${new Date().toISOString().slice(0, 10)}`,
        },
        { maxRetries: 3, baseDelayMs: 300, maxDelayMs: 2000 }
      );

      if (dispatch.ok) {
        dispatchResults.push({
          office: office.name,
          code: office.code,
          status: office.ragStatus,
          recipient,
          resendId: dispatch.resendId,
        });

        // Record successful dispatch in training_alert_logs
        await admin.from('training_alert_logs').insert({
          regional_office_id: office.officeId || null,
          alert_type: `MONDAY_REGIONAL_BRIEFING_${office.ragStatus}`,
          trigger_metric_value: office.completionRate,
          threshold_value: 85.0,
          recipient_emails: [recipient],
        });
      } else {
        console.error(`[Monday Cron] Failed to send to ${recipient}:`, dispatch.error);
        dispatchResults.push({
          office: office.name,
          code: office.code,
          status: office.ragStatus,
          recipient,
          error: dispatch.error,
        });

        // Record dead-letter failure in training_alert_logs
        await admin.from('training_alert_logs').insert({
          regional_office_id: office.officeId || null,
          alert_type: `MONDAY_REGIONAL_BRIEFING_FAILED`,
          trigger_metric_value: office.completionRate,
          threshold_value: 85.0,
          recipient_emails: [recipient],
        });
      }
    }

    // 2. Dispatch consolidated Master Digest to Trustees / Admin
    const adminRecipients = new Set<string>([MASTER_RECIPIENT]);
    if (process.env.HMSI_ADMIN_EMAIL) {
      adminRecipients.add(process.env.HMSI_ADMIN_EMAIL.trim().toLowerCase());
    }

    const masterSubject = `[HMSI Master Governance] Monday National Media-Safety & RAG Summary (${analytics.summary.ragStatus})`;
    const masterRows = analytics.regionalBreakdown.map((o) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; font-weight: bold;">${escapeHtml(o.name)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; text-align: center;">${o.completedCount} / ${o.activeHeadcount}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; text-align: center; font-weight: bold;">${o.completionRate}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; text-align: center;">${o.avgPostConfidence > 0 ? `${o.avgPostConfidence}/5.0` : '—'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; text-align: right; font-weight: bold; color: ${o.ragStatus === 'GREEN' ? '#065f46' : o.ragStatus === 'AMBER' ? '#92400e' : '#991b1b'};">${o.ragStatus}</td>
      </tr>
    `).join('');

    const masterHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 32px 20px; color: #17221e;">
        <h1 style="font-size: 22px; color: #1e5b49; margin: 0 0 12px 0;">HMSI National Training Governance Digest</h1>
        <p style="font-size: 14px; color: #66716a; margin: 0 0 20px 0;">All 5 regional coordinator briefings were dispatched for Monday morning review.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f6f4ef; font-size: 10px; font-weight: bold; text-transform: uppercase;">
              <th style="padding: 8px; text-align: left;">Unit</th>
              <th style="padding: 8px; text-align: center;">Completed</th>
              <th style="padding: 8px; text-align: center;">Rate</th>
              <th style="padding: 8px; text-align: center;">Avg Score</th>
              <th style="padding: 8px; text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>${masterRows}</tbody>
        </table>
        <p style="margin-top: 24px; font-size: 12px; color: #999;">Manage units at <a href="https://www.hmsi.org.ng/hmsi-control">hmsi.org.ng/hmsi-control</a>.</p>
      </div>
    `;

    await sendResendEmailWithRetry(
      apiKey,
      {
        from: fromEmail,
        to: Array.from(adminRecipients),
        subject: masterSubject,
        html: masterHtml,
        text: `HMSI Monday Master Governance Digest: ${analytics.summary.globalCompletionRate}% completion across all units.`,
        idempotencyKey: `monday_master_digest_${new Date().toISOString().slice(0, 10)}`,
      },
      { maxRetries: 3, baseDelayMs: 300, maxDelayMs: 2000 }
    );

    return NextResponse.json({
      ok: true,
      message: 'Monday morning regional compliance summaries and master digest dispatched successfully.',
      dispatches: dispatchResults,
    });
  } catch (error) {
    console.error('[Monday Cron] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to process Monday regional briefing cron.' }, { status: 500 });
  }
}
