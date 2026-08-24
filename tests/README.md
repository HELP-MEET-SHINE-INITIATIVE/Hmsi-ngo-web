# HMSI authenticated approval and assignment tests

This directory contains a Postman collection for the HMSI admin approval and assignment mutation flow. The collection is API-first so it can validate the server authorization and persistence contracts without depending on fragile visual selectors.

## Safety boundary

The collection is **fail-closed** for mutations. Read-only authorization and baseline requests can run against the live site. Approval, assignment creation, negative mutation cases, and cleanup requests require `runMutations=true`. If `baseUrl` contains `hmsi.org.ng`, they also require `allowProductionMutations=true`. Set that flag only after explicit approval, and use a synthetic test application and synthetic test assignment.

Never commit credentials, cookies, access tokens, or real personal data. Put `adminEmail` and `adminPassword` in a local Postman environment, mark the password as secret, and do not place them in the collection file. Use a synthetic `testApplicationId`. For the positive assignment test, provide an existing synthetic active worker whose `onboarding_status` is `completed` as `completedWorkerId`.

## Import and configure

Import `hmsi-admin-approval-assignment.postman_collection.json` into Postman. Create a local environment with the following variables:

| Variable | Purpose | Required for |
|---|---|---|
| `baseUrl` | Staging or production origin | All requests |
| `adminEmail` | Admin login email | Authenticated run |
| `adminPassword` | Admin login password | Authenticated run |
| `runMutations` | Must be `true` to allow mutation requests | Mutation run |
| `allowProductionMutations` | Additional production safety gate | Production mutation run |
| `testApplicationId` | Synthetic pending worker application ID | Approval mutation |
| `testWorkerEmail` | Synthetic worker email, used to locate the directory row | Approval verification |
| `testWorkerId` | Approved worker ID, used for the negative assignment case | Negative assignment test |
| `completedWorkerId` | Synthetic active worker with completed onboarding | Positive assignment test |

The collection uses Postman’s cookie jar. Run the folders in order: unauthenticated rejection tests, authenticated read baseline, approval mutation, assignment mutation and validation, then session cleanup.

## Newman example

With Newman installed locally, use a shell environment rather than putting secrets in a command history:

```bash
newman run tests/hmsi-admin-approval-assignment.postman_collection.json \
  --environment path/to/hmsi-admin-local.postman_environment.json \
  --reporters cli,junit \
  --reporter-junit-export test-results/hmsi-admin-mutations.xml
```

For production, set `allowProductionMutations=true` only in a temporary local environment after the operator has approved the specific synthetic record IDs. Reset it to `false` immediately afterward.

## Expected assertions

The collection verifies that unauthenticated admin endpoints reject access; admin login succeeds without returning a password; overview and worker rows expose `onboarding_status`; an approval response is actually approved; the worker appears in the refreshed admin directory; assignment creation returns HTTP 201 for a completed-onboarding worker; malformed input returns HTTP 400; an approved worker that has not completed onboarding is rejected with HTTP 400 or 409; and the temporary assignment is moved to `completed` before the session is deleted.

The current API does not expose a DELETE assignment endpoint, so cleanup marks the synthetic assignment `completed`. If a future administrative deletion or archive endpoint is added, replace that cleanup request with the approved reversible cleanup operation.

## Important implementation note

Approval of a worker application currently creates or upserts a worker with `onboarding_status: not_started`. Therefore, the positive assignment test must use a separate synthetic worker already in the `completed` onboarding state. The newly approved worker is still checked for directory synchronization and is expected to fail the assignment eligibility guard until onboarding is completed.
