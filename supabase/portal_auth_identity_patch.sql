-- Additive identity mapping for built-in Supabase Auth.
-- Server routes remain the only write path; no existing data is removed.
alter table public.workers add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.workers add column if not exists profile_photo_path text;
alter table public.workers add column if not exists profile_photo_url text;
create unique index if not exists workers_auth_user_id_uidx on public.workers(auth_user_id) where auth_user_id is not null;

alter table public.volunteer_applications add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.volunteer_applications add column if not exists profile_photo_path text;
alter table public.volunteer_applications add column if not exists profile_photo_url text;
create unique index if not exists volunteer_applications_auth_user_id_uidx on public.volunteer_applications(auth_user_id) where auth_user_id is not null;

alter table public.hmsi_members add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.hmsi_members add column if not exists profile_photo_path text;
alter table public.hmsi_members add column if not exists profile_photo_url text;
create unique index if not exists hmsi_members_auth_user_id_uidx on public.hmsi_members(auth_user_id) where auth_user_id is not null;
