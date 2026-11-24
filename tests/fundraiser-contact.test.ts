import { describe, expect, it } from 'vitest';
import { FUNDRAISER_ADMIN_SELECT, FUNDRAISER_PUBLIC_SELECT, normalizeFundraiserContact } from '../lib/fundraiserContacts';

describe('fundraiser creator contact validation', () => {
  it('normalizes valid email and phone values', () => {
    expect(normalizeFundraiserContact({ email: ' Creator@Example.com ', phone: '+234 (801) 234-5678', location: 'Benin City, Edo State' })).toEqual({
      ok: true,
      value: { email: 'creator@example.com', phone: '+2348012345678', location: 'Benin City, Edo State' },
    });
  });
  it('rejects malformed or unsafe values with field-specific messages', () => {
    expect(normalizeFundraiserContact({ email: 'not-an-email', phone: 'abc', location: 'Benin' })).toMatchObject({ ok: false, field: 'email' });
    expect(normalizeFundraiserContact({ email: 'creator@example.com', phone: 'abc', location: 'Benin' })).toMatchObject({ ok: false, field: 'phone' });
    expect(normalizeFundraiserContact({ email: 'creator@example.com', phone: '08012345678', location: '\u0000' })).toMatchObject({ ok: false, field: 'location' });
  });
});

describe('fundraiser data boundary', () => {
  it('keeps private fields out of the public select while allowing explicit admin review', () => {
    expect(FUNDRAISER_PUBLIC_SELECT).not.toMatch(/contact_(email|phone|location)/);
    expect(FUNDRAISER_ADMIN_SELECT).toMatch(/contact_email/);
    expect(FUNDRAISER_ADMIN_SELECT).toMatch(/contact_phone/);
    expect(FUNDRAISER_ADMIN_SELECT).toMatch(/contact_location/);
  });
});
