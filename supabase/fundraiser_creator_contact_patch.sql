-- HMSI fundraiser creator contact privacy patch
-- Additive and idempotent. Apply after the base fundraiser schema and fundraiser_management_patch.sql.
-- Rollback note: after exporting any required private review records, remove the three columns with
-- ALTER TABLE public.fundraisers DROP COLUMN IF EXISTS contact_phone, DROP COLUMN IF EXISTS contact_email,
-- DROP COLUMN IF EXISTS contact_location; do not remove them while pending reviews still require follow-up.

alter table public.fundraisers
  add column if not exists contact_phone varchar(32),
  add column if not exists contact_email varchar(320),
  add column if not exists contact_location varchar(160);

alter table public.fundraisers
  drop constraint if exists fundraisers_contact_phone_format_check,
  drop constraint if exists fundraisers_contact_email_format_check,
  drop constraint if exists fundraisers_contact_location_format_check;

alter table public.fundraisers
  add constraint fundraisers_contact_phone_format_check
    check (contact_phone is null or (length(contact_phone) between 7 and 32 and contact_phone ~ '^\+?[0-9][0-9 ()-]{6,31}$')),
  add constraint fundraisers_contact_email_format_check
    check (contact_email is null or (length(contact_email) between 3 and 320 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  add constraint fundraisers_contact_location_format_check
    check (contact_location is null or (length(contact_location) between 2 and 160 and contact_location !~ '[[:cntrl:]]'));

comment on column public.fundraisers.contact_phone is 'PRIVATE: fundraiser creator phone; server/admin review only; never include in public projections.';
comment on column public.fundraisers.contact_email is 'PRIVATE: fundraiser creator email; server/admin review and transactional delivery only; never include in public projections.';
comment on column public.fundraisers.contact_location is 'PRIVATE: fundraiser creator location; server/admin review only; never include in public projections.';

revoke select (contact_phone, contact_email, contact_location) on public.fundraisers from anon, authenticated;
