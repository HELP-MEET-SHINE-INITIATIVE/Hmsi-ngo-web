# HMSI Weekly CTA CTR Alert

## Configuration

The HMSI website checks the previous complete UTC week every Monday at 09:00 UTC. It calculates overall onboarding CTA click-through rate as:

`CTA CTR = total onboarding CTA clicks ÷ total onboarding CTA impressions × 100`

The alert threshold is fixed at **5%**. When the previous full week has at least one CTA impression and the overall CTR is below 5%, the system sends an email to **contact@hmsi.org.ng** using the existing verified HMSI sender configured in `RESEND_FROM_EMAIL`.

Weeks with no CTA impressions do not trigger an alert, because there is no meaningful rate to evaluate. Weeks at or above 5% do not trigger an email.

## Delivery and security

The scheduled endpoint is `/api/cron/cta-alert`. It accepts only a Vercel cron request carrying the Production-only `CRON_SECRET` as a Bearer authorization header. The secret is stored in Vercel and is not committed to the repository, exposed in the dashboard, or included in alert content.

A Supabase `cta_alert_log` table records the period key, aggregate counts, calculated CTR, and delivery status. This prevents the same weekly alert from being sent repeatedly if the scheduler retries the request. The table is protected by service-role-only row-level security.

The alert contains aggregate CTA metrics only. It does not contain visitor names, email addresses, IP addresses, raw URLs, persistent session identifiers, or beneficiary information.

## Admin review

After receiving an alert, sign in at `/hmsi-control`, open **Traffic analytics**, select **Last 7 days**, and review the per-CTA impressions, clicks, and CTR table. Prioritize CTAs with impressions but no clicks, and review the corresponding promotion links in the admin promotion section.

## Deployment configuration

The weekly schedule is stored in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cta-alert",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

The data migration is stored in `supabase/cta_alert_log_patch.sql` and has been applied to the HMSI production Supabase project.
