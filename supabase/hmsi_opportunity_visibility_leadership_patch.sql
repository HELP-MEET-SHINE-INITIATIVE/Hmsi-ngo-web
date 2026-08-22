-- HMSI opportunity visibility and leadership pathways patch.
-- Apply after role_opportunities_community_patch.sql and the HMSI school/member patches.

alter table public.opportunities add column if not exists category varchar(32) not null default 'general';
alter table public.opportunities add column if not exists eligibility_note text;
alter table public.opportunities add column if not exists requires_hmsi_certificate boolean not null default false;
alter table public.opportunities add column if not exists member_visible boolean not null default false;

alter table public.opportunities drop constraint if exists opportunities_category_check;
alter table public.opportunities add constraint opportunities_category_check
  check (category in ('general', 'core_studies', 'leadership'));

-- Member expressions of interest may rely on their approved email record when a phone number
-- has not yet been collected. Public volunteer/worker applications still validate phone input.
alter table public.opportunity_applications alter column applicant_phone drop not null;
alter table public.opportunity_applications drop constraint if exists opportunity_applications_applicant_role_check;
alter table public.opportunity_applications add constraint opportunity_applications_applicant_role_check
  check (applicant_role in ('volunteer', 'worker', 'member'));

create index if not exists opportunities_dashboard_visibility_idx
  on public.opportunities (status, member_visible, category, starts_at);
create index if not exists opportunity_applications_role_status_idx
  on public.opportunity_applications (applicant_role, status, created_at desc);

-- Existing opportunities remain general and do not become member-visible implicitly.
update public.opportunities
set category = coalesce(category, 'general'),
    eligibility_note = coalesce(eligibility_note, 'Open to applicants whose skills match the stated HMSI role. Final review and any assignment remain administrator-controlled.'),
    requires_hmsi_certificate = coalesce(requires_hmsi_certificate, false),
    member_visible = coalesce(member_visible, false)
where category is null or eligibility_note is null;

insert into public.opportunities
  (title, description, audience, location, starts_at, status, created_by, category, eligibility_note, requires_hmsi_certificate, member_visible)
select
  'HMSI Core Studies and Programme Support Volunteer',
  'Support approved HMSI learning resources, evidence registers, programme research, and supervised study groups. This is an HMSI service-learning pathway, not an academic degree, professional licence, or promise of paid work.',
  'both',
  'Nigeria and Africa',
  timezone('utc', now()),
  'open',
  'admin@hmsi.org.ng',
  'core_studies',
  'Open to approved volunteers, active successfully onboarded workers, and approved members after administrator review. Participation does not create employment or an automatic assignment.',
  false,
  true
where not exists (select 1 from public.opportunities where title = 'HMSI Core Studies and Programme Support Volunteer');

insert into public.opportunities
  (title, description, audience, location, starts_at, status, created_by, category, eligibility_note, requires_hmsi_certificate, member_visible)
select
  'HMSI Regional Programme Leadership Interest',
  'Expression-of-interest pathway for supervised regional coordination, safeguarding follow-up, volunteer support, and programme reporting. Final leadership appointment requires administrator review, role clarity, safeguarding checks, and an approved task or assignment.',
  'volunteer',
  'Nigeria and Africa',
  timezone('utc', now()),
  'open',
  'admin@hmsi.org.ng',
  'leadership',
  'For approved HMSI members or volunteers who have successfully completed the HMSI Human Rights & Humanitarian Service School and obtained a valid HMSI certificate of completion. The certificate is an HMSI completion credential only and is not an external accreditation or professional licence.',
  true,
  true
where not exists (select 1 from public.opportunities where title = 'HMSI Regional Programme Leadership Interest');

insert into public.opportunities
  (title, description, audience, location, starts_at, status, created_by, category, eligibility_note, requires_hmsi_certificate, member_visible)
select
  'HMSI Safeguarding and Volunteer Team Leadership Interest',
  'Expression-of-interest pathway for supervised safeguarding culture, volunteer coordination, moderation escalation, and safe service practice. No applicant may independently investigate cases, disclose private information, or appoint themselves to leadership.',
  'volunteer',
  'Nigeria and Africa',
  timezone('utc', now()),
  'open',
  'admin@hmsi.org.ng',
  'leadership',
  'For approved HMSI members or volunteers with a valid HMSI school completion certificate, subject to administrator review, safeguarding suitability checks, and explicit task allocation. Completion credentials do not guarantee appointment.',
  true,
  true
where not exists (select 1 from public.opportunities where title = 'HMSI Safeguarding and Volunteer Team Leadership Interest');
