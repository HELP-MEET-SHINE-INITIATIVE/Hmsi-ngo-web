-- Apply after hmsi_school_credentials_patch.sql.
alter table public.community_posts add column if not exists author_key varchar(400);
alter table public.community_posts add column if not exists moderation_status varchar(24) not null default 'published';
alter table public.community_posts add column if not exists spam_score integer not null default 0;
alter table public.community_posts add column if not exists content_hash varchar(64);
alter table public.community_comments add column if not exists author_key varchar(400);
alter table public.community_comments add column if not exists moderation_status varchar(24) not null default 'published';
alter table public.community_comments add column if not exists spam_score integer not null default 0;
alter table public.community_comments add column if not exists content_hash varchar(64);
create index if not exists community_posts_content_hash_idx on public.community_posts(author_key, content_hash, created_at desc);
create index if not exists community_comments_content_hash_idx on public.community_comments(author_key, content_hash, created_at desc);
