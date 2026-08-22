import { createHash, randomBytes } from 'node:crypto';

export function createCredentialCode() { return randomBytes(6).toString('hex').toUpperCase(); }
export function hashCredentialCode(code: string) { return createHash('sha256').update(code.trim().toUpperCase()).digest('hex'); }
export function createMemberNumber(role: 'worker' | 'volunteer' | 'member', now = new Date()) {
  const prefix = role === 'worker' ? 'HMSI-W' : role === 'volunteer' ? 'HMSI-V' : 'HMSI-M';
  return `${prefix}-${now.getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}
export function createSchoolCertificateNumber(now = new Date()) { return `HMSI-HS-${now.getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`; }
export function hashMemberSession(value: string) { return createHash('sha256').update(value).digest('hex'); }
