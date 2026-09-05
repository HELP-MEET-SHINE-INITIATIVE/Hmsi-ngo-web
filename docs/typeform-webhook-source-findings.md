# Typeform Source Findings for HMSI Retention Pipeline

Reviewed official Typeform developer documentation on 25 August 2026.

- Typeform can send each new form submission to an HTTPS endpoint as a POST webhook.
- The receiving endpoint should return a 2XX response after the payload is accepted.
- Typeform continues to store responses and provides a Responses API for retrieval/reconciliation.
- Typeform webhook deliveries time out after 30 seconds; failed deliveries are retried according to Typeform’s retry policy.
- New webhook URLs must use HTTPS.
- Typeform supports signed webhook payloads using the `Typeform-Signature` header. Verification uses HMAC-SHA256 over the exact raw request body, Base64 encoding, `sha256=` prefixing, and constant-time comparison.
- Typeform does not provide a stable designated IP allowlist for webhook requests, so signature verification and endpoint authentication must be the primary trust controls.

Official references:
- https://www.typeform.com/developers/webhooks/
- https://www.typeform.com/developers/webhooks/secure-your-webhooks/
- https://www.typeform.com/developers/responses/
