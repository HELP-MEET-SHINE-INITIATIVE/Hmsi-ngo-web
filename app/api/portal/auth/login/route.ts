import { NextResponse } from 'next/server';
import { attachPortalSession, resolvePortalEmail, signInPortal } from '../../../../../lib/portalAuth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!identifier || !password || password.length > 256) return NextResponse.json({ error: 'Email or HMSI ID and password are required.' }, { status: 400 });
  try {
    const email = await resolvePortalEmail(identifier);
    if (!email) return NextResponse.json({ error: 'Invalid portal credentials.' }, { status: 401 });
    const result = await signInPortal(email, password);
    const response = NextResponse.json({ user: result.identity });
    attachPortalSession(response, result.accessToken, result.refreshToken);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: message.includes('configured') ? 'Portal sign-in is temporarily unavailable.' : 'Invalid portal credentials.' }, { status: message.includes('configured') ? 503 : 401 });
  }
}
