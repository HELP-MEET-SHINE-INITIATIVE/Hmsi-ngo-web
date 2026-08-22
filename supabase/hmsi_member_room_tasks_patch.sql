-- General HMSI members, member-only tasks, and a governed member-room audience.
create extension if not exists pgcrypto;

create table if not exists public.hmsi_member_applications (
  id uuid primary key default gen_random_uuid(),
  name varchar(160) not null,
  email varchar(320) not null,
  phone varchar(64),
  purpose text not null,
  status varchar(24) not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by varchar(320),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hmsi_members (
  id uuid primary key default gen_random_uuid(),
  application_id uuid unique references public.hmsi_member_applications(id) on delete restrict,
  name varchar(160) not null,
  email varchar(320) not null unique,
  phone varchar(64),
  status varchar(24) not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hmsi_member_tasks (
  id uuid primary key default gen_random_uuid(),
  assigned_member_id uuid not null references public.hmsi_members(id) on delete restrict,
  title varchar(220) not null,
  description text not null,
  kind varchar(40) not null default 'member_support',
  priority varchar(24) not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status varchar(24) not null default 'assigned' check (status in ('assigned', 'in_progress', 'submitted', 'completed', 'cancelled')),
  due_at timestamptz,
  completion_note text,
  created_by varchar(320) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.hmsi_member_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.hmsi_member_tasks(id) on delete cascade,
  actor_email varchar(320) not null,
  actor_role varchar(32) not null,
  action varchar(48) not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.hmsi_id_cards drop constraint if exists hmsi_id_cards_holder_role_check;
alter table public.hmsi_id_cards add constraint hmsi_id_cards_holder_role_check check (holder_role in ('worker', 'volunteer', 'member'));
alter table public.community_posts drop constraint if exists community_posts_audience_check;
alter table public.community_posts add constraint community_posts_audience_check check (audience in ('volunteer', 'worker', 'member', 'all'));
alter table public.community_posts drop constraint if exists community_posts_author_role_check;
alter table public.community_posts add constraint community_posts_author_role_check check (author_role in ('volunteer', 'worker', 'member', 'admin'));
alter table public.community_comments drop constraint if exists community_comments_author_role_check;
alter table public.community_comments add constraint community_comments_author_role_check check (author_role in ('volunteer', 'worker', 'member', 'admin'));

create index if not exists hmsi_member_applications_status_idx on public.hmsi_member_applications(status, created_at desc);
create index if not exists hmsi_members_status_idx on public.hmsi_members(status, created_at desc);
create index if not exists hmsi_member_tasks_member_status_idx on public.hmsi_member_tasks(assigned_member_id, status, due_at);
create index if not exists hmsi_member_task_events_task_idx on public.hmsi_member_task_events(task_id, created_at desc);
create index if not exists community_posts_member_audience_idx on public.community_posts(audience, moderation_status, created_at desc);

alter table public.hmsi_member_applications enable row level security;
alter table public.hmsi_members enable row level security;
alter table public.hmsi_member_tasks enable row level security;
alter table public.hmsi_member_task_events enable row level security;
