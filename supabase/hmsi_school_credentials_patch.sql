-- HMSI Human Rights and Humanitarian Service School, assessments, IDs, certificates, and room anti-spam.
-- Apply after the base HMSI, volunteer certificate, and assistant migrations.

create extension if not exists pgcrypto;

create table if not exists public.hmsi_school_modules (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  title varchar(220) not null,
  description text not null,
  level varchar(40) not null default 'foundation',
  duration_minutes integer not null default 60,
  status varchar(24) not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hmsi_school_enrollments (
  id uuid primary key default gen_random_uuid(),
  holder_role varchar(24) not null check (holder_role in ('worker', 'volunteer')),
  holder_id uuid not null,
  holder_name varchar(160) not null,
  holder_email varchar(320) not null,
  status varchar(24) not null default 'enrolled' check (status in ('enrolled', 'in_progress', 'completed', 'withdrawn')),
  enrolled_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique(holder_role, holder_id)
);

create table if not exists public.hmsi_school_module_completions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.hmsi_school_enrollments(id) on delete cascade,
  module_id uuid not null references public.hmsi_school_modules(id) on delete restrict,
  score numeric(5,2),
  passed boolean not null default false,
  completed_at timestamptz,
  unique(enrollment_id, module_id)
);

create table if not exists public.hmsi_monthly_worker_assessments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete restrict,
  assessment_month date not null,
  assessor_email varchar(320) not null,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  outcome varchar(24) not null default 'follow_up' check (outcome in ('passed', 'follow_up', 'not_submitted')),
  notes text,
  submitted_at timestamptz not null default timezone('utc', now()),
  unique(worker_id, assessment_month)
);

create table if not exists public.hmsi_certificate_requests (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.hmsi_school_enrollments(id) on delete restrict,
  holder_role varchar(24) not null check (holder_role in ('worker', 'volunteer')),
  holder_id uuid not null,
  holder_name varchar(160) not null,
  holder_email varchar(320) not null,
  certificate_title varchar(220) not null,
  amount_ngn numeric(12,2) not null check (amount_ngn >= 0),
  status varchar(24) not null default 'eligible' check (status in ('eligible', 'pending_payment', 'paid', 'issued', 'rejected')),
  paystack_reference varchar(120) unique,
  paid_at timestamptz,
  issued_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hmsi_school_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_request_id uuid not null unique references public.hmsi_certificate_requests(id) on delete restrict,
  certificate_number varchar(60) not null unique,
  verification_code_hash varchar(64) not null unique,
  holder_name varchar(160) not null,
  holder_email varchar(320) not null,
  certificate_title varchar(220) not null,
  issued_on date not null default (timezone('utc', now())::date),
  status varchar(24) not null default 'valid' check (status in ('valid', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoke_reason text
);

create table if not exists public.hmsi_id_cards (
  id uuid primary key default gen_random_uuid(),
  holder_role varchar(24) not null check (holder_role in ('worker', 'volunteer')),
  holder_id uuid not null,
  holder_name varchar(160) not null,
  holder_email varchar(320) not null,
  member_number varchar(50) not null unique,
  role_display varchar(60) not null,
  activation_code_hash varchar(64) not null unique,
  activation_code_expires_at timestamptz not null,
  activated_at timestamptz,
  status varchar(24) not null default 'active' check (status in ('active', 'revoked', 'expired')),
  issued_by varchar(320) not null,
  issued_at timestamptz not null default timezone('utc', now()),
  expires_at date
);

alter table public.community_posts add column if not exists author_key varchar(400);
alter table public.community_posts add column if not exists moderation_status varchar(24) not null default 'published';
alter table public.community_posts add column if not exists spam_score integer not null default 0;
alter table public.community_posts add column if not exists content_hash varchar(64);
alter table public.community_comments add column if not exists author_key varchar(400);
alter table public.community_comments add column if not exists moderation_status varchar(24) not null default 'published';
alter table public.community_comments add column if not exists spam_score integer not null default 0;
alter table public.community_comments add column if not exists content_hash varchar(64);

create index if not exists hmsi_assessments_worker_month_idx on public.hmsi_monthly_worker_assessments(worker_id, assessment_month desc);
create index if not exists hmsi_cert_requests_holder_idx on public.hmsi_certificate_requests(holder_role, holder_id, created_at desc);
create index if not exists hmsi_school_certificates_holder_idx on public.hmsi_school_certificates(holder_email, issued_on desc);
create index if not exists hmsi_id_cards_holder_idx on public.hmsi_id_cards(holder_role, holder_id, status);
create index if not exists community_posts_antispam_idx on public.community_posts(author_key, created_at desc);
create index if not exists community_posts_content_hash_idx on public.community_posts(author_key, content_hash, created_at desc);
create index if not exists community_comments_antispam_idx on public.community_comments(author_key, created_at desc);
create index if not exists community_comments_content_hash_idx on public.community_comments(author_key, content_hash, created_at desc);

alter table public.hmsi_school_modules enable row level security;
alter table public.hmsi_school_enrollments enable row level security;
alter table public.hmsi_school_module_completions enable row level security;
alter table public.hmsi_monthly_worker_assessments enable row level security;
alter table public.hmsi_certificate_requests enable row level security;
alter table public.hmsi_school_certificates enable row level security;
alter table public.hmsi_id_cards enable row level security;

-- Server routes mediate all writes and private reads.

insert into public.hmsi_school_modules (code, title, description, level, duration_minutes)
values
  ('HMSI-HR-FOUNDATIONS', 'Human Rights Foundations and Dignity', 'Human rights principles, dignity, equality, non-discrimination, and practical respectful service.', 'foundation', 90),
  ('HMSI-SAFE-ACTION', 'Safeguarding and Do-No-Harm Humanitarian Practice', 'Safeguarding boundaries, informed consent, safe referrals, privacy, and protection from harm.', 'foundation', 120),
  ('HMSI-COMMUNITY', 'Community Accountability and Participation', 'Listening, feedback, inclusion, accessible communication, and accountable community engagement.', 'intermediate', 90),
  ('HMSI-ETHICAL-RECORDS', 'Ethical Records, Evidence, and Reporting', 'Accurate records, source checking, confidentiality, incident escalation, and neutral reporting.', 'intermediate', 90),
  ('HMSI-SERVICE-PRACTICE', 'Humanitarian Service Practice', 'Role clarity, teamwork, referral pathways, professional conduct, and reflective service practice.', 'intermediate', 120)
on conflict (code) do update set title = excluded.title, description = excluded.description, level = excluded.level, duration_minutes = excluded.duration_minutes, status = 'published';
