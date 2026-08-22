# HMSI Donor Receipts, Volunteer Certificates & Public Impact Transparency

**Implementation edition:** August 2026  
**Scope:** Verified donor acknowledgements, volunteer service certificates, and public transparency tools for Help Meet Shine Initiative (HMSI)

## Donor receipt workflow

After the donation API verifies a successful NGN payment against Paystack, HMSI records the donation in the service-role ledger and generates a PDF donation acknowledgement. When the Resend integration is configured, the PDF is emailed to the donor’s supplied payment email using an idempotency key based on the Paystack reference. Receipt delivery failure does not erase the verified ledger record; the response reports the delivery state so support can follow up.

The receipt explicitly states that it is a payment acknowledgement, not a tax-exemption certificate or a statement that the donation is tax-deductible. Anonymous gifts are labelled “Anonymous donor” in the receipt, while the supplied email remains restricted to the donor workflow. The donor success screen includes a secure download action that requires the Paystack reference and matching donor email.

Relevant routes and files:

- `POST /api/donations` — verifies, records, and attempts to email the receipt.
- `POST /api/donations/receipt` — regenerates a receipt only after matching a successful reference and donor email.
- `lib/donorReceipt.ts` — produces the PDF document.
- `app/donate/DonateForm.tsx` — exposes the post-payment download action.

## Volunteer certificate workflow

Certificates are issued only by an authenticated HMSI administrator for an approved volunteer application. The administrator supplies the service title, optional service dates, optional recorded hours, and issue date. The server creates a unique certificate number and a high-entropy private verification code; only a SHA-256 hash of the code is stored in Supabase.

When Resend is configured, the certificate PDF and private code are emailed to the volunteer’s application email. The administrator response includes the private code once so it can be handled through the approved internal process. Public verification requires both the certificate number and private code.

Relevant routes and files:

- `POST /api/admin/volunteers/[id]/certificate` — authenticated certificate issuance.
- `GET /api/certificates/verify` — public verification with limited fields.
- `/certificates/verify` — public verification form.
- `lib/volunteerCertificate.ts` — certificate number, code hashing, and PDF generation.
- `supabase/volunteer_certificates_patch.sql` — certificate table and service-role policy.

The public result excludes volunteer email, phone number, and application details. A valid result confirms a matching active HMSI certificate record; it is not an independent evaluation of service quality, duration, or programme outcomes.

## Public impact transparency

The `/impact` page now includes a live-record section based on successful donation records and active or approved operational records held in HMSI’s systems. It shows:

- successful donation count;
- recorded successful donation amount in NGN;
- active fundraiser count;
- active worker count; and
- approved volunteer application count.

These are operational ledger counts, not independent impact evaluation results. The page retains the existing approved fundraiser listings and links to `/transparency` for governance information and `/certificates/verify` for certificate checks.

Relevant file:

- `lib/publicImpact.ts` — server-side aggregate queries.
- `app/impact/page.tsx` — public display with reporting caveats.

## Deployment prerequisites

Before production use, an administrator should apply `supabase/volunteer_certificates_patch.sql` in the production Supabase SQL Editor. Vercel must contain the existing server-side Supabase credentials and Resend variables (`RESEND_API_KEY` and, if desired, `RESEND_FROM_EMAIL`). No payment card data is handled or stored by these features.

The implementation has been checked with donor receipt and volunteer certificate PDF tests, `npm run lint`, and `npm run build`.
