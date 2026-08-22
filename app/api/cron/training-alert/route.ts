import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getTrainingAnalyticsOverview, type RegionalTrainingMetric, type TrainingAnalyticsOverview } from '../../../../lib/trainingAnalytics';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEFAULT_ALERT_RECIPIENT = 'contact@hmsi.org.ng';

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char);
}

function buildEmailContent(analytics: TrainingAnalyticsOverview, attentionOffices: RegionalTrainingMetric[]) {
  const isRed = analytics.summary.ragStatus === 'RED' || attentionOffices.some((o) => o.ragStatus === 'RED');
  const isAmber = analytics.summary.ragStatus === 'AMBER' || attentionOffices.length > 0;

  const statusBadgeColor = isRed ? '#dc2626' : isAmber ? '#d97706' : '#1e5b49';
  const statusBadgeBg = isRed ? '#fee2e2' : isAmber ? '#fef3c7' : '#d1fae5';
  const statusLabel = isRed ? 'RED · ACTION REQUIRED' : isAmber ? 'AMBER · ATTENTION NEEDED' : 'GREEN · OPTIMAL';

  const regionalRows = analytics.regionalBreakdown.map((office) => {
    const badgeColor = office.ragStatus === 'GREEN' ? '#065f46' : office.ragStatus === 'AMBER' ? '#92400e' : '#991b1b';
    const badgeBg = office.ragStatus === 'GREEN' ? '#d1fae5' : office.ragStatus === 'AMBER' ? '#fef3c7' : '#fee2e2';

    return `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e1d8; color: #17221e; font-weight: bold;">
          ${escapeHtml(office.name)}<br>
          <span style="font-size: 11px; color: #66716a; font-weight: normal;">${escapeHtml(office.state)} State · ${escapeHtml(office.code)}</span>
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e1d8; text-align: center; color: #17221e;">
          ${office.completedCount} / ${office.activeHeadcount}
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e1d8; text-align: center; font-weight: bold; color: #17221e;">
          ${office.completionRate}%
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e1d8; text-align: center; color: #1e5b49; font-weight: bold;">
          ${office.avgPostConfidence > 0 ? `${office.avgPostConfidence} / 5.0` : '—'}
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e1d8; text-align: right;">
          <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background: ${badgeBg}; color: ${badgeColor};">
            ${office.ragStatus}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const textRegionalRows = analytics.regionalBreakdown.map((o) =>
    `- ${o.name} (${o.code}): ${o.completedCount}/${o.activeHeadcount} (${o.completionRate}%), Avg Score: ${o.avgPostConfidence || '—'}/5.0 [${o.ragStatus}]`
  ).join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 32px 20px; color: #17221e; background: #ffffff;">
      <div style="border-bottom: 2px solid #1e5b49; padding-bottom: 16px; margin-bottom: 24px;">
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #b56b3b; font-weight: 800; margin: 0 0 4px 0;">Help Meet Shine Initiative (HMSI)</p>
        <h1 style="font-size: 24px; font-weight: 900; color: #17221e; margin: 0;">Weekly Media-Safety Training & RAG Alert</h1>
      </div>

      <div style="background: ${statusBadgeBg}; border-left: 4px solid ${statusBadgeColor}; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${statusBadgeColor};">
          Institutional Status: ${statusLabel}
        </p>
        <p style="margin: 6px 0 0 0; font-size: 14px; line-height: 1.5; color: #17221e;">
          Global Completion: <strong>${analytics.summary.globalCompletionRate}%</strong> (${analytics.summary.totalCompleted}/${analytics.summary.totalHeadcount} staff/volunteers) · 
          Avg Confidence: <strong>${analytics.summary.avgPostConfidence}/5.0</strong> (+${analytics.summary.overallDelta} pts) · 
          Child Privacy Mastery: <strong>${analytics.summary.dataProtectionMasteryPct}%</strong>.
        </p>
      </div>

      ${
        attentionOffices.length > 0
          ? `
            <div style="background: #fff8e8; border: 1px solid #e1ad45; padding: 14px 18px; margin-bottom: 24px;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #92400e;">⚠️ Attention Required in ${attentionOffices.length} Regional Office(s):</p>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #78350f;">
                ${attentionOffices.map((o) => `<li><strong>${escapeHtml(o.name)}:</strong> ${o.completionRate}% completion rate (${o.completedCount}/${o.activeHeadcount}), Score: ${o.avgPostConfidence}/5.0</li>`).join('')}
              </ul>
            </div>
          `
          : ''
      }

      <h2 style="font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #17221e; margin: 24px 0 12px 0;">Regional Office Breakdown</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f6f4ef; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #66716a; letter-spacing: 0.5px;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #d9d6ce;">Unit</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d9d6ce;">Completed</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d9d6ce;">Rate</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d9d6ce;">Score</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #d9d6ce;">RAG</th>
          </tr>
        </thead>
        <tbody>
          ${regionalRows}
        </tbody>
      </table>

      <h2 style="font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #17221e; margin: 24px 0 12px 0;">Simulation Scenario Mastery Rates</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px;">
        <div style="background: #f6f4ef; padding: 12px; text-align: center; border: 1px solid #e8e5dc;">
          <p style="margin: 0; font-size: 18px; font-weight: 900; color: #1e5b49;">${analytics.scenarioMastery.childMedicalPct}%</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #66716a;">Child Medical Appeal</p>
        </div>
        <div style="background: #f6f4ef; padding: 12px; text-align: center; border: 1px solid #e8e5dc;">
          <p style="margin: 0; font-size: 18px; font-weight: 900; color: #1e5b49;">${analytics.scenarioMastery.foodMetricsPct}%</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #66716a;">Food Aid Metrics</p>
        </div>
        <div style="background: #f6f4ef; padding: 12px; text-align: center; border: 1px solid #e8e5dc;">
          <p style="margin: 0; font-size: 18px; font-weight: 900; color: #1e5b49;">${analytics.scenarioMastery.whatsappScamPct}%</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #66716a;">WhatsApp Fraud Triage</p>
        </div>
      </div>

      <div style="border-top: 1px solid #eeeae2; padding-top: 18px; font-size: 12px; line-height: 1.6; color: #66716a;">
        <p style="margin: 0 0 6px 0;"><strong>Recommended Operational Actions:</strong></p>
        <ul style="margin: 0 0 12px 0; padding-left: 20px;">
          <li>For units in <strong>Amber</strong>, ensure team coordinators distribute the <em>1-Page Pocket Reference Card</em> and conduct 5-minute pair simulations before upcoming field distributions.</li>
          <li>For units in <strong>Red</strong>, contact the Communications Lead to schedule a mandatory 30-minute facilitator-led drill.</li>
        </ul>
        <p style="margin: 0; font-size: 11px; color: #999;">
          Automated governance dispatch by HMSI Cron Engine · Secure admin view available at <a href="https://www.hmsi.org.ng/hmsi-control" style="color: #1e5b49; font-weight: bold;">hmsi.org.ng/hmsi-control</a>.
        </p>
      </div>
    </div>
  `;

  const text = `
Help Meet Shine Initiative (HMSI) - Weekly Media-Safety Training & RAG Alert

Institutional Status: ${statusLabel}
Global Completion: ${analytics.summary.globalCompletionRate}% (${analytics.summary.totalCompleted}/${analytics.summary.totalHeadcount} completed)
Avg Post-Confidence Score: ${analytics.summary.avgPostConfidence}/5.0 (+${analytics.summary.overallDelta} pts)
Child & Medical Privacy Mastery: ${analytics.summary.dataProtectionMasteryPct}%

${
  attentionOffices.length > 0
    ? `ATTENTION REQUIRED IN ${attentionOffices.length} REGIONAL OFFICE(S):\n` +
      attentionOffices.map((o) => `* ${o.name}: ${o.completionRate}% completion, Score: ${o.avgPostConfidence}/5.0 [${o.ragStatus}]`).join('\n') +
      '\n\n'
    : ''
}
Regional Office Performance:
${textRegionalRows}

Scenario Mastery Rates:
- Child Medical Appeal: ${analytics.scenarioMastery.childMedicalPct}%
- Food Aid Delivery Metrics: ${analytics.scenarioMastery.foodMetricsPct}%
- WhatsApp Scam Triage: ${analytics.scenarioMastery.whatsappScamPct}%

Review the live dashboard: https://www.hmsi.org.ng/hmsi-control
  `.trim();

  return { html, text, isRed, isAmber };
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

    const attentionOffices = analytics.regionalBreakdown.filter(
      (office) => office.ragStatus === 'AMBER' || office.ragStatus === 'RED'
    );

    const emailData = buildEmailContent(analytics, attentionOffices);

    const subjectPrefix = emailData.isRed
      ? '[URGENT ACTION REQUIRED · RED STATUS]'
      : emailData.isAmber
      ? '[HMSI GOVERNANCE ALERT · AMBER STATUS]'
      : '[HMSI GOVERNANCE DIGEST]';

    const subject = `${subjectPrefix} Weekly Media-Safety Training & Regional RAG Summary`;

    const recipients = new Set<string>([DEFAULT_ALERT_RECIPIENT]);
    if (process.env.HMSI_ADMIN_EMAIL) {
      recipients.add(process.env.HMSI_ADMIN_EMAIL.trim().toLowerCase());
    }

    // Add lead coordinators of attention offices
    for (const office of attentionOffices) {
      if (office.leadCoordinatorEmail && office.leadCoordinatorEmail.includes('@')) {
        recipients.add(office.leadCoordinatorEmail.trim().toLowerCase());
      }
    }

    const recipientList = Array.from(recipients);

    // Dispatch email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipientList,
        subject,
        html: emailData.html,
        text: emailData.text,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[Training Cron Alert] Resend dispatch failed:', resendResult);
      return NextResponse.json({ error: 'Failed to dispatch alert via Resend.', details: resendResult }, { status: 502 });
    }

    // Record alert in training_alert_logs table
    for (const office of attentionOffices) {
      await admin.from('training_alert_logs').insert({
        regional_office_id: office.officeId || null,
        alert_type: office.ragStatus === 'RED' ? 'CRITICAL_DATA_PROTECTION_DEFICIT' : 'LOW_COMPLETION',
        trigger_metric_value: office.completionRate,
        threshold_value: 80.0,
        recipient_emails: recipientList,
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'Weekly training RAG alert evaluated and dispatched successfully.',
      resendId: resendResult.id,
      globalStatus: analytics.summary.ragStatus,
      attentionOfficesCount: attentionOffices.length,
      recipients: recipientList,
    });
  } catch (error) {
    console.error('[Training Cron Alert] Unexpected cron error:', error);
    return NextResponse.json({ error: 'Failed to execute training alert cron.' }, { status: 500 });
  }
}
