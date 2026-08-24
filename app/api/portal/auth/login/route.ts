import { NextResponse } from 'next/server';
import { attachPortalSession, signInPortal } from '../../../../../lib/portalAuth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 256) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  try {
    const result = await signInPortal(email, password);
    const response = NextResponse.json({ user: result.identity });
    attachPortalSession(response, result.accessToken, result.refreshToken);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal sign-in is unavailable.';
    return NextResponse.json({ error: message }, { status: message.includes('configured') ? 503 : 401 });
  }
}
