export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX';
export const GOOGLE_ADS_CONVERSION_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-732806243';
export const GOOGLE_ADS_BEGIN_CHECKOUT_SEND_TO = process.env.NEXT_PUBLIC_GOOGLE_ADS_BEGIN_CHECKOUT_SEND_TO || 'AW-732806243/IpQkCJvO3OUcEOP4tt0C';

type DataLayerEvent = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Push an event to the Google Tag Manager dataLayer safely.
 */
export function pushToDataLayer(data: DataLayerEvent): void {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
}

/**
 * Track donation checkout initiation before Paystack modal opens.
 */
export function trackBeginCheckout(params: {
  amount: number;
  fundraiserId?: string;
  fundraiserTitle?: string;
}): void {
  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'NGN',
      value: params.amount,
      items: [
        {
          item_id: params.fundraiserId || 'general_fund',
          item_name: params.fundraiserTitle || 'HMSI Humanitarian Support',
          price: params.amount,
          quantity: 1,
        },
      ],
    },
  });
}

/**
 * Track the supplied Google Ads Begin checkout conversion label.
 * The call is intentionally separate from the generic GTM event so the
 * configured Google Ads conversion action receives the exact send_to value.
 */
export function trackGoogleAdsBeginCheckoutConversion(params: { amount: number }): void {
  if (typeof window === 'undefined') return;

  const conversionPayload = {
    send_to: GOOGLE_ADS_BEGIN_CHECKOUT_SEND_TO,
    value: params.amount,
    currency: 'NGN',
  };

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', conversionPayload);
    return;
  }

  pushToDataLayer({
    event: 'conversion',
    ...conversionPayload,
  });
}

/**
 * Track completed donation on verified Paystack success callback.
 */
export function trackDonationCompleted(params: {
  transactionId: string;
  amount: number;
  fundraiserId?: string;
  fundraiserTitle?: string;
  donorEmail?: string;
  isAnonymous?: boolean;
}): void {
  pushToDataLayer({
    event: 'donation_completed',
    ecommerce: {
      transaction_id: params.transactionId,
      value: params.amount,
      currency: 'NGN',
      payment_method: 'paystack_modal',
      items: [
        {
          item_id: params.fundraiserId || 'general_fund',
          item_name: params.fundraiserTitle || 'HMSI Approved Cause',
          price: params.amount,
          quantity: 1,
        },
      ],
    },
    user_data: {
      email: params.donorEmail || undefined,
      anonymous: params.isAnonymous ?? false,
    },
  });
}

/**
 * Track volunteer and worker application submissions.
 */
export function trackVolunteerApplication(params: {
  role: 'volunteer' | 'worker';
  interest: string;
}): void {
  pushToDataLayer({
    event: 'volunteer_application_submitted',
    application_role: params.role,
    application_interest: params.interest,
  });
}

/**
 * Track community aid / Get Help request submissions.
 */
export function trackHelpRequest(params: {
  category: string;
  targetAmount: number;
}): void {
  pushToDataLayer({
    event: 'help_request_submitted',
    support_category: params.category,
    target_amount: params.targetAmount,
  });
}
