import { NextResponse } from 'next/server';
import { ONBOARDING_CTA_CATALOG } from '../../../../lib/onboardingCtas';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ALERT_THRESHOLD = 5;
const ALERT_RECIPIENT = 'contact@hmsi.org.ng';
const REPORTING_LIMIT = 10000;
const CTA_KEYS = new Set<string>(ONBOARDING_CTA_CATALOG.map((cta) => cta.key));

type CtaEvent = {
  event_type: 'cta_impression' | 'cta_click';
  cta_key: string | null;
};

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

function getPreviousFullWeek() {
  const now = new Date();
  const currentWeekday = now.getUTCDay();
  const daysSinceMonday = (currentWeekday + 6) % 7;
  const currentWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));
  const periodEnd = currentWeekStart;
  const periodStart = new Date(currentWeekStart);
  periodStart.setUTCDate(periodStart.getUTCDate() - 7);
  return { periodStart, periodEnd };
}

function percentage(clicks: number, impressions: number) {
  return impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'UTC' }).format(value);
}

function buildEmail({ periodStart, periodEnd, impressions, clicks, ctr, topCtas }: { periodStart: Date; periodEnd: Date; impressions: number; clicks: number; ctr: number; topCtas: Array<{ label: string; impressions: number; clicks: number; ctr: number | null }> }) {
  const ctaRows = topCtas.length > 0
    ? topCtas.map((cta) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e1d8;color:#17221e">${escapeHtml(cta.label)}</td><td style="padding:10px 0;border-bottom:1px solid #e5e1d8;text-align:right;color:#66716a">${cta.impressions} / ${cta.clicks}</td><td style="padding:10px 0;border-bottom:1px solid #e5e1d8;text-align:right;font-weight:700;color:#1e5b49">${cta.ctr ?? 0}%</td></tr>`).join('')
    : '<tr><td colspan="3" style="padding:12px 0;color:#66716a">No CTA activity was recorded.</td></tr>';
  const textRows = topCtas.map((cta) => `${cta.label}: ${cta.impressions} impressions, ${cta.clicks} clicks, ${cta.ctr ?? 0}% CTR`).join('\n');
  return {
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:36px 22px;color:#17221e"><p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b56b3b;font-weight:700">Help Meet Shine Initiative</p><h1 style="font-size:30px;line-height:1.15;color:#1e5b49">Weekly onboarding CTA alert</h1><p style="font-size:16px;line-height:1.6">Overall onboarding CTA CTR fell below the HMSI alert threshold of <strong>${ALERT_THRESHOLD}%</strong> for the previous full week.</p><div style="background:#fff8e8;border-left:4px solid #e1ad45;padding:16px;margin:24px 0"><p style="margin:0;font-size:26px;font-weight:700;color:#916719">${ctr}% overall CTR</p><p style="margin:8px 0 0;color:#66716a">${clicks} clicks from ${impressions} CTA impressions</p></div><p style="color:#66716a">Reporting period: ${formatDate(periodStart)} – ${formatDate(periodEnd)} (UTC)</p><h2 style="font-size:18px;color:#17221e;margin-top:30px">Top CTA activity</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="padding:10px 0;text-align:left;border-bottom:2px solid #d9d6ce">CTA</th><th style="padding:10px 0;text-align:right;border-bottom:2px solid #d9d6ce">Impr. / clicks</th><th style="padding:10px 0;text-align:right;border-bottom:2px solid #d9d6ce">CTR</th></tr></thead><tbody>${ctaRows}</tbody></table><p style="margin-top:30px;font-size:12px;line-height:1.6;color:#66716a">This automated alert uses aggregate first-party CTA events only. It contains no names, email addresses of visitors, IP addresses, raw URLs, or beneficiary information. Open the HMSI admin portal to review the full CTA performance table.</p></div>`,
    text: `HMSI weekly onboarding CTA alert\n\nOverall CTA CTR: ${ctr}% (threshold: ${ALERT_THRESHOLD}%)\nClicks: ${clicks}\nImpressions: ${impressions}\nReporting period: ${formatDate(periodStart)} – ${formatDate(periodEnd)} (UTC)\n\nTop CTA activity:\n${textRows || 'No CTA activity was recorded.'}\n\nReview the full report in the HMSI admin portal.`,
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return NextResponse.json({ error: 'Resend is not configured on the server.' }, { status: 503 });

  const { periodStart, periodEnd } = getPreviousFullWeek();
  const periodKey = `${periodStart.toISOString().slice(0, 10)}_${periodEnd.toISOString().slice(0, 10)}`;
  const events = await admin
    .from('page_views')
    .select('event_type,cta_key')
    .gte('created_at', periodStart.toISOString())
    .lt('created_at', periodEnd.toISOString())
    .in('event_type', ['cta_impression', 'cta_click'])
    .limit(REPORTING_LIMIT);

  if (events.error) {
    console.error('[CTA Alert] Failed to load CTA events:', events.error);
    return NextResponse.json({ error: 'CTA analytics could not be loaded.' }, { status: 503 });
  }

  const counts = new Map<string, { impressions: number; clicks: number }>();
  (events.data as CtaEvent[] || []).forEach((event) => {
    if (!event.cta_key || !CTA_KEYS.has(event.cta_key)) return;
    const current = counts.get(event.cta_key) || { impressions: 0, clicks: 0 };
    if (event.event_type === 'cta_impression') current.impressions += 1;
    if (event.event_type === 'cta_click') current.clicks += 1;
    counts.set(event.cta_key, current);
  });

  const ctas = ONBOARDING_CTA_CATALOG.map((cta) => {
    const current = counts.get(cta.key) || { impressions: 0, clicks: 0 };
    return { label: cta.label, impressions: current.impressions, clicks: current.clicks, ctr: percentage(current.clicks, current.impressions) };
  });
  const impressions = ctas.reduce((total, cta) => total + cta.impressions, 0);
  const clicks = ctas.reduce((total, cta) => total + cta.clicks, 0);
  const ctr = percentage(clicks, impressions);

  if (ctr === null || ctr >= ALERT_THRESHOLD) {
    return NextResponse.json({ ok: true, alertSent: false, reason: ctr === null ? 'no_data' : 'threshold_not_breached', periodKey, impressions, clicks, ctr });
  }

  const existing = await admin.from('cta_alert_log').select('period_key,status').eq('period_key', periodKey).limit(1).maybeSingle();
  if (existing.error) return NextResponse.json({ error: 'CTA alert log could not be checked.' }, { status: 503 });
  if (existing.data?.status === 'sent') return NextResponse.json({ ok: true, alertSent: false, reason: 'already_sent', periodKey, impressions, clicks, ctr });

  const claim = existing.data
    ? await admin.from('cta_alert_log').update({ period_start: periodStart.toISOString(), period_end: periodEnd.toISOString(), threshold: ALERT_THRESHOLD, impressions, clicks, ctr, status: 'pending', error_message: null }).eq('period_key', periodKey)
    : await admin.from('cta_alert_log').insert({ period_key: periodKey, period_start: periodStart.toISOString(), period_end: periodEnd.toISOString(), threshold: ALERT_THRESHOLD, impressions, clicks, ctr, status: 'pending' });
  if (claim.error) return NextResponse.json({ error: 'CTA alert delivery could not be claimed.' }, { status: 503 });

  const topCtas = ctas.filter((cta) => cta.impressions > 0).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 5);
  const email = buildEmail({ periodStart, periodEnd, impressions, clicks, ctr, topCtas });
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `hmsi-cta-alert-${periodKey}` },
    body: JSON.stringify({ from, to: [ALERT_RECIPIENT], subject: `[HMSI] Weekly CTA CTR alert: ${ctr}% below ${ALERT_THRESHOLD}%`, html: email.html, text: email.text }),
  });
  const resendResult = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    await admin.from('cta_alert_log').update({ status: 'failed', error_message: typeof resendResult?.message === 'string' ? resendResult.message.slice(0, 1000) : 'Resend rejected the alert.' }).eq('period_key', periodKey);
    return NextResponse.json({ error: 'CTA alert email was not accepted.' }, { status: 502 });
  }

  await admin.from('cta_alert_log').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).eq('period_key', periodKey);
  return NextResponse.json({ ok: true, alertSent: true, periodKey, impressions, clicks, ctr });
}
