-- HMSI donation acknowledgement audit migration
-- Adds append-only event records and constrained summary fields without altering existing donations.

alter table public.donations
  add column if not exists acknowledgement_status text not null default 'not_started'
    check (acknowledgement_status in ('not_started', 'queued', 'sent', 'delivered', 'bounced', 'failed', 'suppressed')),
  add column if not exists acknowledgement_message_id text,
  add column if not exists acknowledgement_last_error text,
  add column if not exists acknowledgement_sent_at timestamptz,
  add column if not exists acknowledgement_delivered_at timestamptz,
  add column if not exists acknowledgement_bounced_at timestamptz,
  add column if not exists acknowledgement_failed_at timestamptz,
  add column if not exists acknowledgement_updated_at timestamptz not null default timezone('utc', now());

create index if not exists donations_acknowledgement_status_idx
  on public.donations (acknowledgement_status, created_at desc);

create table if not exists public.donation_acknowledgement_events (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete restrict,
  event_type text not null check (event_type in ('queued', 'sent', 'delivered', 'bounced', 'failed', 'suppressed')),
  provider_message_id text,
  provider_event_id text unique,
  event_source text not null default 'application' check (event_source in ('application', 'webhook', 'manual_reconciliation')),
  occurred_at timestamptz not null default timezone('utc', now()),
  recorded_at timestamptz not null default timezone('utc', now()),
  detail text
);

create index if not exists donation_acknowledgement_events_donation_idx
  on public.donation_acknowledgement_events (donation_id, occurred_at desc);
create index if not exists donation_acknowledgement_events_provider_message_idx
  on public.donation_acknowledgement_events (provider_message_id)
  where provider_message_id is not null;

alter table public.donation_acknowledgement_events enable row level security;

drop policy if exists "Service role can read donation acknowledgement events" on public.donation_acknowledgement_events;
create policy "Service role can read donation acknowledgement events"
  on public.donation_acknowledgement_events for select to service_role using (true);

drop policy if exists "Service role can insert donation acknowledgement events" on public.donation_acknowledgement_events;
create policy "Service role can insert donation acknowledgement events"
  on public.donation_acknowledgement_events for insert to service_role with check (true);

drop policy if exists "Service role can update donation acknowledgement summaries" on public.donations;
create policy "Service role can update donation acknowledgement summaries"
  on public.donations for update to service_role using (true) with check (true);
