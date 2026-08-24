import { NextResponse } from 'next/server';
import { requestPortalPasswordReset } from '../../../../../lib/portalAuth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > 320) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hmsi.org.ng';
    await requestPortalPasswordReset(email, `${siteUrl}/reset-password`);
  } catch (error) {
    console.error('[Portal Auth] Password recovery request failed:', error instanceof Error ? error.message : 'unknown');
  }
  return NextResponse.json({ message: 'If an eligible HMSI account exists for that email, recovery instructions have been sent.' });
}
