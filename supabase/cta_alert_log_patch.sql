-- HMSI weekly CTA alert delivery log
-- Service-role-only table used to make scheduled alert delivery idempotent.

create table if not exists public.cta_alert_log (
  period_key text primary key,
  period_start timestamptz not null,
  period_end timestamptz not null,
  threshold numeric(5,2) not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  ctr numeric(7,3),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

alter table public.cta_alert_log enable row level security;

drop policy if exists "Service role can manage CTA alert log" on public.cta_alert_log;
create policy "Service role can manage CTA alert log"
  on public.cta_alert_log for all to service_role
  using (true) with check (true);

comment on table public.cta_alert_log is 'Idempotency log for HMSI weekly onboarding CTA CTR alerts; service role only.';
