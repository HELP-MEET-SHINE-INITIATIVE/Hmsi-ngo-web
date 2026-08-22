import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getTrainingAnalyticsOverview, type TrainingAnalyticsOverview } from '../../../../lib/trainingAnalytics';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEFAULT_RECIPIENT = 'contact@hmsi.org.ng';

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'UTC' }).format(date);
}

interface PlatformOverviewData {
  activeCampaignsCount: number;
  totalDonationsNgn: number;
  donationsCount: number;
  activeWorkersCount: number;
  pendingVolunteersCount: number;
}

function buildNationalDigestEmail(analytics: TrainingAnalyticsOverview, platformData: PlatformOverviewData, runDate: Date) {
  const globalRag = analytics.summary.ragStatus;
  const isGreen = globalRag === 'GREEN';
  const isAmber = globalRag === 'AMBER';
  const isRed = globalRag === 'RED';

  const badgeColor = isGreen ? '#065f46' : isAmber ? '#92400e' : '#991b1b';
  const badgeBg = isGreen ? '#d1fae5' : isAmber ? '#fef3c7' : '#fee2e2';
  const borderAccent = isGreen ? '#1e5b49' : isAmber ? '#d97706' : '#dc2626';

  const subject = `[HMSI National Governance Digest] Weekly Executive Briefing · ${globalRag} Status · ${formatDate(runDate)}`;

  const regionalRows = analytics.regionalBreakdown.map((office) => {
    const oBadgeColor = office.ragStatus === 'GREEN' ? '#065f46' : office.ragStatus === 'AMBER' ? '#92400e' : '#991b1b';
    const oBadgeBg = office.ragStatus === 'GREEN' ? '#d1fae5' : office.ragStatus === 'AMBER' ? '#fef3c7' : '#fee2e2';

    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; font-weight: bold; color: #17221e;">
          ${escapeHtml(office.name)}<br>
          <span style="font-size: 10px; color: #66716a; font-weight: normal;">${escapeHtml(office.state)} State · ${escapeHtml(office.code)}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; text-align: center; color: #17221e;">
          ${office.completedCount} / ${office.activeHeadcount}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; text-align: center; font-weight: bold; color: #17221e;">
          ${office.completionRate}%
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; text-align: center; font-weight: bold; color: #1e5b49;">
          ${office.avgPostConfidence > 0 ? `${office.avgPostConfidence} / 5.0` : '—'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e1d8; text-align: right;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: ${oBadgeBg}; color: ${oBadgeColor};">
            ${office.ragStatus}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 36px 22px; color: #17221e; background: #ffffff;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #1e5b49; padding-bottom: 18px; margin-bottom: 24px;">
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #b56b3b; font-weight: 800; margin: 0 0 4px 0;">Help Meet Shine Initiative (HMSI)</p>
        <h1 style="font-size: 26px; font-weight: 900; color: #17221e; margin: 0;">Weekly National Governance Digest</h1>
        <p style="font-size: 13px; color: #66716a; margin: 6px 0 0 0;">
          Official Executive Briefing for the Board of Trustees · <strong>${formatDate(runDate)}</strong>
        </p>
      </div>

      <!-- Institutional Health Banner -->
      <div style="background: ${badgeBg}; border-left: 4px solid ${borderAccent}; padding: 18px 20px; margin-bottom: 28px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: ${badgeColor};">
            National Compliance Health: ${globalRag} STATUS
          </span>
          <span style="font-size: 18px; font-weight: 900; color: ${borderAccent};">
            ${analytics.summary.globalCompletionRate}% Total Completion
          </span>
        </div>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #17221e;">
          <strong>Executive Summary:</strong> ${analytics.summary.totalCompleted} of ${analytics.summary.totalHeadcount} enrolled personnel have completed the media-safety curriculum. Average self-assessed confidence stands at <strong>${analytics.summary.avgPostConfidence} / 5.0</strong> (+${analytics.summary.overallDelta} net delta), with <strong>${analytics.summary.dataProtectionMasteryPct}%</strong> achieving Peak Mastery on Child and Beneficiary Data Privacy.
        </p>
      </div>

      <!-- Key Governance Pillar Grid -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px;">
        <div style="background: #f6f4ef; padding: 16px; border: 1px solid #e8e5dc; text-align: center;">
          <p style="margin: 0; font-size: 22px; font-weight: 900; color: #1e5b49;">${analytics.summary.dataProtectionMasteryPct}%</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #66716a;">Child Privacy Mastery</p>
        </div>
        <div style="background: #f6f4ef; padding: 16px; border: 1px solid #e8e5dc; text-align: center;">
          <p style="margin: 0; font-size: 22px; font-weight: 900; color: #17221e;">₦${platformData.totalDonationsNgn.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #66716a;">Verified Donations</p>
        </div>
        <div style="background: #f6f4ef; padding: 16px; border: 1px solid #e8e5dc; text-align: center;">
          <p style="margin: 0; font-size: 22px; font-weight: 900; color: #b56b3b;">${platformData.activeWorkersCount + platformData.pendingVolunteersCount}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #66716a;">Active & Pending Team</p>
        </div>
      </div>

      <!-- Section 1: Regional Training Performance -->
      <h2 style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #17221e; margin: 0 0 12px 0;">
        1. Regional Office Performance & RAG Matrix
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 28px;">
        <thead>
          <tr style="background: #f6f4ef; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #66716a; letter-spacing: 0.5px;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #d9d6ce;">Operational Unit</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d9d6ce;">Headcount</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d9d6ce;">Completion</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d9d6ce;">Avg Score</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #d9d6ce;">RAG</th>
          </tr>
        </thead>
        <tbody>
          ${regionalRows}
        </tbody>
      </table>

      <!-- Section 2: Practical Simulation Mastery -->
      <h2 style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #17221e; margin: 0 0 12px 0;">
        2. Practical Simulation Pass Rates
      </h2>
      <div style="background: #faf9f6; border: 1px solid #d9d6ce; padding: 16px 20px; margin-bottom: 28px;">
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #333d37;">
          <li><strong>Child Medical Appeal (Privacy & Deadline Pressure):</strong> <span style="font-weight: 900; color: #1e5b49;">${analytics.scenarioMastery.childMedicalPct}% Pass</span> — Staff refused to disclose child records and resisted 4:00 PM coercive deadlines.</li>
          <li><strong>Disputed Food Aid Delivery Metrics:</strong> <span style="font-weight: 900; color: #1e5b49;">${analytics.scenarioMastery.foodMetricsPct}% Pass</span> — Staff accurately distinguished campaign goals (30 families) from reconciled distribution counts.</li>
          <li><strong>WhatsApp Scam & Fraud Impersonation:</strong> <span style="font-weight: 900; color: #1e5b49;">${analytics.scenarioMastery.whatsappScamPct}% Pass</span> — Correctly classified as RED/Crisis and escalated directly to Trustees.</li>
        </ul>
      </div>

      <!-- Section 3: Platform Transparency & Capacity -->
      <h2 style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #17221e; margin: 0 0 12px 0;">
        3. Operational & Capacity Summary
      </h2>
      <div style="background: #f6f4ef; border: 1px solid #e8e5dc; padding: 16px 20px; margin-bottom: 28px; font-size: 13px; line-height: 1.6; color: #333d37;">
        <p style="margin: 0 0 8px 0;">
          <strong>Active Campaigns:</strong> ${platformData.activeCampaignsCount} verified public fundraising initiatives · 
          <strong>Donations Recorded:</strong> ${platformData.donationsCount} successful transactions totalling ₦${platformData.totalDonationsNgn.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.
        </p>
        <p style="margin: 0;">
          <strong>Field Staffing:</strong> ${platformData.activeWorkersCount} active worker directory records · ${platformData.pendingVolunteersCount} pending volunteer/worker applications awaiting review.
        </p>
      </div>

      <!-- Section 4: Governance Directives -->
      <div style="background: #fff8e8; border-left: 4px solid #e1ad45; padding: 16px 20px; margin-bottom: 24px; font-size: 12px; line-height: 1.6; color: #7a5b16;">
        <p style="margin: 0 0 6px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Trustee Governance Directive for the Week:</p>
        <p style="margin: 0;">
          1. Regional coordinators in <strong>Lagos</strong> and <strong>Delta</strong> are executing simulation catch-up sessions to achieve Green status before Phase 3 rollout.<br>
          2. All public communications strictly adhere to verified field receipts and the approved holding route (<code>contact@hmsi.org.ng</code>).<br>
          3. Absolute non-retaliation remains in effect for all safeguarding and fraud reports escalated in good faith.
        </p>
      </div>

      <!-- Footer & Trustee Sign-off Note -->
      <div style="border-top: 1px solid #eeeae2; padding-top: 18px; font-size: 11px; line-height: 1.5; color: #66716a;">
        <p style="margin: 0 0 4px 0;">
          <strong>Governance Oversight:</strong> Godspower Folorunsho Adebusoye (President & Trustee) · Mary Ogbeide (Trustee & Safeguarding Officer).
        </p>
        <p style="margin: 0; color: #999;">
          Automated Monday 09:00 UTC dispatch by HMSI Governance Engine · Live control panel: <a href="https://www.hmsi.org.ng/hmsi-control" style="color: #1e5b49; font-weight: bold;">hmsi.org.ng/hmsi-control</a>.
        </p>
      </div>
    </div>
  `;

  const text = `
Help Meet Shine Initiative (HMSI) - Weekly National Governance Digest
Date: ${formatDate(runDate)}
National Status: ${globalRag} STATUS (${analytics.summary.globalCompletionRate}% completion)

1. Training & Media-Safety Governance:
- Global Completion: ${analytics.summary.totalCompleted}/${analytics.summary.totalHeadcount} (${analytics.summary.globalCompletionRate}%)
- Avg Post-Confidence: ${analytics.summary.avgPostConfidence}/5.0 (+${analytics.summary.overallDelta} net delta)
- Child Privacy Peak Mastery: ${analytics.summary.dataProtectionMasteryPct}%

Regional Breakdown:
${analytics.regionalBreakdown.map((o) => `- ${o.name}: ${o.completedCount}/${o.activeHeadcount} (${o.completionRate}%), Score: ${o.avgPostConfidence || '—'}/5.0 [${o.ragStatus}]`).join('\n')}

2. Scenario Mastery Rates:
- Child Medical Appeal: ${analytics.scenarioMastery.childMedicalPct}%
- Food Aid Delivery Metrics: ${analytics.scenarioMastery.foodMetricsPct}%
- WhatsApp Scam Detection: ${analytics.scenarioMastery.whatsappScamPct}%

3. Platform & Operations:
- Verified Donations: ₦${platformData.totalDonationsNgn.toLocaleString('en-NG')} (${platformData.donationsCount} donations)
- Active Campaigns: ${platformData.activeCampaignsCount}
- Active Workers: ${platformData.activeWorkersCount} (Pending Volunteers: ${platformData.pendingVolunteersCount})

Review in Admin Control Center: https://www.hmsi.org.ng/hmsi-control
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
    const runDate = new Date();

    // 1. Fetch Training Analytics
    const analytics = await getTrainingAnalyticsOverview('MEDIA_SAFETY_2026');

    // 2. Fetch Platform Metrics in Parallel
    const [fundraisersRes, donationsRes, workersRes, volunteersRes] = await Promise.all([
      admin.from('fundraisers').select('id').eq('status', 'active'),
      admin.from('donations').select('amount_ngn, status').eq('status', 'success'),
      admin.from('workers').select('id').eq('status', 'active'),
      admin.from('volunteer_applications').select('id').eq('status', 'pending'),
    ]);

    const activeCampaignsCount = fundraisersRes.data?.length || 0;
    const successfulDonations = donationsRes.data || [];
    const totalDonationsNgn = successfulDonations.reduce((sum, d) => sum + Number(d.amount_ngn || 0), 0);
    const donationsCount = successfulDonations.length;
    const activeWorkersCount = workersRes.data?.length || 0;
    const pendingVolunteersCount = volunteersRes.data?.length || 0;

    const platformData: PlatformOverviewData = {
      activeCampaignsCount,
      totalDonationsNgn,
      donationsCount,
      activeWorkersCount,
      pendingVolunteersCount,
    };

    // 3. Build Digest Email
    const emailData = buildNationalDigestEmail(analytics, platformData, runDate);

    // 4. Resolve Recipients
    const recipients = new Set<string>([DEFAULT_RECIPIENT]);
    if (process.env.HMSI_ADMIN_EMAIL) {
      recipients.add(process.env.HMSI_ADMIN_EMAIL.trim().toLowerCase());
    }

    const recipientList = Array.from(recipients);

    // 5. Dispatch via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipientList,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[National Digest Cron] Resend dispatch failed:', resendResult);
      return NextResponse.json({ error: 'Failed to dispatch National Governance Digest.', details: resendResult }, { status: 502 });
    }

    // 6. Record in Audit Log
    await admin.from('training_alert_logs').insert({
      regional_office_id: null,
      alert_type: `NATIONAL_GOVERNANCE_DIGEST_${analytics.summary.ragStatus}`,
      trigger_metric_value: analytics.summary.globalCompletionRate,
      threshold_value: 85.0,
      recipient_emails: recipientList,
    });

    return NextResponse.json({
      ok: true,
      message: 'National Governance Digest generated and distributed successfully.',
      resendId: resendResult.id,
      globalStatus: analytics.summary.ragStatus,
      globalCompletionRate: analytics.summary.globalCompletionRate,
      totalDonationsNgn,
      recipients: recipientList,
    });
  } catch (error) {
    console.error('[National Digest Cron] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to process National Governance Digest cron.' }, { status: 500 });
  }
}
