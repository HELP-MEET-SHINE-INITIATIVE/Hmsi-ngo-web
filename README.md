# Help Meet Shine Initiative (HMSI) — Web Platform
[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js_15-black?logo=next.js)](https://nextjs.org/)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: HMSI NGO Non-Commercial](https://img.shields.io/badge/License-HMSI%20NGO%20Non--Commercial-b56b3b.svg)](LICENSE)
Official web platform for **Help Meet Shine Initiative (HMSI)** — a registered NGO in Nigeria focused on humanitarian aid, community empowerment, and sustainable social growth. The repository is distributed under the custom **HMSI NGO Non-Commercial License** in `LICENSE`.
---
## 🚀 Key Features
- **Direct Payment Portal:** Seamless online donations through the secure Paystack checkout popup.
- **Impact Counter:** Dynamic statistics tracking community outreach metrics.
- **Media Gallery:** High-performance imagery showcasing field initiatives.
- **Volunteer Onboarding:** Direct application pipeline for community partners.
---
## 🛠️ Tech Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Animations:** Framer Motion
- **Payments:** Paystack Inline API
- **Hosting:** Vercel
---
## Canonical Domain Redirect

The middleware permanently redirects `helpmeetshine.org.ng` and `www.helpmeetshine.org.ng` to `https://www.hmsi.org.ng/`, preserving the requested path and query string. To activate the redirect, add both legacy hostnames to the same Vercel project under **Settings → Domains**, then configure their DNS records at the domain registrar as Vercel instructs. The redirect cannot take effect until those hostnames resolve to Vercel.

## 💻 Local Development Setup
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Gpowerluv/Hmsi-ngo-web.git](https://github.com/Gpowerluv/Hmsi-ngo-web.git)
   cd Hmsi-ngo-web


## Supabase Configuration

Fundraiser records, contact messages, and signup requests are stored in Supabase. Fundraiser cover images are stored in the `fundraiser-images` Supabase Storage bucket; only image metadata and the public image URL are stored in the database. The server uses the Supabase service-role key exclusively in route handlers, while browser-safe configuration uses the public anon key.

1. Copy `.env.example` to `.env.local` and add the Supabase project URL, anon key, and service-role key. Never commit the service-role key.
2. Run `supabase/schema.sql` in the Supabase SQL Editor. This creates the fundraiser, contact-message, and signup-request tables, enables row-level security, creates the storage bucket, and preserves the two existing seed fundraisers.
3. Deploy the environment variables to the hosting provider. Without server credentials, the public fundraiser listing uses the bundled seed records, while new fundraiser and contact submissions return a clear configuration error rather than silently losing data.
4. Fundraiser uploads accept JPG, PNG, and WEBP images up to 8 MB. The server validates type and size, stores the file in Supabase Storage with a one-year cache policy, and stores only its URL and storage path in Supabase.

The public contact addresses are **support@hmsi.org.ng** for support and **contact@hmsi.org.ng** for general enquiries and partnerships. HMSI is presented as serving communities in **Nigeria and across Africa** throughout the contact experience and site metadata.


## Private Admin Control Center

The private administration workspace is available at `/hmsi-control` and is intentionally omitted from public navigation and indexing. It is not protected by obscurity alone: the server requires `HMSI_ADMIN_EMAIL`, `HMSI_ADMIN_PASSWORD`, and `HMSI_ADMIN_SESSION_SECRET`, then issues an eight-hour signed HTTP-only session cookie with strict same-site protection.

The control center provides four simple areas: an overview queue, fundraiser approval, volunteer application review, and worker assignments. Administrators can approve or reject fundraising requests, approve or reject volunteer applications, add workers, and assign either assistance or job tasks with optional fundraiser links and due dates. Run the extended `supabase/schema.sql` in the Supabase SQL Editor before using these workflows.

## Opportunities, Worker Approval, and Community Rooms

The public `/opportunities` page displays open volunteer opportunities, worker positions, and shared roles published by an administrator. Signed-in users can apply with their role and phone number; applications are stored as `pending` records for review. The private `/hmsi-control` workspace now includes an **Opportunities** area where administrators publish positions and approve or reject applications.

Volunteer and worker account signups both enter the Supabase `volunteer_applications` review queue. Approving an application marked `worker` also creates or reactivates the applicant in the `workers` directory. The worker can then use `/worker-dashboard` and `/worker-room`; a worker may also enter and post in `/volunteer-room`, while volunteers cannot enter the worker room.

The `/volunteer-room` page is the shared collaboration space for volunteers and workers. The `/worker-room` page is restricted to workers and supports worker posts, comments, and likes. These pages use the `community_posts`, `community_comments`, and `community_likes` tables from the extended `supabase/schema.sql` migration.

After pulling this update, run the complete extended `supabase/schema.sql` in the Supabase SQL Editor before using opportunities or community rooms. Redeploy the latest commit after the schema migration so the public routes and admin publisher use the new tables.
