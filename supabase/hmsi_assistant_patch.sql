-- HMSI Assistant document library and audit trail.
-- Apply this migration in the Supabase SQL Editor before enabling the dashboard panel.
-- File bytes are not stored in the database. This first version manages approved text/Markdown records;
-- future binary uploads must use a private Storage bucket with signed URLs and the same permission model.

create extension if not exists pgcrypto;

create table if not exists public.hmsi_assistant_documents (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null,
  category varchar(80) not null default 'governance',
  visibility varchar(24) not null default 'admin' check (visibility in ('admin', 'worker', 'shared')),
  status varchar(24) not null default 'active' check (status in ('active', 'archived')),
  created_by_email varchar(320) not null,
  updated_by_email varchar(320) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hmsi_assistant_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.hmsi_assistant_documents(id) on delete cascade,
  version integer not null check (version > 0),
  content text not null,
  change_summary varchar(500),
  created_by_email varchar(320) not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_id, version)
);

create table if not exists public.hmsi_assistant_tasks (
  id uuid primary key default gen_random_uuid(),
  manus_task_id varchar(160) not null unique,
  requested_by_email varchar(320) not null,
  prompt_summary varchar(500) not null,
  document_ids uuid[] not null default '{}',
  status varchar(32) not null default 'running' check (status in ('running', 'stopped', 'waiting', 'error')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hmsi_assistant_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email varchar(320) not null,
  actor_role varchar(32) not null default 'admin',
  action varchar(64) not null,
  document_id uuid references public.hmsi_assistant_documents(id) on delete set null,
  manus_task_id varchar(160),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists hmsi_assistant_documents_status_updated_idx
  on public.hmsi_assistant_documents (status, updated_at desc);
create index if not exists hmsi_assistant_versions_document_created_idx
  on public.hmsi_assistant_document_versions (document_id, created_at desc);
create index if not exists hmsi_assistant_tasks_requested_created_idx
  on public.hmsi_assistant_tasks (requested_by_email, created_at desc);
create index if not exists hmsi_assistant_audit_created_idx
  on public.hmsi_assistant_audit_logs (created_at desc);

alter table public.hmsi_assistant_documents enable row level security;
alter table public.hmsi_assistant_document_versions enable row level security;
alter table public.hmsi_assistant_tasks enable row level security;
alter table public.hmsi_assistant_audit_logs enable row level security;

-- All access is intentionally mediated by the server-side admin/worker APIs.
-- No public or browser-authenticated policy is created here.
