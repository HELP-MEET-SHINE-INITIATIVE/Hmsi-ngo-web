# HMSI Onboarding, Worker Operations, Social Rooms, and Sponsored Placements

**Status:** Implementation ready; production deployment requires the standard Vercel deployment and environment-variable review.

## Operating model

HMSI applications remain pending until an administrator reviews them. When an administrator approves an applicant, the platform provisions onboarding tasks and generates a single-use, time-limited invitation link. If Resend is configured, the link is sent automatically to the approved applicant's email address. Completion of all tasks marks an approved worker as onboarded and enables the server-authorized worker workspace.

Administrators retain control over assignments. A worker cannot receive a new assignment through the admin API until the worker is active and their onboarding status is `completed`. Workers can update the status of assignments assigned to their own worker record after onboarding.

## Onboarding tasks

The initial task set covers safeguarding and privacy commitments, respectful conduct, assignment and escalation workflow, media-safety protocol for workers, and volunteer-room guidance. Tasks are stored in Supabase and are tracked per invitation in `onboarding_progress`. Invitation tokens are stored only as SHA-256 hashes.

## Rooms and dashboards

Volunteer and worker rooms now include graphical activity indicators for posts, contributors, interactions, and an activity signal. Approved active sponsorship placements are labelled clearly as sponsored community information. The worker dashboard includes approved assignment counts, open/completed work, status controls, and a link to submit a sponsorship request for review.

## Sponsored placement workflow

The public sponsorship page accepts a request containing the requester, message, destination URL, optional creative URL, and NGN budget. Every request begins in `pending` status. An administrator reviews or rejects the request. Only an approved request can initialize a Paystack payment. After Paystack verification, the request becomes `paid`; an administrator must still activate it and set its display window before it appears in the rooms.

Payment verification checks the Paystack reference, successful status, NGN currency, and exact approved amount. Payment does not guarantee publication, and sponsored content must not mislead, impersonate HMSI, expose private beneficiary information, or imply endorsement before activation.

## Required migration and configuration

Apply `supabase/onboarding_ads_patch.sql` in the HMSI Supabase SQL Editor. The migration creates onboarding task, invitation, progress, and sponsorship request tables, adds worker onboarding and permission fields, and enables service-role row-level security policies.

The following server-side configuration is required for the complete workflow:

- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for onboarding invitations;
- `PAYSTACK_SECRET_KEY` for advertiser payment initialization and verification;
- `NEXT_PUBLIC_SITE_URL` for invitation and Paystack callback URLs; and
- `WORKER_SESSION_SECRET` recommended for signed worker sessions, with the existing server secret fallback retained for compatibility.

This document is an operational aid and does not replace HMSI safeguarding, privacy, payment-provider, legal, or data-protection procedures.
