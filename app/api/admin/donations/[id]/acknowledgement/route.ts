import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../../lib/adminSession';
import { dispatchDonationAcknowledgement, type DonationRecord } from '../../../../../../lib/donationTracking';
import { getSupabaseAdmin } from '../../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const MINIMUM_RESEND_INTERVAL_MS = 15 * 60 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Cross-site acknowledgement resend is not allowed.' }, { status: 403 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Donation storage is unavailable.' }, { status: 503 });
  const { id } = await params;
  const donation = await admin.from('donations').select('*').eq('id', id).eq('status', 'success').maybeSingle();
  if (donation.error || !donation.data) return NextResponse.json({ error: 'A verified donation is required before a thank-you can be resent.' }, { status: 404 });
  const recent = await admin.from('donation_acknowledgement_events').select('occurred_at').eq('donation_id', id).eq('event_type', 'sent').order('occurred_at', { ascending: false }).limit(1).maybeSingle();
  if (recent.data?.occurred_at && Date.now() - Date.parse(recent.data.occurred_at) < MINIMUM_RESEND_INTERVAL_MS) return NextResponse.json({ error: 'Wait 15 minutes before resending this acknowledgement.' }, { status: 429 });
  const result = await dispatchDonationAcknowledgement({ admin, donation: donation.data as DonationRecord, idempotencySuffix: `admin_${Date.now()}` });
  if (!result.sent) return NextResponse.json({ error: result.error || 'Acknowledgement could not be queued.' }, { status: 503 });
  return NextResponse.json({ sent: true });
}
