export type FundraiserContactInput = {
  email: string;
  phone: string;
  location: string;
};

export type FundraiserContactValidation =
  | { ok: true; value: FundraiserContactInput }
  | { ok: false; field: keyof FundraiserContactInput; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,31}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function normalizeFundraiserContact(input: Partial<Record<keyof FundraiserContactInput, unknown>>): FundraiserContactValidation {
  const email = clean(input.email, 320).toLowerCase();
  if (!email || email.length > 320 || CONTROL_CHARS.test(email) || !EMAIL_PATTERN.test(email)) {
    return { ok: false, field: 'email', error: 'Enter a valid email address.' };
  }

  const phone = clean(input.phone, 32).replace(/[\u00a0]/g, ' ');
  if (!phone || CONTROL_CHARS.test(phone) || phone.length > 32 || !PHONE_PATTERN.test(phone) || phone.replace(/\D/g, '').length < 7) {
    return { ok: false, field: 'phone', error: 'Enter a valid phone number with country code where applicable.' };
  }
  const normalizedPhone = phone.replace(/[()\s-]+/g, '');

  const location = clean(input.location, 160);
  if (!location || location.length < 2 || location.length > 160 || CONTROL_CHARS.test(location)) {
    return { ok: false, field: 'location', error: 'Add the city, state, or community where this request will operate.' };
  }

  return { ok: true, value: { email, phone: normalizedPhone, location } };
}

export const FUNDRAISER_PUBLIC_SELECT = 'id,title,description,category,target_amount,raised_amount,image_url,image_path,status,created_at';
export const FUNDRAISER_ADMIN_SELECT = `${FUNDRAISER_PUBLIC_SELECT},contact_email,contact_phone,contact_location`;
