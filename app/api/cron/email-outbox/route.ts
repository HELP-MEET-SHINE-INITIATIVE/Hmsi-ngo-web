import { NextResponse } from 'next/server';
import { processHmsiEmailOutbox, queueDueAbandonedDonationFollowups, queueDueRecurringDonorStewardship } from '../../../../lib/emailAutomation';

export const runtime = 'nodejs';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const abandoned = await queueDueAbandonedDonationFollowups();
    const recurring = await queueDueRecurringDonorStewardship();
    const result = await processHmsiEmailOutbox(50);
    return NextResponse.json({ ok: true, abandoned, recurring, ...result });
  } catch (error) {
    console.error('[EmailOutbox] processing failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Email outbox processing failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
