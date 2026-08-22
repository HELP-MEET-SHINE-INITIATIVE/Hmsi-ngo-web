import { NextResponse } from 'next/server';
import { evaluateDeadLetterQueue } from '../../../../scripts/monitor_dead_letter_queue';

export const runtime = 'nodejs';
export const maxDuration = 30;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const lookbackHours = searchParams.has('lookback') ? Number(searchParams.get('lookback')) : 24;
    const failureThreshold = searchParams.has('threshold') ? Number(searchParams.get('threshold')) : 2;

    const result = await evaluateDeadLetterQueue({
      lookbackHours,
      failureThreshold,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('[Dead-Letter Cron] Unexpected error in monitor execution:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate dead-letter queue.' },
      { status: 500 }
    );
  }
}
