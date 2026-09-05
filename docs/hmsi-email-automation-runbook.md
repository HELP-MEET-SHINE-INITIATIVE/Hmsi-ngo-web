# HMSI email automation runbook

## Purpose and activation boundary

HMSI email automation uses a server-side outbox so operational events can be audited, deduplicated, retried, suppressed, and reviewed before delivery. The additive schema in `supabase/email_automation_patch.sql` creates the configuration, contacts, templates, outbox, delivery-event, checkout-session, and recurring-donor tables. It does not send messages when applied.

The default configuration is `mode = draft`, with transactional, marketing, abandoned-donation, and recurring-donor delivery disabled. Administrators must explicitly change the configuration to `live` after reviewing sender authentication, consent capture, unsubscribe handling, provider webhooks, rate limits, and the test results. `paused` is the fail-closed emergency state.

The recommended sender is `notifications@hmsi.org.ng`, using the verified `hmsi.org.ng` domain. The system must use the configured Resend API key only on the server. No API key, webhook secret, donor payment data, or raw provider response belongs in client code, logs, or email audit comments.

## Automated operations

The outbox template registry covers onboarding access, volunteer approvals, task assignments, task reminders, task completion acknowledgements, editorial decisions, verified donation receipts, abandoned-donation follow-ups, recurring-donor stewardship, approved newsletters, and internal operational alerts. Existing operational paths can enqueue these templates by using a stable idempotency key such as `task-assignment:<assignment-id>` or `donation-receipt:<donation-id>`.

Abandoned-donation follow-ups are limited to contacts with explicit marketing consent and an active, unsuppressed email contact record. The default schedule is one hour and 24 hours after a checkout session starts. A completed or cancelled checkout is never eligible. A recurring-donor stewardship message requires an active recurring-donor record and explicit stewardship consent.

Newsletter delivery is marketing communication. It must require explicit consent, a functioning unsubscribe token, an approved newsletter draft, and an administrator-approved campaign activation. Existing subscribers are not silently opted in by the migration; the subscription route records new or reconfirmed consent, and unsubscribe synchronizes suppression into the unified contact registry.

## Scheduled processor

`app/api/cron/email-outbox/route.ts` is protected by `Authorization: Bearer $CRON_SECRET`. `vercel.json` invokes it every 15 minutes. Each call first queues eligible abandoned-donation drafts and then processes a bounded due outbox batch. When the configuration remains in draft or paused mode, the processor returns a safe no-op. No in-process timers are used.

The processor claims rows from `queued` to `sending`, uses the existing Resend retry helper with an idempotency key, records only bounded provider status values, and transitions rows to `sent` or `failed`. A provider error is reduced to a stable error category rather than storing raw response bodies. Repeated delivery is prevented through the unique outbox idempotency key and provider idempotency key.

## Required verification before live mode

Before enabling live mode, apply the additive SQL patch in the approved Supabase change process, verify all RLS tables and service-role-only policies, and create a disposable contact with no marketing consent. Confirm that transactional previews can be rendered without delivery, marketing messages are suppressed without consent, unsubscribe synchronizes both subscriber tables, duplicate idempotency keys return the original outbox row, and paused mode performs no delivery.

Use a provider sandbox or an approved internal recipient for the first live-mode smoke test. Verify Resend webhook signatures and reconcile `sent`, `delivered`, `bounced`, `failed`, `suppressed`, and `complained` events into the outbox delivery-event table. Do not use real donor data for tests, and do not enable abandoned-donation or recurring-donor journeys until the consent and unsubscribe paths have been manually reviewed.

## Operational safeguards

Transactional messages are limited to necessary service communications. Marketing messages include a working unsubscribe link and are never sent to suppressed or unsubscribed contacts. The system does not send SMS, WhatsApp, or external social notifications. The outbox and delivery-event tables are service-role-only; administrative dashboards should expose counts and bounded statuses rather than full message bodies or recipient lists.

If the provider is unavailable, leave the row failed for controlled retry or operator review. Do not bypass suppression or switch directly to a second provider without a separate approval. If a template, contact lookup, configuration read, or consent check fails, fail closed and do not send.


The outbox processor sends through the registered `HMSI Notifications <notifications@hmsi.org.ng>` sender when live mode is explicitly enabled. Existing portal, onboarding, administration, and President’s Office senders remain available for their existing narrowly scoped workflows; they are not automatically repurposed by the outbox.

The first implementation milestone establishes the schema, queue helper, consent checks, suppression synchronization, scheduled processor, and safe defaults. Existing direct newsletter and donation acknowledgement paths should be migrated to `queueHmsiEmail` in a separate reviewed change so their current receipts, attachments, and provider webhook reconciliation remain intact during the transition.
