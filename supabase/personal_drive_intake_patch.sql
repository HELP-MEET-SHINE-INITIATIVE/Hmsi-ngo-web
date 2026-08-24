-- HMSI personal Google Drive share-link intake.
-- The external Drive URL is private metadata: it is visible only to its
-- submitter through server-authorized APIs and to signed HMSI administrators.

create table if not exists public.external_drive_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_auth_user_id uuid not null,
  submitter_profile_id uuid not null,
  submitter_email varchar(320) not null,
  submitter_name varchar(200) not null,
  submitter_role text not null check (submitter_role in ('worker', 'volunteer', 'member')),
  personal_drive_url text,
  status text not null default 'pending_download' check (status in ('pending_download', 'ingested', 'access_error', 'link_cleared')),
  access_request_note text,
  access_requested_at timestamptz,
  access_requested_by varchar(320),
  archive_bucket varchar(255),
  archive_object_key text,
  ingested_at timestamptz,
  ingested_by varchar(320),
  cleared_at timestamptz,
  cleared_by varchar(320),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint external_drive_submissions_ingested_archive_check check (
    status <> 'ingested' or (ingested_at is not null and ingested_by is not null and archive_bucket is not null and archive_object_key is not null)
  ),
  constraint external_drive_submissions_cleared_link_check check (
    status <> 'link_cleared' or (personal_drive_url is null and cleared_at is not null and cleared_by is not null)
  )
);

create index if not exists external_drive_submissions_submitter_idx
  on public.external_drive_submissions (submitter_auth_user_id, created_at desc);
create index if not exists external_drive_submissions_status_idx
  on public.external_drive_submissions (status, created_at desc);

create table if not exists public.external_drive_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.external_drive_submissions(id) on delete cascade,
  action text not null check (action in ('submitted', 'access_requested', 'ingested', 'link_cleared')),
  actor_email varchar(320) not null,
  actor_role text not null check (actor_role in ('admin', 'worker', 'volunteer', 'member')),
  detail text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists external_drive_submission_events_submission_idx
  on public.external_drive_submission_events (submission_id, created_at desc);

create or replace function public.set_external_drive_submission_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists external_drive_submissions_set_updated_at on public.external_drive_submissions;
create trigger external_drive_submissions_set_updated_at
before update on public.external_drive_submissions
for each row execute function public.set_external_drive_submission_updated_at();

alter table public.external_drive_submissions enable row level security;
alter table public.external_drive_submission_events enable row level security;
-- The application uses server-side service-role APIs with explicit portal/admin
-- authorization; do not add browser-readable policies for Drive URLs.

