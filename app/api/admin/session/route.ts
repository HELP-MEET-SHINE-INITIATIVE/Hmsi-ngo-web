import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  credentialsMatch,
  createAdminSession,
  getAdminEmailFromCookie,
  hasAdminConfig,
} from '../../../../lib/adminSession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const email = getAdminEmailFromCookie(request.headers.get('cookie'));
  return NextResponse.json({ authenticated: Boolean(email), email });
}

export async function POST(request: Request) {
  if (!hasAdminConfig()) {
    return NextResponse.json({ error: 'Admin access is not configured on the server.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const email = String(body.email || '');
    const password = String(body.password || '');

    if (!credentialsMatch(email, password)) {
      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(email), adminCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to sign in at this time.' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...adminCookieOptions(), maxAge: 0 });
  return response;
}
