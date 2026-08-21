# Contributing to the HMSI Web Platform

Thank you for helping improve the Help Meet Shine Initiative (HMSI) web platform. Contributions should make it easier for people to request support, donate safely, volunteer, participate in field work, and understand the impact of HMSI programmes across Nigeria and Africa.

Before contributing, read [`README.md`](README.md), [`SECURITY.md`](SECURITY.md), and [`LICENSE`](LICENSE). The license is non-commercial unless HMSI provides written permission for another use.

## Development principles

HMSI is a public-facing humanitarian platform and an internal operations tool. Contributions should be accessible on mobile devices, clear for first-time visitors, safe for private data, and consistent with the HMSI visual language. Prefer a complete user flow over a visual placeholder: every new navigation item, button, form, approval action, and sharing control should have a working destination, loading state, error state, and success state where applicable.

Server authorization is mandatory for administrator, worker, volunteer, moderation, payment, and publishing actions. Do not rely on a hidden route, disabled button, client-provided role, or client-provided email as a security boundary.

## Local setup

Use Node.js 20.x and npm. Clone the repository and install from the lockfile:

```bash
git clone https://github.com/HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web.git
cd Hmsi-ngo-web
npm ci --legacy-peer-deps
cp .env.example .env.local
```

Configure local Supabase, Paystack, Resend, site URL, and administrator values in `.env.local`. Never commit `.env.local` or real secrets. Apply the required Supabase migrations in the order documented in [`README.md`](README.md) before testing database-backed flows.

Start the development server with:

```bash
npm run dev
```

## Verification before opening a pull request

Run the same checks used by GitHub Actions:

```bash
npm ci --legacy-peer-deps
npm run lint
npm audit --omit=dev --audit-level=high
npm run build
git diff --check
```

Lint warnings should be reviewed even when they do not fail the command. Do not suppress a warning globally unless the reason is documented and the exception is narrowly scoped. If a dependency update changes the build, route behavior, or security posture, include that information in the pull request.

## Branches and commits

Create a focused branch from the latest `main` branch:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feature/short-description
```

Use clear, imperative commit messages following the project’s existing convention:

```text
feat: add approved field stories archive
fix: make featured story links explicit
chore: harden github dependency automation
```

Keep unrelated refactors out of feature commits. A pull request should explain the user problem, the implementation, the affected routes or migrations, the verification performed, and any deployment or configuration step required.

## UI, navigation, and accessibility

Use semantic links for navigation and buttons for actions. Do not wrap interactive elements inside other interactive elements. Every public link must resolve to a real route or intentional page anchor. Every detail page should provide a clear return path. Use visible keyboard focus states, readable contrast, meaningful labels, touch-friendly controls, and responsive layouts.

For dynamic content such as fundraisers, news, opportunities, and featured stories, provide loading, empty, error, and refresh behavior. When an item is rotated or refreshed, preserve user expectations: new approved content should enter predictably, older approved content should not disappear accidentally, and the full item should remain reachable through a detail page.

## Data, authentication, and payments

Keep Supabase service-role operations in server-only code. Validate request bodies and query parameters on the server. Apply the correct viewer-role checks to all private APIs. Keep approval events, moderation records, account status changes, and administrative mutations auditable.

Donation flows must verify Paystack transactions server-side before recording a successful donation. Never treat a client callback as proof of payment. Anonymous donations may hide the donor’s public display name, but they must remain in the private ledger for verification and audit purposes.

Do not include private donor, volunteer, worker, support-request, or authentication information in public metadata, social links, logs, screenshots, fixtures, or test output.

## Supabase migrations

Any database change must include an idempotent or safely repeatable SQL migration under `supabase/`, update the relevant route and UI code, and document the migration in `README.md`. Pull requests that depend on a migration must state:

- The migration filename and execution order.
- The tables, columns, indexes, policies, or functions it changes.
- Whether existing records are preserved and whether a rollback or recovery step is available.
- The user-visible behavior when the migration has not yet been applied.

Do not silently assume that production has a migration. The application should show an actionable setup warning for optional feature tables.

## Image uploads and media

Accepted image uploads must be validated on the server. Use the shared upload endpoint and optimizer rather than introducing a second storage path. Uploaded images are stored in Supabase Storage, not as raw bytes in database columns. The current optimizer corrects orientation, limits dimensions, converts images to WebP, compresses them, and sets cache headers.

Keep meaningful alternative text for content images. Decorative images should use empty alternative text. Do not upload private or copyrighted material without permission, and do not execute or trust uploaded files.

## Dependency updates and GitHub Actions

Use `npm ci --legacy-peer-deps` and commit the resulting `package-lock.json` when dependencies change. Review direct and transitive changes, run `npm audit --omit=dev --audit-level=high`, and run the production build. Dependabot manages scheduled npm and GitHub Actions update pull requests; do not reintroduce unattended `npm audit fix --force` workflows.

Changes to `.github/workflows/`, `eslint.config.mjs`, `package.json`, or `package-lock.json` should be treated as operational changes. Confirm that workflow permissions are least-privilege and that secrets are not printed in logs.

## Pull-request checklist

Before requesting review, confirm that:

- The change is limited to the stated user need and follows the HMSI design system.
- All new links, buttons, forms, and dashboard actions have been exercised manually or covered by an appropriate test.
- Public routes have loading, empty, error, and responsive states where relevant.
- Server-side authorization and input validation are present for protected actions.
- Supabase migrations are included and documented when data structures change.
- Images use the shared optimized upload path and have appropriate alternative text.
- `npm run lint`, `npm audit --omit=dev --audit-level=high`, `npm run build`, and `git diff --check` pass.
- No secret, personal data, payment detail, or private support record is included in the diff.
- The pull request description includes deployment notes and any required environment or SQL-editor steps.

## Review and release

Maintainers may request changes for security, accessibility, data integrity, performance, maintainability, or clarity. Approved changes are merged through GitHub and deployed through the configured Vercel project. Production migrations should be applied deliberately in Supabase before or alongside the deployment that depends on them.

For security vulnerabilities, do not open a public issue. Follow [`SECURITY.md`](SECURITY.md) instead.
