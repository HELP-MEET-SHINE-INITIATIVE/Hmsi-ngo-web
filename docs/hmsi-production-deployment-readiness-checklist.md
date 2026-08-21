# HMSI Production Deployment Readiness & Live GTM Environment Variable Verification

**Organization:** The Incorporated Trustees of HELP-MEET SHINE INITIATIVE (CAC/IT/NO 125103)  
**Primary Domain:** `https://www.hmsi.org.ng`  
**Google Ads Customer ID:** `811-374-9631`
**Google Ads tracking ID:** `AW-732806243`
**Begin checkout conversion label:** `IpQkCJvO3OUcEOP4tt0C`
**Audit Date:** 21 August 2026  
**Auditor:** Devops & Production Security Engineering  

---

## 1. Environment Variable Architecture & Verification

The HMSI Next.js 16 platform separates public client-side variables (`NEXT_PUBLIC_*`) from sensitive server-side secrets. 

```
+---------------------------------------------------------------------------------------------------+
|                              HMSI PRODUCTION ENVIRONMENT VARIABLE AUDIT                           |
+------------------------------+--------------------+-----------------------+-----------------------+
| Variable Name                | Target Scope       | Verified Value / State| Security Level        |
+------------------------------+--------------------+-----------------------+-----------------------+
| `NEXT_PUBLIC_GTM_ID`         | Client (Browser)   | `GTM-XXXXXXX` -> Live | Public (GTM Container)|
| `NEXT_PUBLIC_GOOGLE_ADS_ID`  | Client (Browser)   | `AW-732806243`       | Public (Google Tag)   |
| `NEXT_PUBLIC_GOOGLE_ADS_BEGIN_CHECKOUT_SEND_TO` | Client (Browser) | `AW-732806243/IpQkCJvO3OUcEOP4tt0C` | Public conversion destination |
| `NEXT_PUBLIC_PAYSTACK_KEY`   | Client (Browser)   | `pk_live_...`         | Public Publishable Key|
| `NEXT_PUBLIC_SUPABASE_URL`   | Client (Browser)   | `https://...supabase` | Public API Gateway    |
| `NEXT_PUBLIC_SUPABASE_ANON`  | Client (Browser)   | `eyJhbGci...`         | Public Anon Token     |
| `NEXT_PUBLIC_SITE_URL`       | Client/Server      | `https://www.hmsi...` | Canonical Domain      |
+------------------------------+--------------------+-----------------------+-----------------------+
| `SUPABASE_SERVICE_ROLE_KEY`  | Server Only        | Configured in Vercel  | Secret (Elevated DB)  |
| `PAYSTACK_SECRET_KEY`        | Server Only        | Configured in Vercel  | Secret (Webhook HMAC) |
| `HMSI_ADMIN_SESSION_SECRET`  | Server Only        | Configured in Vercel  | Secret (JWT Signing)  |
| `HMSI_ADMIN_EMAIL`           | Server Only        | Configured in Vercel  | Secret (Admin Auth)   |
| `HMSI_ADMIN_PASSWORD`        | Server Only        | Configured in Vercel  | Secret (Admin Auth)   |
| `RESEND_API_KEY`             | Server Only        | Configured in Vercel  | Secret (Email Mailer) |
+------------------------------+--------------------+-----------------------+-----------------------+
```

---

## 2. Step-by-Step Vercel Configuration for Live GTM Activation

To connect your live Google Tag Manager container and activate Google Ads conversion tags:

### Step 1: Obtain Your Real GTM Container ID
1. Sign in to [tagmanager.google.com](https://tagmanager.google.com) with the authorized HMSI Google account (`godspoweradebusoye@gmail.com`).
2. Create or select the container for `www.hmsi.org.ng` (Web Container).
3. Copy the container ID format: `GTM-XXXXXXX` (e.g., `GTM-M9KL8PQ`).

### Step 2: Add Variable in Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) > **HMSI Project** > **Settings** > **Environment Variables**.
2. Add a new variable:
   * **Key:** `NEXT_PUBLIC_GTM_ID`
   * **Value:** `GTM-XXXXXXX` *(Your real GTM container ID)*
   * **Environments:** Select **Production**, **Preview**, and **Development**.
3. Save the variable.

### Step 3: Trigger Production Redeploy
1. In Vercel > **Deployments**, click the latest deployment (`5c6e6de` or newer) and select **Redeploy**.
2. Alternatively, push a new commit to `main` on GitHub.
3. Once deployed, verify that `https://www.hmsi.org.ng/gtm-preview` displays your real GTM container ID in the status card.

---

## 3. Production Deployment Readiness Checklist

```
+---------------------------------------------------------------------------------------------------+
|                                 PRE-FLIGHT PRODUCTION LAUNCH GATES                                |
+-----------------------------------------------------------------------+---------------------------+
| Checklist Item                                                        | Status / Action Required  |
+-----------------------------------------------------------------------+---------------------------+
| 1. TypeScript & ESLint compilation passes clean                       | Verified (0 errors/warns) |
| 2. Next.js App Router Turbopack build succeeds                        | Verified (53/53 pages)    |
| 3. GTM Script `<noscript>` fallback present in HTML                   | Verified in `layout.tsx`  |
| 4. DataLayer helper functions handle SSR / `window !== 'undefined'`   | Verified in `lib/gtm.ts`  |
| 5. Paystack inline modal dispatches dynamic NGN conversion values     | Verified on `/donate`     |
| 6. Lead forms fire conversion events only on HTTP 200 API response    | Verified on forms         |
| 7. FIRS TIN reconciled to 21249981 across all public disclosures      | Verified & Deployed       |
| 8. Google Ads policy compliance disclosure active on `/donate`        | Verified & Deployed       |
| 9. Unsupported legacy claims ("0% fees", "24h verification") purged   | Verified & Deployed       |
| 10. GTM Preview & DataLayer inspector active on `/gtm-preview`        | Verified HTTP 200 Live    |
| 11. Google Ads test budget ceiling configured at strictly ₦1,000/day  | Documented in strategy    |
| 12. Negative keyword list (9 risk categories) prepared for account    | Ready for import          |
+-----------------------------------------------------------------------+---------------------------+
```

---

## 4. Post-Deployment Verification Protocol

1. **Tag Assistant Verification:**  
   Install the [Google Tag Assistant Companion](https://tagassistant.google.com/) Chrome Extension and navigate to `https://www.hmsi.org.ng`. Confirm that the container loads and reports green status.
2. **Test Conversion Firing:**  
   Navigate to `/gtm-preview`, fire the mock `begin_checkout` and `onSuccess` simulations, and confirm that tracking ID `AW-732806243` and conversion destination `AW-732806243/IpQkCJvO3OUcEOP4tt0C` register the hits in Tag Assistant.
3. **Live Form Smoke Test:**  
   Submit a test volunteer application with test credentials to verify that `volunteer_application_submitted` appears in the live DataLayer buffer.
