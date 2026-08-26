# Cross-Role Applicant Intake Production Smoke Check

Date: 2026-08-26

The public `/signup` route was passively checked after deployment. It renders an approval-first volunteer application with full name, email, phone, and required location fields. It states that applicants should apply once and wait for HMSI review before portal access is created. No form was submitted.

The public `/worker-apply` route was passively checked after deployment. It renders the worker approval-first wording and includes required location alongside the existing identity, interest, message, and privacy-acknowledgement fields. No form was submitted.

These passive checks verify only rendering and public messaging. They do not create an application, test a duplicate email against production, send a notification, or establish an account.
