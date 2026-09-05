# HMSI Ecosystem Assessment — Evidence Notes

Date: 2026-08-26

## Production metadata inventory

The production `public` schema contains a broad operational model, including approved contacts and application intake, worker/volunteer/member directories, onboarding invitations and progress, role-specific assignments and events, secure proof references, content editorial workflow, donations and acknowledgements, fundraisers, opportunities, communications, training/school records, community rooms, regional offices, credentials, and audit/event records.

All inventoried public tables reported row-level security enabled. Tables holding server-mediated contact, audit, assignment-event, credential, or anti-duplication data intentionally have no direct browser policy; their no-policy linter entries should remain documented and must not be treated as a browser access grant.

## Security-advisor priorities

The advisor reports three substantive remediation areas to plan separately from routine feature work:

1. Multiple public functions have a mutable search path and should be redefined with an explicit safe search path.
2. The `public.rls_auto_enable()` `SECURITY DEFINER` function is executable by anonymous and authenticated roles; its intended use and `EXECUTE` grants should be reviewed and restricted if it is not a deliberate public capability.
3. Leaked-password protection is disabled in the managed authentication configuration and should be enabled after confirming organization-wide password policy and recovery communications.

No production rows, credentials, email addresses, payment details, or proof links were read for this assessment.
