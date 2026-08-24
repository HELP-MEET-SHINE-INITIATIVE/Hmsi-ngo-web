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

export function getAdminEmailFromCookie(cookieHeader: string | null) {
  const config = getAdminConfig();
  if (!config || !cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = cookie?.slice(`${ADMIN_SESSION_COOKIE}=`.length);
  if (!token) return null;

  const [encodedEmail, expiresAtText, signature] = token.split('.');
  const expiresAt = Number(expiresAtText);
  if (!encodedEmail || !Number.isFinite(expiresAt) || !signature || expiresAt < Math.floor(Date.now() / 1000)) return null;

  const payload = `${encodedEmail}.${expiresAt}`;
  const expectedSignature = sign(payload, config.secret);
  const supplied = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  const decodedEmail = Buffer.from(encodedEmail, 'base64url').toString('utf8').trim().toLowerCase();
  const suppliedEmail = digest(decodedEmail);
  const configuredEmail = digest(config.email);
  if (!decodedEmail || suppliedEmail.length !== configuredEmail.length || !timingSafeEqual(suppliedEmail, configuredEmail)) return null;
  return decodedEmail;
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
