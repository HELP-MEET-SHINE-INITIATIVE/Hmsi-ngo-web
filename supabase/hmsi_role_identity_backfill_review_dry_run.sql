-- HMSI review-first role identity backfill.
--
-- PURPOSE
--   Discover exact canonical email candidates for historic organization_roles
--   records without writing organization_roles.auth_user_id and without
--   creating any capability grant. An email match is a review aid, not proof of
--   identity or approval to activate a privileged role.
--
-- DEPENDENCY
--   Apply only after hmsi_scoped_roles_rls_dry_run_migration.sql has been
--   reviewed and persisted in the same environment. This package deliberately
--   ends in ROLLBACK and cannot activate any person or role.
--
-- SECURITY RULES
--   * Do not strip plus-tags, rewrite domains, follow aliases, or use fuzzy
--     matching. Only lower(trim(email)) equality is candidate discovery.
--   * Never auto-populate organization_roles.auth_user_id from this script.
--   * Do not place emails, message text, credentials, donor data, or payment
--     references in review notes or approval evidence.
--   * Review results are private to protected server routes; direct client
--     grants are revoked.

begin;

-- ============================================================================
-- 0. Fail closed if the base schema is not fully ready.
-- ============================================================================
do $$
begin
  if to_regclass('public.organization_roles') is null
     or to_regclass('public.role_capability_grants') is null
     or to_regclass('public.role_capability_templates') is null
     or to_regclass('public.approval_policies') is null
     or to_regclass('public.approval_requests') is null
     or to_regclass('public.approval_events') is null then
    raise exception 'Scoped-role prerequisites are missing. Apply and verify the base scoped-role migration first.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organization_roles' and column_name = 'auth_user_id'
  ) then
    raise exception 'organization_roles.auth_user_id is missing. Apply and verify the base scoped-role migration first.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at'
  ) then
    raise exception 'auth.users.email_confirmed_at is required for candidate eligibility review.';
  end if;
end;
$$;

-- ============================================================================
-- 1. Private review queue. The source email remains in organization_roles;
--    this queue stores only non-authorizing candidate state and outcome. The
--    source email remains solely in organization_roles and is rechecked in the
--    protected activation route.
-- ============================================================================
create table if not exists public.role_identity_backfill_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_role_id uuid not null unique references public.organization_roles(id) on delete cascade,
  candidate_auth_user_id uuid references auth.users(id) on delete set null,
  discovered_candidate_auth_user_id uuid references auth.users(id) on delete set null,
  exact_auth_match_count smallint not null default 0 check (exact_auth_match_count >= 0),
  candidate_email_confirmed boolean,
  candidate_not_banned boolean,
  review_status text not null check (review_status in (
    'pending_identity_verification',
    'requires_email_correction',
    'no_exact_auth_match',
    'ambiguous_auth_match',
    'candidate_not_eligible',
    'already_bound_same',
    'already_bound_conflict',
    'approved_for_activation',
    'rejected',
    'activated',
    'stale'
  )),
  reviewed_by_auth_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_evidence_reference text check (
    review_evidence_reference is null
    or char_length(trim(review_evidence_reference)) between 3 and 500
  ),
  review_note text check (review_note is null or char_length(trim(review_note)) between 3 and 1000),
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  activation_started_at timestamptz,
  activated_at timestamptz,
  activated_by_auth_user_id uuid references auth.users(id) on delete set null,
  candidate_changed_at timestamptz,
  discovery_refreshed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (review_status = 'approved_for_activation' and candidate_auth_user_id is not null and reviewed_by_auth_user_id is not null and reviewed_at is not null and review_evidence_reference is not null)
    or review_status <> 'approved_for_activation'
  ),
  check (
    review_status <> 'activated'
    or (activated_at is not null and activated_by_auth_user_id is not null and approval_request_id is not null)
  )
);

create index if not exists role_identity_backfill_reviews_status_idx
  on public.role_identity_backfill_reviews (review_status, updated_at desc);

create index if not exists role_identity_backfill_reviews_candidate_idx
  on public.role_identity_backfill_reviews (candidate_auth_user_id)
  where candidate_auth_user_id is not null;

alter table public.role_identity_backfill_reviews enable row level security;
revoke all on table public.role_identity_backfill_reviews from anon, authenticated;

-- ============================================================================
-- 2. Refresh candidate discovery. This is an UPSERT of a private review queue,
--    not an authorization write. It examines active legacy roles only and does
--    not change role status, user binding, or capability grants. If a candidate
--    or eligibility input changes after manual review begins, the queue is
--    marked `stale`; the reviewed candidate is preserved and cannot silently be
--    replaced by the discovery refresh.
-- ============================================================================
with normalized_roles as (
  select
    role_record.id as organization_role_id,
    role_record.auth_user_id as existing_auth_user_id,
    role_record.status as role_status,
    case
      when role_record.principal_email is null or btrim(role_record.principal_email) = '' then null
      else lower(btrim(role_record.principal_email))
    end as normalized_email
  from public.organization_roles as role_record
  where role_record.status = 'active'
), match_summary as (
  select
    normalized_role.organization_role_id,
    normalized_role.existing_auth_user_id,
    normalized_role.normalized_email,
    count(auth_user.id)::smallint as exact_auth_match_count,
    min(auth_user.id) filter (where auth_user.id is not null) as candidate_auth_user_id,
    bool_or(auth_user.email_confirmed_at is not null) as candidate_email_confirmed,
    bool_or(auth_user.banned_until is null or auth_user.banned_until <= timezone('utc', now())) as candidate_not_banned
  from normalized_roles as normalized_role
  left join auth.users as auth_user
    on normalized_role.normalized_email is not null
   and lower(btrim(auth_user.email)) = normalized_role.normalized_email
  group by normalized_role.organization_role_id, normalized_role.existing_auth_user_id, normalized_role.normalized_email
), discovery as (
  select
    summary.organization_role_id,
    case when summary.exact_auth_match_count = 1 then summary.candidate_auth_user_id else null end as candidate_auth_user_id,
    summary.exact_auth_match_count,
    case when summary.exact_auth_match_count = 1 then summary.candidate_email_confirmed else null end as candidate_email_confirmed,
    case when summary.exact_auth_match_count = 1 then summary.candidate_not_banned else null end as candidate_not_banned,
    case
      when summary.normalized_email is null then 'requires_email_correction'
      when summary.exact_auth_match_count = 0 then 'no_exact_auth_match'
      when summary.exact_auth_match_count > 1 then 'ambiguous_auth_match'
      when summary.candidate_email_confirmed is not true or summary.candidate_not_banned is not true then 'candidate_not_eligible'
      when summary.existing_auth_user_id is not null and summary.existing_auth_user_id = summary.candidate_auth_user_id then 'already_bound_same'
      when summary.existing_auth_user_id is not null and summary.existing_auth_user_id <> summary.candidate_auth_user_id then 'already_bound_conflict'
      else 'pending_identity_verification'
    end as review_status
  from match_summary as summary
)
insert into public.role_identity_backfill_reviews (
  organization_role_id,
  candidate_auth_user_id,
  discovered_candidate_auth_user_id,
  exact_auth_match_count,
  candidate_email_confirmed,
  candidate_not_banned,
  review_status
)
select
  organization_role_id,
  candidate_auth_user_id,
  candidate_auth_user_id,
  exact_auth_match_count,
  candidate_email_confirmed,
  candidate_not_banned,
  review_status
from discovery
on conflict (organization_role_id) do update
set candidate_auth_user_id = case
      when public.role_identity_backfill_reviews.review_status in ('pending_identity_verification', 'stale')
           and (
             public.role_identity_backfill_reviews.candidate_auth_user_id is distinct from excluded.candidate_auth_user_id
             or public.role_identity_backfill_reviews.exact_auth_match_count is distinct from excluded.exact_auth_match_count
             or public.role_identity_backfill_reviews.candidate_email_confirmed is distinct from excluded.candidate_email_confirmed
             or public.role_identity_backfill_reviews.candidate_not_banned is distinct from excluded.candidate_not_banned
           )
        then public.role_identity_backfill_reviews.candidate_auth_user_id
      else excluded.candidate_auth_user_id
    end,
    discovered_candidate_auth_user_id = excluded.discovered_candidate_auth_user_id,
    exact_auth_match_count = excluded.exact_auth_match_count,
    candidate_email_confirmed = excluded.candidate_email_confirmed,
    candidate_not_banned = excluded.candidate_not_banned,
    review_status = case
      when public.role_identity_backfill_reviews.review_status = 'pending_identity_verification'
           and (
             public.role_identity_backfill_reviews.candidate_auth_user_id is distinct from excluded.candidate_auth_user_id
             or public.role_identity_backfill_reviews.exact_auth_match_count is distinct from excluded.exact_auth_match_count
             or public.role_identity_backfill_reviews.candidate_email_confirmed is distinct from excluded.candidate_email_confirmed
             or public.role_identity_backfill_reviews.candidate_not_banned is distinct from excluded.candidate_not_banned
           )
        then 'stale'
      when public.role_identity_backfill_reviews.review_status = 'stale'
        then 'stale'
      else excluded.review_status
    end,
    candidate_changed_at = case
      when public.role_identity_backfill_reviews.candidate_auth_user_id is distinct from excluded.candidate_auth_user_id
        or public.role_identity_backfill_reviews.exact_auth_match_count is distinct from excluded.exact_auth_match_count
        or public.role_identity_backfill_reviews.candidate_email_confirmed is distinct from excluded.candidate_email_confirmed
        or public.role_identity_backfill_reviews.candidate_not_banned is distinct from excluded.candidate_not_banned
        then coalesce(public.role_identity_backfill_reviews.candidate_changed_at, timezone('utc', now()))
      else public.role_identity_backfill_reviews.candidate_changed_at
    end,
    discovery_refreshed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
where public.role_identity_backfill_reviews.review_status not in (
  'approved_for_activation', 'rejected', 'activated'
);

-- ============================================================================
-- 3. Private, non-PII review output. Use a protected server API to show the
--    associated role display information to an authorised reviewer. Do not send
--    this output to public logs or export it to unsecured spreadsheets.
-- ============================================================================
select
  review.id as review_id,
  review.organization_role_id,
  role_record.role,
  role_record.status as role_status,
  review.review_status,
  review.exact_auth_match_count,
  review.candidate_auth_user_id,
  review.discovered_candidate_auth_user_id,
  review.candidate_email_confirmed,
  review.candidate_not_banned,
  review.approval_request_id,
  review.candidate_changed_at,
  review.discovery_refreshed_at,
  review.updated_at
from public.role_identity_backfill_reviews as review
join public.organization_roles as role_record on role_record.id = review.organization_role_id
order by review.review_status, review.updated_at desc
limit 500;

-- ============================================================================
-- 4. Activation is intentionally absent. It must happen only through the
--    separately approved server workflow described in the companion runbook.
--    A `stale` review must be manually reopened by a protected review route
--    after fresh identity evidence is recorded; this dry run must never be
--    converted into an activation script.
-- ============================================================================
rollback;
