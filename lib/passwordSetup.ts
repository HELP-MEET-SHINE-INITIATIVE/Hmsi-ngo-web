import { createHash, randomBytes } from 'node:crypto';

export const PASSWORD_SETUP_LINK_DAYS = 7;

export function createPasswordSetupToken() {
  return randomBytes(32).toString('base64url');
}

export function hashPasswordSetupToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getPasswordSetupUrl(input: { token: string; hmsiId: string; siteUrl?: string }) {
  const base = input.siteUrl?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng';
  const url = new URL(base);
  const allowedHosts = new Set(['hmsi.org.ng', 'www.hmsi.org.ng']);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) throw new Error('Invalid HMSI setup URL configuration.');
  url.pathname = '/setup-password';
  url.search = '';
  url.searchParams.set('token', input.token);
  url.searchParams.set('id', input.hmsiId);
  return url.toString();
}
