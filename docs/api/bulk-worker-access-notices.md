# Bulk Worker Access-Notice API Reference

**Endpoint:** `POST /api/admin/workers/access-notices`  
**Runtime:** Node.js  
**Audience:** Authorized HMSI administrators and trusted same-origin administrative integrations  
**Source of truth:** `app/api/admin/workers/access-notices/route.ts` and `lib/bulkWorkerAccessNotices.mjs`

## Purpose

This endpoint sends an HMSI portal access notice to every **eligible worker** in a single confirmed administrative operation. Each notice contains a non-empty HMSI ID number. If a worker has no active, activated card, the service revokes any active stale card, issues a replacement card, and includes a temporary activation code in the notice.

> This is an administrative notification action, not a public registration endpoint. It must only be initiated from an authenticated HMSI admin session or a trusted server-side administrative workflow that preserves the HMSI admin session context.

## Endpoint Contract

| Property | Value |
|---|---|
| Method | `POST` |
| Path | `/api/admin/workers/access-notices` |
| Authentication | HMSI admin session cookie; no bearer-token or public API-key authentication is implemented for this route. |
| Content type | `application/json` |
| Cache behavior | `Cache-Control: no-store` on every response. |
| Side effects | May issue/revoke worker ID cards and sends email notifications through the configured transactional email service. |
| Batch size | Up to 500 eligible workers per request. |

## Authentication and Authorization

The handler obtains the administrative identity from the request cookie using the existing HMSI admin-session mechanism. If no authenticated admin identity is available, it stops before querying worker records or sending mail.

| Condition | HTTP status | Response |
|---|---:|---|
| Missing or invalid admin session | `401` | `{"error":"Admin authentication required."}` |
| Supabase service client unavailable | `503` | `{"error":"Supabase is not configured on the server."}` |

Do not call this endpoint with a worker, volunteer, or member portal session. Those identities are not administrative identities and must not be able to dispatch bulk notices.

## Request Schema

### JSON body

```json
{
  "confirm": true
}
```

| Field | Type | Required | Rule |
|---|---|---:|---|
| `confirm` | boolean | Yes | Must be exactly `true`. Any other value, an omitted field, invalid JSON, or an empty body is rejected. |

### Confirmation safeguard

The explicit confirmation field prevents a user-interface mistake, a prefetch, or an incomplete integration from triggering a bulk email operation. The service does not infer intent from an authenticated session alone.

| Condition | HTTP status | Response |
|---|---:|---|
| `confirm` is not exactly `true` | `400` | `{"error":"Explicit confirmation is required before sending access notices."}` |

## Eligible Worker Selection

The service queries the worker directory with all of the following criteria.

| Directory field | Required value | Reason |
|---|---|---|
| `status` | `active` | Inactive workers must not receive active portal notices. |
| `onboarding_status` | `completed` | A worker must have completed HMSI onboarding before receiving portal access communication. |
| `email` | Not `null` | A destination address must exist before the record can be considered for the batch. |

An email address that is present but blank after trimming is counted as `skipped`. The response contains counts only; it intentionally does not return names, addresses, ID numbers, activation codes, or per-worker delivery details.

If the verified-worker query fails, the request fails closed:

```json
{
  "error": "Verified worker records could not be loaded."
}
```

The status is `500`.

## ID-Card and Notice Workflow

For every eligible worker with a non-blank normalized email address, the endpoint performs the following sequence.

| Step | Behavior |
|---:|---|
| 1 | Looks up the most recently issued active worker ID card. |
| 2 | Uses the card unchanged only when it has a non-empty ID number and a non-null activation timestamp. |
| 3 | When the card is absent, lacks an ID number, or has not been activated, revokes any active card for that worker. |
| 4 | Creates a new worker card, hashes a fresh temporary activation code, and sets a seven-day code expiry. |
| 5 | Builds the access notice with the worker’s HMSI ID number. For a replacement card, the notice also carries the temporary activation code. |
| 6 | Sends the transactional email with subject `Your HMSI portal access ID`. |

The activation code is only included in the delivered notice. It is **never** returned in this API response, logged by this handler, or displayed by the administrative integration.

## Successful Response

The endpoint returns `200 OK` after processing the batch, including when some recipients were skipped or failed. Inspect the `summary` object rather than treating `200` as proof that every email was delivered.

```json
{
  "ok": true,
  "summary": {
    "eligible": 12,
    "sent": 9,
    "failed": 1,
    "skipped": 2,
    "reissued": 4
  }
}
```

| Field | Type | Meaning |
|---|---|---|
| `ok` | boolean | `true` when the handler completed the batch-processing loop and produced a summary. |
| `eligible` | integer | Number of records returned by the active/completed/non-null-email query, before blank-email checks. |
| `sent` | integer | Notices accepted by the configured email helper as sent. |
| `failed` | integer | Records affected by a card lookup, revoke, card issue, or email exception. Processing continues for other workers. |
| `skipped` | integer | Records with blank normalized email or an email helper response that was not sent, such as an unconfigured provider. |
| `reissued` | integer | Replacement worker cards created during this request. |

## Error and Partial-Completion Semantics

| Scenario | Status | Batch behavior |
|---|---:|---|
| Admin authentication missing | `401` | No worker query, card action, or email delivery is attempted. |
| Confirmation missing or false | `400` | No worker query, card action, or email delivery is attempted. |
| Supabase service client unavailable | `503` | No worker query, card action, or email delivery is attempted. |
| Verified-worker query error | `500` | No recipient loop is started. |
| Per-worker card lookup/revoke/issue failure | `200` | Increment `failed`; continue with the next worker. |
| Email helper returns `sent: false` | `200` | Increment `skipped`; continue with the next worker. |
| Email helper throws | `200` | Log the non-sensitive failure message, increment `failed`, and continue with the next worker. |

## Administrative UI Integration Pattern

The recommended integration is a same-origin action in the HMSI admin interface. The browser should present a clear confirmation dialog and invoke the route only after the administrator confirms.

```ts
async function sendVerifiedWorkerAccessNotices() {
  const response = await fetch('/api/admin/workers/access-notices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ confirm: true }),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Bulk access notice request failed.');
  return payload.summary;
}
```

Display only the aggregate summary to the administrator. Do not render the temporary activation codes, raw email addresses, or ID numbers in a toast, browser console, URL, analytics event, or client-side log.

### Suggested confirmation language

> Send HMSI portal access notices to all active workers who have completed onboarding? Notices can issue replacement ID cards and temporary activation codes where required. This action sends email immediately.

## Trusted Server-to-Server Use

There is no standalone API token contract for this route. A server-to-server caller must not attempt to construct or forge the admin session cookie. If scheduled or service-account delivery is required in the future, add a separate protected server endpoint with a dedicated credential, least-privilege authorization, idempotency design, audit records, and rate controls; do not weaken this browser-session endpoint.

For a manual authenticated diagnostic, use an administrator-controlled environment only. Do not paste production cookies into source code, support tickets, chat messages, repositories, terminal history, or front-end configuration.

```bash
curl --request POST 'https://www.hmsi.org.ng/api/admin/workers/access-notices' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: <administrator-session-cookie-from-a-secure-session>' \
  --data '{"confirm":true}'
```

## Operational Guidance

Before dispatch, confirm that the transactional email provider is configured and that the worker directory is current. After dispatch, record the aggregate response summary and verify delivery status in the email provider’s administrative logs. Use the `failed`, `skipped`, and `reissued` counters to drive follow-up; do not retry the entire batch blindly, because doing so can create additional replacement cards for workers who have not activated their previous card.

The current route has no request-level idempotency key. A future administrative UI should disable its action button while the request is in flight and preserve the returned summary for the administrator. If automatic retries or scheduled delivery are introduced, implement a separate durable dispatch ledger before enabling them.

## Behavioral Test Coverage

The runtime workflow has executable integration coverage with mocked infrastructure dependencies. The tests verify authorization, confirmation, unavailable Supabase, eligible-worker filters, existing-card delivery, replacement-card issuance, blank-email skips, provider non-send results, card lookup/revoke/issue failures, email exceptions, and verified-worker query failures.

Run the suite with:

```bash
npm test
```

To view Node’s executed runtime coverage:

```bash
node --test --experimental-test-coverage tests/*.test.mjs
```

## Related Source Files

| File | Responsibility |
|---|---|
| `app/api/admin/workers/access-notices/route.ts` | Next.js API-route adapter and production dependency wiring. |
| `lib/bulkWorkerAccessNotices.mjs` | Testable bulk workflow, eligibility query, card lifecycle, response summary, and error handling. |
| `lib/portalEmail.ts` | Access-notice content and transactional email transport helper. |
| `tests/bulk-access-notices.test.mjs` | Executable behavioral integration tests for the workflow. |
