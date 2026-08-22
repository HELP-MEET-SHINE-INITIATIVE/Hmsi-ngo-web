import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'hmsi_worker_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type WorkerSession = { workerId: string; email: string; exp: number };

function secret() { return process.env.WORKER_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim() || process.env.CRON_SECRET?.trim() || ''; }
function sign(payload: string) { return createHmac('sha256', secret()).update(payload).digest('base64url'); }

export function createWorkerSession(workerId: string, email: string) {
  const payload = Buffer.from(JSON.stringify({ workerId, email, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function getWorkerSessionFromCookie(cookieHeader: string | null): WorkerSession | null {
  const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const value = match?.[1];
  if (!value || !secret()) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  try {
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as WorkerSession;
    if (!parsed.workerId || !parsed.email || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch { return null; }
}

export function attachWorkerSession(response: NextResponse, workerId: string, email: string) {
  if (!secret()) return response;
  response.cookies.set(COOKIE_NAME, createWorkerSession(workerId, email), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: MAX_AGE_SECONDS, path: '/' });
  return response;
}

export function clearWorkerSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
  return response;
}
