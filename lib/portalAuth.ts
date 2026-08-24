import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabaseAdmin';

const COOKIE_NAME = 'hmsi_portal_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export type PortalRole = 'worker' | 'volunteer' | 'member';
export type PortalIdentity = { authUserId: string; profileId: string; email: string; name: string; role: PortalRole; profilePhotoPath: string | null; profilePhotoUrl: string | null };

type PortalCookie = { accessToken: string; refreshToken?: string; exp: number };

function getPublicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function cookieSecret() { return process.env.PORTAL_SESSION_SECRET?.trim() || process.env.HMSI_ADMIN_SESSION_SECRET?.trim() || ''; }
function encodeCookie(value: PortalCookie) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function decodeCookie(value: string): PortalCookie | null { try { const parsed = JSON.parse(Buffer.from(value, 'base64url').toString()) as PortalCookie; return parsed.accessToken && parsed.exp > Math.floor(Date.now() / 1000) ? parsed : null; } catch { return null; } }
function digest(value: string) { return createHash('sha256').update(value.trim().toUpperCase()).digest(); }
export function hashPortalCode(value: string) { return digest(value).toString('hex'); }
export function getPortalCookieName() { return COOKIE_NAME; }

export function attachPortalSession(response: NextResponse, accessToken: string, refreshToken?: string) {
  if (!cookieSecret()) throw new Error('PORTAL_SESSION_SECRET is not configured on the HMSI server.');
  response.cookies.set(COOKIE_NAME, encodeCookie({ accessToken, refreshToken, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: MAX_AGE_SECONDS, path: '/' });
  return response;
}
export function clearPortalSession(response: NextResponse) { response.cookies.set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' }); return response; }

async function findIdentity(user: User): Promise<PortalIdentity | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !user.email) return null;
  const email = user.email.trim().toLowerCase();
  const worker = await admin.from('workers').select('id,name,email,status,onboarding_status,auth_user_id,profile_photo_path,profile_photo_url').eq('auth_user_id', user.id).eq('email', email).maybeSingle();
  if (worker.data && worker.data.status === 'active' && worker.data.onboarding_status === 'completed') return { authUserId: user.id, profileId: worker.data.id, email, name: worker.data.name, role: 'worker', profilePhotoPath: worker.data.profile_photo_path, profilePhotoUrl: worker.data.profile_photo_url };
  const volunteer = await admin.from('volunteer_applications').select('id,name,email,status,account_status,applicant_role,auth_user_id,profile_photo_path,profile_photo_url').eq('auth_user_id', user.id).eq('email', email).maybeSingle();
  if (volunteer.data && volunteer.data.status === 'approved' && volunteer.data.account_status === 'active' && volunteer.data.applicant_role === 'volunteer') return { authUserId: user.id, profileId: volunteer.data.id, email, name: volunteer.data.name, role: 'volunteer', profilePhotoPath: volunteer.data.profile_photo_path, profilePhotoUrl: volunteer.data.profile_photo_url };
  const member = await admin.from('hmsi_members').select('id,name,email,status,auth_user_id,profile_photo_path,profile_photo_url').eq('auth_user_id', user.id).eq('email', email).maybeSingle();
  if (member.data && member.data.status === 'active') return { authUserId: user.id, profileId: member.data.id, email, name: member.data.name, role: 'member', profilePhotoPath: member.data.profile_photo_path, profilePhotoUrl: member.data.profile_photo_url };
  return null;
}

export async function getPortalIdentity(request: Request): Promise<PortalIdentity | null> {
  const raw = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))?.[1];
  const cookie = raw ? decodeCookie(raw) : null;
  if (!cookie) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: authData } = await admin.auth.getUser(cookie.accessToken);
  return authData.user ? findIdentity(authData.user) : null;
}

export async function signInPortal(email: string, password: string) {
  const client = getPublicClient();
  if (!client) throw new Error('Supabase Auth is not configured on the HMSI server.');
  const result = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (result.error || !result.data.session || !result.data.user) throw new Error('Invalid portal credentials.');
  const identity = await findIdentity(result.data.user);
  if (!identity) throw new Error('This account is not approved or has no active HMSI portal access.');
  return { identity, accessToken: result.data.session.access_token, refreshToken: result.data.session.refresh_token };
}

export function getRecoveryRedirect(siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hmsi.org.ng') {
  const url = new URL(siteUrl);
  const allowedHosts = new Set(['hmsi.org.ng', 'www.hmsi.org.ng']);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) throw new Error('Invalid HMSI recovery URL configuration.');
  return `${url.origin}/reset-password`;
}

export async function requestPortalPasswordReset(email: string, redirectTo: string) {
  const client = getPublicClient();
  if (!client) throw new Error('Supabase Auth is not configured on the HMSI server.');
  const redirect = new URL(redirectTo);
  const allowedHosts = new Set(['hmsi.org.ng', 'www.hmsi.org.ng']);
  if (redirect.protocol !== 'https:' || !allowedHosts.has(redirect.hostname) || redirect.pathname !== '/reset-password' || redirect.search || redirect.hash) throw new Error('Invalid HMSI recovery redirect.');
  await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: redirect.toString() });
}

export function activationCodeMatches(supplied: string, expectedHash: string) {
  const actual = digest(supplied);
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
