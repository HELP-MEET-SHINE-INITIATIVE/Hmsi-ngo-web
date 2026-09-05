-- HMSI durable Semgrep exception-alert state
-- Additive migration. Review in an isolated Supabase project before production.
-- This migration creates no schedules, Slack messages, or source-data records.

begin;

create table if not exists public.security_exception_alert_state (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'semgrep_exception_summary'
    check (scope = 'semgrep_exception_summary'),
  environment text not null
    check (environment in ('staging', 'production')),
  fingerprint text not null
    check (fingerprint ~ '^[0-9a-f]{64}$'),
  expired_count integer not null default 0
    check (expired_count between 0 and 1000000),
  expiring_count integer not null default 0
    check (expiring_count between 0 and 1000000),
  invalid_metadata_count integer not null default 0
    check (invalid_metadata_count between 0 and 1000000),
  expiring_window_days smallint not null default 7
    check (expiring_window_days between 1 and 30),
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'suppressed')),
  delivery_attempts integer not null default 0
    check (delivery_attempts between 0 and 100),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_sent_at timestamptz,
  next_retry_at timestamptz,
  last_error_code text
    check (last_error_code is null or last_error_code in (
      'webhook_timeout',
      'webhook_unavailable',
      'webhook_rejected',
      'state_conflict',
      'configuration_invalid'
    )),
  retention_until timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, environment, fingerprint)
);

create table if not exists public.security_exception_alert_attempt (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null
    references public.security_exception_alert_state(id) on delete restrict,
  attempted_at timestamptz not null default now(),
  outcome text not null
    check (outcome in ('claimed', 'sent', 'duplicate', 'timeout', 'unavailable', 'rejected', 'invalid')),
  http_status smallint
    check (http_status is null or http_status between 100 and 599),
  retention_until timestamptz not null default (now() + interval '30 days')
);

create index if not exists security_exception_alert_state_due_idx
  on public.security_exception_alert_state (environment, delivery_status, next_retry_at);

create index if not exists security_exception_alert_state_retention_idx
  on public.security_exception_alert_state (retention_until);

create index if not exists security_exception_alert_attempt_state_idx
  on public.security_exception_alert_attempt (state_id, attempted_at desc);

create index if not exists security_exception_alert_attempt_retention_idx
  on public.security_exception_alert_attempt (retention_until);

-- RLS is intentionally enabled with no browser policies: default deny.
-- FORCE prevents an ordinary table owner session from bypassing RLS.
alter table public.security_exception_alert_state enable row level security;
alter table public.security_exception_alert_state force row level security;
alter table public.security_exception_alert_attempt enable row level security;
alter table public.security_exception_alert_attempt force row level security;

revoke all on table public.security_exception_alert_state from public, anon, authenticated;
revoke all on table public.security_exception_alert_attempt from public, anon, authenticated;
revoke all on table public.security_exception_alert_state from service_role;
revoke all on table public.security_exception_alert_attempt from service_role;

grant select, insert, update on table public.security_exception_alert_state to service_role;
grant select, insert on table public.security_exception_alert_attempt to service_role;

create or replace function public.claim_security_exception_alert(
  p_environment text,
  p_fingerprint text,
  p_expired_count integer,
  p_expiring_count integer,
  p_invalid_metadata_count integer,
  p_expiring_window_days smallint,
  p_now timestamptz default now()
)
returns table (state_id uuid, claimed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state_id uuid;
  v_claimed boolean;
begin
  if p_environment not in ('staging', 'production') then
    raise exception using errcode = '22023', message = 'invalid environment';
  end if;
  if p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid fingerprint';
  end if;
  if p_expired_count not between 0 and 1000000
     or p_expiring_count not between 0 and 1000000
     or p_invalid_metadata_count not between 0 and 1000000 then
    raise exception using errcode = '22023', message = 'invalid aggregate count';
  end if;
  if p_expiring_window_days not between 1 and 30 then
    raise exception using errcode = '22023', message = 'invalid expiry window';
  end if;

  insert into public.security_exception_alert_state (
    environment,
    fingerprint,
    expired_count,
    expiring_count,
    invalid_metadata_count,
    expiring_window_days,
    delivery_status,
    delivery_attempts,
    first_seen_at,
    last_seen_at,
    retention_until,
    updated_at
  ) values (
    p_environment,
    p_fingerprint,
    p_expired_count,
    p_expiring_count,
    p_invalid_metadata_count,
    p_expiring_window_days,
    'pending',
    0,
    p_now,
    p_now,
    p_now + interval '30 days',
    p_now
  )
  on conflict (scope, environment, fingerprint) do update
    set expired_count = excluded.expired_count,
        expiring_count = excluded.expiring_count,
        invalid_metadata_count = excluded.invalid_metadata_count,
        expiring_window_days = excluded.expiring_window_days,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at
  returning id into v_state_id;

  select not (
    s.delivery_status = 'sent'
    and s.last_sent_at is not null
    and s.last_sent_at >= p_now - interval '30 days'
  )
  into v_claimed
  from public.security_exception_alert_state as s
  where s.id = v_state_id
  for update;

  if v_claimed then
    update public.security_exception_alert_state
    set delivery_status = 'pending',
        delivery_attempts = delivery_attempts + 1,
        next_retry_at = null,
        last_error_code = null,
        updated_at = p_now
    where id = v_state_id;

    insert into public.security_exception_alert_attempt (state_id, attempted_at, outcome)
    values (v_state_id, p_now, 'claimed');
  else
    insert into public.security_exception_alert_attempt (state_id, attempted_at, outcome)
    values (v_state_id, p_now, 'duplicate');
  end if;

  return query select v_state_id, v_claimed;
end;
$$;

create or replace function public.mark_security_exception_alert_sent(
  p_state_id uuid,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.security_exception_alert_state
  set delivery_status = 'sent',
      last_sent_at = p_now,
      next_retry_at = null,
      last_error_code = null,
      updated_at = p_now
  where id = p_state_id
    and delivery_status = 'pending';

  if not found then
    return false;
  end if;

  insert into public.security_exception_alert_attempt (state_id, attempted_at, outcome)
  values (p_state_id, p_now, 'sent');
  return true;
end;
$$;

create or replace function public.mark_security_exception_alert_failed(
  p_state_id uuid,
  p_error_code text,
  p_next_retry_at timestamptz,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_outcome text;
begin
  if p_error_code not in ('webhook_timeout', 'webhook_unavailable', 'webhook_rejected', 'state_conflict', 'configuration_invalid') then
    raise exception using errcode = '22023', message = 'invalid error code';
  end if;

  v_outcome := case p_error_code
    when 'webhook_timeout' then 'timeout'
    when 'webhook_unavailable' then 'unavailable'
    when 'webhook_rejected' then 'rejected'
    else 'invalid'
  end;

  update public.security_exception_alert_state
  set delivery_status = 'failed',
      last_error_code = p_error_code,
      next_retry_at = p_next_retry_at,
      updated_at = p_now
  where id = p_state_id
    and delivery_status = 'pending';

  if not found then
    return false;
  end if;

  insert into public.security_exception_alert_attempt (state_id, attempted_at, outcome)
  values (p_state_id, p_now, v_outcome);
  return true;
end;
$$;

-- SECURITY DEFINER functions must not remain executable by browser roles.
revoke all on function public.claim_security_exception_alert(text, text, integer, integer, integer, smallint, timestamptz)
  from public, anon, authenticated;
revoke all on function public.mark_security_exception_alert_sent(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.mark_security_exception_alert_failed(uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_security_exception_alert(text, text, integer, integer, integer, smallint, timestamptz)
  to service_role;
grant execute on function public.mark_security_exception_alert_sent(uuid, timestamptz)
  to service_role;
grant execute on function public.mark_security_exception_alert_failed(uuid, text, timestamptz, timestamptz)
  to service_role;

commit;
