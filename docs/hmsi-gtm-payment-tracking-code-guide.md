# HMSI Conversion Tracking & GTM Implementation Code Guide

**Organization:** The Incorporated Trustees of HELP-MEET SHINE INITIATIVE (CAC/IT/NO 125103)  
**Deployment Commit:** `5c6e6de` (`feat: add GTM container and Paystack conversion tracking events`)  
**Target Customer ID:** `811-374-9631`  
**Primary Payment Processor:** Paystack (Inline Popup Modal, Debit Card, Bank Transfer, USSD)  
**Date Prepared:** 21 August 2026  

---

## 1. Implemented Components & Utilities

### A. TypeScript DataLayer Utility (`lib/gtm.ts`)

Provides safe, strongly typed dispatchers for all major business conversion events on `window.dataLayer`:

```typescript
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX';
export const GOOGLE_ADS_CONVERSION_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-8113749631';

export function pushToDataLayer(data: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
}

// 1. Donation Checkout Initiation
export function trackBeginCheckout(params: { amount: number; fundraiserId?: string; fundraiserTitle?: string }): void;

// 2. Verified Donation Completion (Paystack onSuccess)
export function trackDonationCompleted(params: {
  transactionId: string;
  amount: number;
  fundraiserId?: string;
  fundraiserTitle?: string;
  donorEmail?: string;
  isAnonymous?: boolean;
}): void;

// 3. Volunteer & Worker Applications
export function trackVolunteerApplication(params: { role: 'volunteer' | 'worker'; interest: string }): void;

// 4. Community Aid / Get Help Requests
export function trackHelpRequest(params: { category: string; targetAmount: number }): void;
```

---

### B. Google Tag Manager Container (`components/GoogleTagManager.tsx`)

Mounts the GTM script using Next.js 16 `<Script strategy="afterInteractive">` and includes the `<noscript>` fallback:

```tsx
'use client';

import Script from 'next/script';
import { GTM_ID } from '../lib/gtm';

export default function GoogleTagManager() {
  if (!GTM_ID || GTM_ID === 'GTM-XXXXXXX') {
    return null;
  }

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
```

---

### C. Paystack Inline Modal Success Callback Integration (`app/donate/DonateForm.tsx`)

Fires `begin_checkout` before opening the modal and `donation_completed` with dynamic NGN transaction values inside `handleSuccess()`:

```typescript
// 1. When donor clicks "Continue to Paystack"
trackBeginCheckout({
  amount: amountInNaira,
});

// 2. When Paystack returns verified transaction reference
const handleSuccess = async (response?: PaymentResponse) => {
  const reference = response?.reference ?? "";
  // ... database ledger update ...

  // Dispatch GTM conversion event
  trackDonationCompleted({
    transactionId: reference,
    amount: amountInNaira,
    donorEmail: donorEmail,
    isAnonymous: isAnonymous,
  });

  setIsSubmitted(true);
};
```

---

### D. Lead Form Submission Tracking

1. **Volunteer & Worker Applications (`app/volunteer/VolunteerForm.tsx`):**
   ```typescript
   trackVolunteerApplication({
     role: applicationRole,
     interest: formData.interest,
   });
   ```

2. **Community Aid Intake (`app/fundraise/create/CreateFundraiserContent.tsx`):**
   ```typescript
   trackHelpRequest({
     category: formData.category,
     targetAmount: targetAmount,
   });
   ```

---

## 2. Environment Variable Configuration

To activate GTM tracking in production, configure the following environment variable in **Vercel Project Settings > Environment Variables**:

| Variable | Recommended Production Value | Description |
|---|---|---|
| `NEXT_PUBLIC_GTM_ID` | `GTM-XXXXXXX` *(Your GTM Container ID)* | Activates the GTM script across all pages |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-8113749631` | Google Ads Conversion Tag ID |

When `NEXT_PUBLIC_GTM_ID` is unset or left as default, the container component gracefully renders `null` without throwing errors or breaking page hydration.
