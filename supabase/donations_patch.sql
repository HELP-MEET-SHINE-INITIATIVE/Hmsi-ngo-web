-- HMSI donations ledger incremental migration
-- Run this in the Supabase SQL Editor after the original schema.

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  fundraiser_id text references public.fundraisers(id) on delete set null,
  donor_name varchar(160) not null,
  donor_email varchar(320) not null,
  amount_ngn numeric(14, 2) not null check (amount_ngn > 0),
  paystack_reference varchar(120) not null unique,
  status text not null default 'success' check (status in ('success', 'failed', 'pending', 'reversed')),
  currency varchar(8) not null default 'NGN',
  channel varchar(40),
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists donations_created_at_idx
  on public.donations (created_at desc);
create index if not exists donations_fundraiser_id_idx
  on public.donations (fundraiser_id, created_at desc);
create index if not exists donations_status_created_at_idx
  on public.donations (status, created_at desc);

alter table public.donations enable row level security;

drop policy if exists "Service role can insert donations" on public.donations;
create policy "Service role can insert donations"
  on public.donations for insert to service_role
  with check (true);

drop policy if exists "Service role can select donations" on public.donations;
create policy "Service role can select donations"
  on public.donations for select to service_role
  using (true);

-- Donation updates and deletes remain service-role-only through the server API.

create or replace function public.increment_fundraiser_raised_amount(p_fundraiser_id text, p_amount numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update public.fundraisers
  set raised_amount = raised_amount + p_amount,
      updated_at = timezone('utc', now())
  where id = p_fundraiser_id;
$$;

revoke all on function public.increment_fundraiser_raised_amount(text, numeric) from public, anon, authenticated;
grant execute on function public.increment_fundraiser_raised_amount(text, numeric) to service_role;
