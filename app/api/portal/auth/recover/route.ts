import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getRecoveryRedirect, requestPortalPasswordReset } from '../../../../../lib/portalAuth';

export const runtime = 'nodejs';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_EMAIL = 3;
const attempts = new Map<string, { count: number; resetAt: number }>();

function response(body: Record<string, string>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
}
function emailKey(email: string) { return createHash('sha256').update(email.trim().toLowerCase()).digest('hex'); }
function allowed(email: string) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
  const key = emailKey(email);
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + WINDOW_MS }); return true; }
  if (current.count >= MAX_REQUESTS_PER_EMAIL) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > 320 || !email.includes('@')) return response({ error: 'Enter a valid email address.' }, 400);
  if (!allowed(email)) return response({ message: 'If an eligible HMSI account exists for that email, recovery instructions have been sent.' });
  try {
    await requestPortalPasswordReset(email, getRecoveryRedirect());
  } catch (error) {
    console.error('[Portal Auth] Password recovery request failed:', error instanceof Error ? error.message : 'unknown');
  }
  return response({ message: 'If an eligible HMSI account exists for that email, recovery instructions have been sent.' });
}
