-- HMSI outreach-gallery patch
-- Apply through the controlled Supabase migration workflow.

create extension if not exists pgcrypto;

create table if not exists public.outreach_gallery_images (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.featured_story_drafts(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  caption varchar(300),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by varchar(320) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by varchar(320),
  storage_deleted_at timestamptz
);

create index if not exists outreach_gallery_images_story_active_order_idx
  on public.outreach_gallery_images (story_id, is_deleted, sort_order, created_at);

create table if not exists public.outreach_gallery_events (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.featured_story_drafts(id) on delete cascade,
  image_id uuid references public.outreach_gallery_images(id) on delete set null,
  action varchar(40) not null check (action in ('added', 'caption_updated', 'reordered', 'deleted', 'storage_delete_failed')),
  actor_email varchar(320) not null,
  detail text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists outreach_gallery_events_story_created_idx
  on public.outreach_gallery_events (story_id, created_at desc);

alter table public.outreach_gallery_images enable row level security;
alter table public.outreach_gallery_events enable row level security;

drop policy if exists "Service role can manage outreach gallery images" on public.outreach_gallery_images;
create policy "Service role can manage outreach gallery images"
  on public.outreach_gallery_images for all to service_role using (true) with check (true);

drop policy if exists "Service role can manage outreach gallery events" on public.outreach_gallery_events;
create policy "Service role can manage outreach gallery events"
  on public.outreach_gallery_events for all to service_role using (true) with check (true);

create or replace function public.touch_outreach_gallery_image_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists outreach_gallery_images_updated_at on public.outreach_gallery_images;
create trigger outreach_gallery_images_updated_at
before update on public.outreach_gallery_images
for each row execute function public.touch_outreach_gallery_image_updated_at();
