import { NextResponse } from 'next/server';
import { attachPortalSession, clearPortalSession, refreshPortalSession } from '../../../../../lib/portalAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await refreshPortalSession(request);
    if (!session) return clearPortalSession(NextResponse.json({ error: 'Portal session has expired.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } }));
    const response = NextResponse.json({ profile: session.identity }, { headers: { 'Cache-Control': 'no-store' } });
    return attachPortalSession(response, session.accessToken, session.refreshToken);
  } catch (error) {
    console.error('[Portal refresh] Failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Portal session refresh is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
