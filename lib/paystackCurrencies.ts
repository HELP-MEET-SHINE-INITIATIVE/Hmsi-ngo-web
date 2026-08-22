export const HMSI_PAYMENT_CURRENCIES = ['NGN', 'USD'] as const;
export type HmsiPaymentCurrency = (typeof HMSI_PAYMENT_CURRENCIES)[number];

export const HMSI_CURRENCY_DETAILS: Record<HmsiPaymentCurrency, { label: string; symbol: string; decimals: number }> = {
  NGN: { label: 'Nigerian naira', symbol: '₦', decimals: 2 },
  USD: { label: 'US dollar', symbol: '$', decimals: 2 },
};

export function isHmsiPaymentCurrency(value: unknown): value is HmsiPaymentCurrency {
  return typeof value === 'string' && HMSI_PAYMENT_CURRENCIES.includes(value as HmsiPaymentCurrency);
}

export function toMinorUnits(amount: number, currency: HmsiPaymentCurrency) {
  const decimals = HMSI_CURRENCY_DETAILS[currency].decimals;
  return Math.round(amount * (10 ** decimals));
}

export function formatHmsiAmount(amount: number, currency: HmsiPaymentCurrency) {
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}
