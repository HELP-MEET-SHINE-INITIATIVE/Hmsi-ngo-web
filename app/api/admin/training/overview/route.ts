import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getTrainingAnalyticsOverview } from '../../../../../lib/trainingAnalytics';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  // 1. Authenticate Admin Session
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const moduleCode = searchParams.get('module') || 'MEDIA_SAFETY_2026';

    const analytics = await getTrainingAnalyticsOverview(moduleCode);

    return NextResponse.json(analytics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[Admin Training API] Error loading analytics:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate training analytics overview.' },
      { status: 500 },
    );
  }
}
