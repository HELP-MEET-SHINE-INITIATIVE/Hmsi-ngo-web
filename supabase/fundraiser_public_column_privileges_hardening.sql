-- HMSI fundraiser contact least-privilege hardening
-- Public application routes use the server-side service role. Anonymous/authenticated
-- Supabase roles receive only the donor-facing fundraiser projection and never private creator contacts.
revoke select on table public.fundraisers from public, anon, authenticated;
grant select (
  id, title, description, category, target_amount, raised_amount,
  image_url, image_path, status, created_at
) on table public.fundraisers to anon, authenticated;
