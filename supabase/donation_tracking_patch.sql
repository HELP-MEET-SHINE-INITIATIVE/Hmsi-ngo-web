-- HMSI multi-channel donation tracking migration.
-- Additive: preserves existing verified donations and makes manual entries fail closed until an admin verifies them.

alter table public.donations
  add column if not exists donor_phone varchar(40),
  add column if not exists payment_provider varchar(32) not null default 'paystack',
  add column if not exists payment_method varchar(32),
  add column if not exists campaign_name_snapshot varchar(220),
  add column if not exists verified_at timestamptz,
  add column if not exists manual_recorded_by varchar(320),
  add column if not exists manual_verified_by varchar(320),
  add column if not exists manual_verified_at timestamptz;

alter table public.donations drop constraint if exists donations_status_check;
alter table public.donations add constraint donations_status_check
  check (status in ('success', 'failed', 'pending', 'reversed', 'manual_verification'));

alter table public.donations drop constraint if exists donations_payment_provider_check;
alter table public.donations add constraint donations_payment_provider_check
  check (payment_provider in ('paystack', 'flutterwave', 'stripe', 'manual'));
alter table public.donations drop constraint if exists donations_payment_method_check;
alter table public.donations add constraint donations_payment_method_check
  check (payment_method is null or payment_method in ('card', 'bank_transfer', 'manual', 'ussd'));

create index if not exists donations_provider_status_created_idx
  on public.donations (payment_provider, status, created_at desc);
create index if not exists donations_manual_verification_idx
  on public.donations (status, created_at desc)
  where status = 'manual_verification';

create table if not exists public.donation_ingestion_events (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references public.donations(id) on delete restrict,
  provider varchar(32) not null check (provider in ('paystack', 'flutterwave', 'stripe', 'manual')),
  provider_event_id varchar(180) not null unique,
  event_type varchar(80) not null,
  verification_status varchar(32) not null check (verification_status in ('verified', 'ignored', 'failed', 'pending_manual_verification')),
  reference_suffix varchar(16),
  received_at timestamptz not null default timezone('utc', now()),
  detail varchar(160)
);

create index if not exists donation_ingestion_events_donation_idx
  on public.donation_ingestion_events (donation_id, received_at desc);

alter table public.donation_ingestion_events enable row level security;
drop policy if exists "Service role can read donation ingestion events" on public.donation_ingestion_events;
create policy "Service role can read donation ingestion events"
  on public.donation_ingestion_events for select to service_role using (true);
drop policy if exists "Service role can insert donation ingestion events" on public.donation_ingestion_events;
create policy "Service role can insert donation ingestion events"
  on public.donation_ingestion_events for insert to service_role with check (true);
