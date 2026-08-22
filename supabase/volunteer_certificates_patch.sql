-- HMSI volunteer service certificate records
-- Run in the Supabase SQL Editor after the base schema.

create table if not exists public.volunteer_certificates (
  id uuid primary key default gen_random_uuid(),
  volunteer_application_id uuid not null references public.volunteer_applications(id) on delete restrict,
  certificate_number varchar(40) not null unique,
  verification_code_hash varchar(64) not null unique,
  holder_name varchar(160) not null,
  holder_email varchar(320) not null,
  service_title varchar(200) not null,
  service_start date,
  service_end date,
  service_hours numeric(8, 2),
  issued_on date not null default (timezone('utc', now())::date),
  status text not null default 'valid' check (status in ('valid', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoke_reason text,
  unique (volunteer_application_id, service_title, issued_on)
);

create index if not exists volunteer_certificates_holder_email_idx
  on public.volunteer_certificates (holder_email, issued_on desc);
create index if not exists volunteer_certificates_status_idx
  on public.volunteer_certificates (status, issued_on desc);

alter table public.volunteer_certificates enable row level security;

drop policy if exists "Service role can manage volunteer certificates" on public.volunteer_certificates;
create policy "Service role can manage volunteer certificates"
  on public.volunteer_certificates for all to service_role
  using (true) with check (true);

-- Public verification is served through the server route, which only returns
-- limited certificate fields after matching the certificate number and code.
