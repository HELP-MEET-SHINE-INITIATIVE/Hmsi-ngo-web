import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const requiredTables = ['fundraisers', 'news_articles', 'featured_story_drafts', 'donations', 'donation_ingestion_events'] as const;

export async function GET(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  const tableChecks = await Promise.all(requiredTables.map(async (table) => {
    const result = await admin.from(table).select('id', { head: true, count: 'exact' }).limit(1);
    return { table, ready: !result.error, recordCount: result.error ? null : result.count ?? 0 };
  }));
  const databaseReady = tableChecks.every((check) => check.ready);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const paystackPublicKeyConfigured = Boolean(process.env.NEXT_PUBLIC_PAYSTACK_KEY?.trim());
  const paystackWebhookSecretConfigured = Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
  const ingestionEventsReady = tableChecks.find((check) => check.table === 'donation_ingestion_events')?.ready === true;

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    database: { status: databaseReady ? 'ready' : 'attention', tables: tableChecks },
    notifications: { status: emailConfigured ? 'configured' : 'attention', resendApiConfigured: emailConfigured, note: emailConfigured ? 'Server-side email credentials are configured.' : 'Email credential is not configured; no delivery test was sent.' },
    payments: {
      status: paystackPublicKeyConfigured && paystackWebhookSecretConfigured && ingestionEventsReady ? 'configured' : 'attention',
      publicCheckoutKeyConfigured: paystackPublicKeyConfigured,
      webhookSecretConfigured: paystackWebhookSecretConfigured,
      ingestionAuditAvailable: ingestionEventsReady,
      note: 'This endpoint verifies local configuration only. It does not contact Paystack or confirm that a remote webhook subscription is active.',
    },
  });
}
