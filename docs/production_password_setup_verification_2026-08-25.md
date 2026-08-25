# Production one-time password setup verification — 25 August 2026

**Deployment checked:** `https://hmsi-ngo-l0sxfjp4f-hmsi-ngo-web.vercel.app` (commit `c173c0f`).

## Non-destructive public checks

An unauthenticated visit to `/setup-password` without the required token and HMSI ID displayed the generic message, **“This setup link is invalid, expired, or has already been used.”** The setup fields remained disabled and no account data was exposed.

The deployed `/login` page showed one credential identifier field accepting **Email address or HMSI ID**, a password field, and a **Forgot password?** link. No credentials were entered and no portal session was created during this check.

## Delivery verification boundary

The Resend account’s five most recent transactional messages included official HMSI onboarding and access emails with a `delivered` status. This validates the configured sending channel, not a newly triggered setup-password email: no onboarding completion was artificially replayed and no test message was sent to a real recipient.
