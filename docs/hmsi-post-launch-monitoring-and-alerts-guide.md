# HMSI Post-Launch Monitoring, Alert Setup & Incident Response Guide

**Organization:** The Incorporated Trustees of HELP-MEET SHINE INITIATIVE (CAC/IT/NO 125103)  
**Target Account ID:** `811-374-9631` (AW-8113749631)  
**Primary Payment Processor:** Paystack (Inline Popup Modal, Debit Card, Bank Transfer, USSD)  
**Application Stack:** Next.js 16 (App Router) / Supabase Serverless DB / Vercel Edge  
**Date Prepared:** 21 August 2026  
**Audience:** Systems Operations, Engineering, and Finance Administrators  

---

## 1. Monitoring Architecture & Alert Taxonomy

To maintain 100% financial accountability and prevent lost donations or silent conversion tracking failures during Google Ads traffic surges, HMSI implements a three-tier monitoring topology:

```
+---------------------------------------------------------------------------------------------------+
|                              HMSI THREE-TIER MONITORING TOPOLOGY                                  |
+------------------------------------+-----------------------------+--------------------------------+
| Monitoring Tier                    | Monitored Systems           | Primary Failure Modes          |
+------------------------------------+-----------------------------+--------------------------------+
| 1. Financial Gateway & Webhook     | Paystack API, Supabase      | Webhook HTTP 500, HMAC Mismatch|
|    Health                          | `/api/donations` Ledger     | Abandoned Bank Transfers, Dups |
+------------------------------------+-----------------------------+--------------------------------+
| 2. GTM & Client-Side Tracking      | DataLayer, Consent Mode,    | Script Blockage, Undefined gtm,|
|    Health                          | Google Tag Assistant        | Missing E-Commerce Value       |
+------------------------------------+-----------------------------+--------------------------------+
| 3. Google Ads Attribution & Spend  | Google Ads Conversion API,  | Conversion Discrepancy > 15%,  |
|    Health                          | Daily Spend Ceiling         | Daily Spend Exceeds ₦1,000/day |
+------------------------------------+-----------------------------+--------------------------------+
```

---

## 2. Paystack Gateway & Webhook Alert Matrix

### Alert 1: Unreconciled Donation / Webhook Latency Alert
* **Trigger Condition:** A donor successfully completes a payment on Paystack, but the record is missing from the Supabase `donations` table after 15 minutes.
* **Severity:** **P1 — Critical**
* **Detection Mechanism:** Scheduled Supabase edge function querying Paystack Transactions API (`/transaction/verify/{ref}`) against internal ledger records.
* **Notification Channel:** Immediate Email to `support@hmsi.org.ng` + Admin Dashboard Alert Banner.
* **Recovery Action:** Run automated reconciliation script:
  ```bash
  # Query Paystack API for unrecorded successful references:
  curl "https://api.paystack.co/transaction?status=success&from=2026-08-21" \
    -H "Authorization: Bearer $PAYSTACK_SECRET_KEY"
  ```

### Alert 2: Webhook HMAC Signature Verification Failure
* **Trigger Condition:** Webhook endpoint `/api/webhooks/paystack` receives requests with an invalid `x-paystack-signature` header.
* **Severity:** **P2 — High (Potential Spoofing or Key Desynchronization)**
* **Detection Mechanism:** Logged automatically in Vercel Function Logs under `[PAYSTACK_SECURITY_ALERT]`.
* **Action:** Inspect Vercel environment variables to ensure `PAYSTACK_SECRET_KEY` matches the active secret key in the Paystack Dashboard.

### Alert 3: Bank Transfer & USSD Abandonment Spike
* **Trigger Condition:** More than 5 consecutive `begin_checkout` events recorded in GTM without a matching `donation_completed` event within a 2-hour window.
* **Severity:** **P3 — Warning (Potential Bank Network Downtime in Nigeria)**
* **Detection Mechanism:** GTM Tag firing ratio analysis.
* **Action:** Check Nigerian interbank settlement status (NIBSS) or Paystack System Status (`status.paystack.com`).

---

## 3. GTM Container & DataLayer Error Monitoring

### Alert 4: GTM Container Load Failure / AdBlocker Suppression
* **Trigger Condition:** Client browser fails to load `gtm.js` due to network timeout or strict content blocking.
* **Detection Code (in `app/layout.tsx` or `lib/gtm.ts`):**
  ```typescript
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (event.filename && event.filename.includes('googletagmanager.com')) {
        console.warn('[GTM_LOAD_ERROR] Failed to load Google Tag Manager script.');
      }
    });
  }
  ```
* **Fallback Behavior:** Ensured that Paystack donation execution and database ledger recording function 100% independently of GTM script availability.

### Alert 5: Missing or Corrupt E-Commerce Payload Alert
* **Trigger Condition:** `donation_completed` event pushed with `value: null`, `value: 0`, or missing `transaction_id`.
* **Detection Code:**
  ```typescript
  if (!params.amount || params.amount <= 0 || !params.transactionId) {
    console.error('[CONVERSION_PAYLOAD_INVALID]', params);
  }
  ```

---

## 4. Google Ads Conversion Discrepancy & Spend Alerts

```
+---------------------------------------------------------------------------------------------------+
|                                 GOOGLE ADS ANOMALY ALERT THRESHOLDS                               |
+--------------------------+--------------------+-----------------------+---------------------------+
| Metric Monitored         | Normal Baseline    | Alert Threshold       | Automated Response        |
+--------------------------+--------------------+-----------------------+---------------------------+
| **Daily Campaign Spend** | ₦0 – ₦1,000 / day  | Spend > ₦1,000 in 24h | Auto-Pause Campaign Rules |
| **Conversion Sync Rate** | >= 90% match       | Discrepancy > 15%     | Email Admin for Audit     |
| **Cost Per Click (CPC)** | ₦30 – ₦80          | Avg CPC > ₦150        | Lower Max CPC Bid Cap     |
| **Click-Through (CTR)**  | 3.5% – 8.0%        | CTR < 1.0% (Search)   | Audit Negative Keywords   |
+--------------------------+--------------------+-----------------------+---------------------------+
```

### Automated Budget Protection Rule (Google Ads Script)
Configure this automated script in **Google Ads > Tools > Scripts** to enforce the strict ₦1,000 daily spend limit:

```javascript
function main() {
  var MAX_DAILY_SPEND_NGN = 1000;
  var campaignIterator = AdsApp.campaigns()
    .withCondition("Status = ENABLED")
    .get();

  var totalSpendToday = 0;
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var stats = campaign.getStatsFor("TODAY");
    totalSpendToday += stats.getCost();
  }

  if (totalSpendToday >= MAX_DAILY_SPEND_NGN) {
    Logger.log("Daily spend limit reached (₦" + totalSpendToday + "). Pausing all campaigns.");
    var enabledCampaigns = AdsApp.campaigns().withCondition("Status = ENABLED").get();
    while (enabledCampaigns.hasNext()) {
      var c = enabledCampaigns.next();
      c.pause();
    }
    MailApp.sendEmail("support@hmsi.org.ng", "HMSI Google Ads: Daily Budget Ceiling Reached", 
      "Campaigns paused automatically after reaching ₦" + totalSpendToday + " spend today.");
  }
}
```

---

## 5. Incident Response & Escalation Protocol

```
+---------------------------------------------------------------------------------------------------+
|                                INCIDENT RESPONSE ESCALATION RUNBOOK                               |
+----------+--------------------+----------------------------------+--------------------------------+
| Severity | Typical Incident   | Immediate Containment            | Primary Contact / Owner        |
+----------+--------------------+----------------------------------+--------------------------------+
| **P1**   | Payment gateway    | Switch to direct bank transfer   | Technical Lead                 |
|          | failure on `/donate`| instructions; alert Paystack    | (`support@hmsi.org.ng`)        |
+----------+--------------------+----------------------------------+--------------------------------+
| **P2**   | Google Ads policy  | Verify destination copy; keep    | Communications & Compliance    |
|          | warning or appeal  | donation track paused            | (`contact@hmsi.org.ng`)        |
+----------+--------------------+----------------------------------+--------------------------------+
| **P3**   | GTM tracking sync  | Inspect `/gtm-preview` console;  | QA & Analytics Engineer        |
|          | discrepancy        | re-check GTM Trigger firing tags | (`support@hmsi.org.ng`)        |
+----------+--------------------+----------------------------------+--------------------------------+
```

---

## 6. Daily Operations & Weekly Maintenance Rhythm

1. **Daily 09:00 WAT Check:** Review the **Admin Promotion Links** on `/hmsi-control` and inspect the Paystack dashboard for successful settlements.
2. **Weekly Wednesday Audit:** Access `/gtm-preview` to fire simulated test conversions and verify that `window.dataLayer` syntax remains compliant.
3. **Monthly Financial Reconciliation:** Export the Supabase donations ledger and match total NGN revenue against the official bank statement of *The Incorporated Trustees of HELP-MEET SHINE INITIATIVE*.
