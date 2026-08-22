import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'hmsi_member_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
type MemberSession = { holderId: string; holderRole: 'worker' | 'volunteer'; email: string; exp: number };
function secret() { return process.env.WORKER_SESSION_SECRET?.trim() || process.env.HMSI_ADMIN_SESSION_SECRET?.trim() || process.env.CRON_SECRET?.trim() || ''; }
function sign(payload: string) { return createHmac('sha256', secret()).update(payload).digest('base64url'); }
export function createMemberSession(holderId: string, holderRole: MemberSession['holderRole'], email: string) {
  const payload = Buffer.from(JSON.stringify({ holderId, holderRole, email, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function getMemberSessionFromCookie(cookieHeader: string | null): MemberSession | null {
  const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const value = match?.[1];
  if (!value || !secret()) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  try {
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as MemberSession;
    if (!parsed.holderId || !parsed.email || !['worker', 'volunteer'].includes(parsed.holderRole) || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch { return null; }
}
export function attachMemberSession(response: Response | import('next/server').NextResponse, holderId: string, holderRole: MemberSession['holderRole'], email: string) {
  if (!secret() || !('cookies' in response)) return response;
  (response as import('next/server').NextResponse).cookies.set(COOKIE_NAME, createMemberSession(holderId, holderRole, email), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: MAX_AGE_SECONDS, path: '/' });
  return response;
}
export function clearMemberSession(response: import('next/server').NextResponse) {
  response.cookies.set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
  return response;
}
