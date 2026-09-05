import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'hmsi_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type AdminConfig = {
  email: string;
  password: string;
  secret: string;
};

function getAdminConfig(): AdminConfig | null {
  const email = process.env.HMSI_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.HMSI_ADMIN_PASSWORD;
  const secret = process.env.HMSI_ADMIN_SESSION_SECRET;
  if (!email || !password || !secret) return null;
  return { email, password, secret };
}

export function hasAdminConfig() {
  return Boolean(getAdminConfig());
}

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

export function credentialsMatch(email: string, password: string) {
  const config = getAdminConfig();
  if (!config) return false;

  const suppliedEmail = digest(email.trim().toLowerCase());
  const configuredEmail = digest(config.email);
  const suppliedPassword = digest(password);
  const configuredPassword = digest(config.password);

  return timingSafeEqual(suppliedEmail, configuredEmail) && timingSafeEqual(suppliedPassword, configuredPassword);
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createAdminSession(email: string) {
  const config = getAdminConfig();
  if (!config) throw new Error('Admin credentials are not configured.');

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const encodedEmail = Buffer.from(email.trim().toLowerCase()).toString('base64url');
  const payload = `${encodedEmail}.${expiresAt}`;
  return `${payload}.${sign(payload, config.secret)}`;
}

export type AdminSessionFailureReason =
  | 'missing_session'
  | 'expired_session'
  | 'malformed_session'
  | 'invalid_signature'
  | 'administrator_mismatch'
  | 'auth_configuration_missing';

export type AdminSessionCheck =
  | { ok: true; email: string }
  | { ok: false; reasonCode: AdminSessionFailureReason };

function safeEqual(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function inspectAdminSession(cookieHeader: string | null): AdminSessionCheck {
  const config = getAdminConfig();
  if (!config) return { ok: false, reasonCode: 'auth_configuration_missing' };
  if (!cookieHeader) return { ok: false, reasonCode: 'missing_session' };

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = cookie?.slice(`${ADMIN_SESSION_COOKIE}=`.length);
  if (!token) return { ok: false, reasonCode: 'missing_session' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reasonCode: 'malformed_session' };
  const [encodedEmail, expiresAtText, signature] = parts;
  const expiresAt = Number(expiresAtText);
  if (!encodedEmail || !Number.isFinite(expiresAt) || !signature) {
    return { ok: false, reasonCode: 'malformed_session' };
  }
  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return { ok: false, reasonCode: 'expired_session' };
  }

  const payload = `${encodedEmail}.${expiresAt}`;
  const expectedSignature = sign(payload, config.secret);
  if (!safeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { ok: false, reasonCode: 'invalid_signature' };
  }

  const decodedEmail = Buffer.from(encodedEmail, 'base64url').toString('utf8').trim().toLowerCase();
  if (!decodedEmail || !safeEqual(digest(decodedEmail), digest(config.email))) {
    return { ok: false, reasonCode: 'administrator_mismatch' };
  }
  return { ok: true, email: decodedEmail };
}

export function getAdminEmailFromCookie(cookieHeader: string | null) {
  const checked = inspectAdminSession(cookieHeader);
  return checked.ok ? checked.email : null;
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}
