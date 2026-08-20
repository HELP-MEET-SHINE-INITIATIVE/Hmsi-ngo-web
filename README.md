# Help Meet Shine Initiative (HMSI) — Web Platform
[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js_15-black?logo=next.js)](https://nextjs.org/)
[![Styling: Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
Official web platform for **Help Meet Shine Initiative (HMSI)** — a registered NGO in Nigeria focused on humanitarian aid, community empowerment, and sustainable social growth.
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

The public contact address is **support@hmsi.org.ng**. HMSI is presented as serving communities in **Nigeria and across Africa** throughout the contact experience and site metadata.


## Private Admin Control Center

The private administration workspace is available at `/hmsi-control` and is intentionally omitted from public navigation and indexing. It is not protected by obscurity alone: the server requires `HMSI_ADMIN_EMAIL`, `HMSI_ADMIN_PASSWORD`, and `HMSI_ADMIN_SESSION_SECRET`, then issues an eight-hour signed HTTP-only session cookie with strict same-site protection.

The control center provides four simple areas: an overview queue, fundraiser approval, volunteer application review, and worker assignments. Administrators can approve or reject fundraising requests, approve or reject volunteer applications, add workers, and assign either assistance or job tasks with optional fundraiser links and due dates. Run the extended `supabase/schema.sql` in the Supabase SQL Editor before using these workflows.
