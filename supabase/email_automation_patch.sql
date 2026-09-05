-- HMSI email automation foundation
-- Additive and reversible. No messages are sent by this migration.
-- Delivery defaults to draft mode until an administrator changes the config explicitly.

begin;

create table if not exists public.email_automation_config (
  id boolean primary key default true check (id),
  mode text not null default 'draft' check (mode in ('draft', 'live', 'paused')),
  transactional_enabled boolean not null default false,
  marketing_enabled boolean not null default false,
  abandoned_donation_enabled boolean not null default false,
  recurring_donor_enabled boolean not null default false,
  max_batch_size integer not null default 50 check (max_batch_size between 1 and 100),
  updated_by text,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.email_automation_config (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.email_contacts (
  id uuid primary key default gen_random_uuid(),
  email varchar(320) not null unique check (email = lower(email)),
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  display_name varchar(160),
  role text check (role is null or role in ('admin', 'worker', 'volunteer', 'member', 'donor', 'subscriber')),
  transactional_opt_in boolean not null default true,
  marketing_opt_in boolean not null default false,
  consent_source text,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  suppressed_at timestamptz,
  suppression_reason varchar(80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (suppressed_at is null or suppression_reason is not null),
  check (unsubscribed_at is null or marketing_opt_in = false)
);

create table if not exists public.email_templates (
  key text primary key,
  display_name varchar(180) not null,
  delivery_class text not null check (delivery_class in ('transactional', 'marketing')),
  subject_template varchar(240) not null,
  text_template text not null,
  html_template text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'disabled')),
  requires_consent boolean not null default false,
  requires_admin_approval boolean not null default true,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  idempotency_key varchar(240) not null unique,
  template_key text not null references public.email_templates(key) on delete restrict,
  delivery_class text not null check (delivery_class in ('transactional', 'marketing')),
  recipient_email varchar(320) not null check (recipient_email = lower(recipient_email)),
  recipient_name varchar(160),
  subject varchar(240) not null,
  text_body text not null,
  html_body text not null,
  source_type varchar(80),
  source_id varchar(180),
  status text not null default 'draft' check (status in ('draft', 'queued', 'sending', 'sent', 'failed', 'suppressed', 'cancelled')),
  scheduled_for timestamptz,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 10),
  provider_message_id varchar(240),
  last_error varchar(1000),
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.email_outbox(id) on delete restrict,
  provider text not null default 'resend',
  provider_event_id varchar(240) not null unique,
  event_type text not null check (event_type in ('sent', 'delivered', 'bounced', 'failed', 'suppressed', 'complained', 'opened', 'clicked')),
  occurred_at timestamptz not null default timezone('utc', now()),
  safe_metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.donation_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  checkout_reference varchar(180) not null unique,
  donor_email varchar(320) not null check (donor_email = lower(donor_email)),
  donor_name varchar(160),
  fundraiser_id text references public.fundraisers(id) on delete set null,
  amount_major numeric(14, 2) check (amount_major is null or amount_major > 0),
  currency varchar(3) not null default 'NGN' check (currency in ('NGN', 'USD')),
  status text not null default 'started' check (status in ('started', 'completed', 'abandoned', 'cancelled')),
  marketing_opt_in boolean not null default false,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  abandoned_at timestamptz,
  followup_1h_outbox_id uuid references public.email_outbox(id) on delete set null,
  followup_24h_outbox_id uuid references public.email_outbox(id) on delete set null,
  check (status <> 'completed' or completed_at is not null),
  check (status <> 'abandoned' or abandoned_at is not null)
);

create table if not exists public.recurring_donor_preferences (
  id uuid primary key default gen_random_uuid(),
  donor_email varchar(320) not null unique check (donor_email = lower(donor_email)),
  provider text not null check (provider in ('paystack', 'flutterwave', 'stripe', 'manual')),
  provider_subscription_reference varchar(180) unique,
  currency varchar(3) not null default 'NGN' check (currency in ('NGN', 'USD')),
  active boolean not null default true,
  stewardship_opt_in boolean not null default false,
  consent_source text,
  consented_at timestamptz,
  cancelled_at timestamptz,
  last_stewardship_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (stewardship_opt_in = false or consented_at is not null)
);

alter table public.newsletter_subscribers
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists consent_source text,
  add column if not exists consented_at timestamptz,
  add column if not exists last_marketing_sent_at timestamptz;

-- Existing subscribers are not silently opted in. New or re-confirmed subscribers
-- must carry explicit consent before a marketing broadcast can be queued.

insert into public.email_templates (key, display_name, delivery_class, subject_template, text_template, html_template, requires_consent, requires_admin_approval)
values
  ('onboarding_access', 'Onboarding access and password setup', 'transactional', 'Your HMSI portal access is ready', 'Hello {{name}}, your HMSI portal access is ready. Open {{portal_url}}.', '<p>Hello {{name}},</p><p>Your HMSI portal access is ready. Open <a href="{{portal_url}}">your portal</a>.</p>', false, false),
  ('volunteer_approval', 'Volunteer application approved', 'transactional', 'Your HMSI volunteer application is approved', 'Hello {{name}}, your volunteer application has been approved. Open {{portal_url}}.', '<p>Hello {{name}},</p><p>Your volunteer application has been approved. Open <a href="{{portal_url}}">your portal</a>.</p>', false, false),
  ('task_assignment', 'Task assignment and action link', 'transactional', 'A new HMSI task is ready', 'Hello {{name}}, a new HMSI task is ready. Open {{task_url}}.', '<p>Hello {{name}},</p><p>A new HMSI task is ready. Open <a href="{{task_url}}">the task</a>.</p>', false, false),
  ('task_reminder', 'Task reminder', 'transactional', 'Reminder: HMSI task requires attention', 'Hello {{name}}, your HMSI task requires attention. Open {{task_url}}.', '<p>Hello {{name}},</p><p>Your HMSI task requires attention. Open <a href="{{task_url}}">the task</a>.</p>', false, false),
  ('task_completion', 'Task completion acknowledgement', 'transactional', 'HMSI task update received', 'Thank you, {{name}}. Your submission was received and is awaiting review.', '<p>Thank you, {{name}}. Your submission was received and is awaiting review.</p>', false, false),
  ('editorial_decision', 'Editorial review decision', 'transactional', 'Update on your HMSI dispatch', 'Hello {{name}}, there is an update on your HMSI dispatch. Open {{workspace_url}}.', '<p>Hello {{name}},</p><p>There is an update on your HMSI dispatch. Open <a href="{{workspace_url}}">the workspace</a>.</p>', false, false),
  ('donation_receipt', 'Verified donation receipt', 'transactional', 'Thank you for supporting HMSI — {{reference_suffix}}', 'Thank you for your verified donation of {{amount}} to HMSI. Receipt reference: {{reference_suffix}}.', '<p>Thank you for your verified donation of <strong>{{amount}}</strong> to HMSI.</p><p>Receipt reference: {{reference_suffix}}.</p>', false, false),
  ('abandoned_donation_followup', 'Abandoned donation follow-up', 'marketing', 'Your HMSI donation page is still available', 'You started a donation to HMSI. If you still wish to continue, visit {{donation_url}}. Unsubscribe: {{unsubscribe_url}}.', '<p>You started a donation to HMSI. If you still wish to continue, visit <a href="{{donation_url}}">the donation page</a>.</p><p><a href="{{unsubscribe_url}}">Unsubscribe from follow-ups</a>.</p>', true, true),
  ('recurring_donor_stewardship', 'Recurring donor stewardship update', 'marketing', 'HMSI recurring donor update', 'Thank you for your continuing support of HMSI. Review your donor preferences at {{preferences_url}}. Unsubscribe: {{unsubscribe_url}}.', '<p>Thank you for your continuing support of HMSI.</p><p>Review your <a href="{{preferences_url}}">donor preferences</a> or <a href="{{unsubscribe_url}}">unsubscribe</a>.</p>', true, true),
  ('newsletter_launch', 'Approved HMSI newsletter', 'marketing', '{{newsletter_subject}}', '{{newsletter_body}}\n\nUnsubscribe: {{unsubscribe_url}}', '<div>{{newsletter_html}}</div><p><a href="{{unsubscribe_url}}">Unsubscribe</a>.</p>', true, true),
  ('operations_alert', 'Operational alert', 'transactional', '[HMSI Operations] {{alert_title}}', '{{alert_summary}} Open {{portal_url}}.', '<p><strong>{{alert_title}}</strong></p><p>{{alert_summary}}</p><p><a href="{{portal_url}}">Open the HMSI administration portal</a>.</p>', false, true)
on conflict (key) do nothing;

create index if not exists email_contacts_marketing_idx on public.email_contacts (marketing_opt_in, unsubscribed_at, suppressed_at);
create index if not exists email_outbox_due_idx on public.email_outbox (status, scheduled_for, created_at);
create index if not exists email_outbox_source_idx on public.email_outbox (source_type, source_id);
create index if not exists email_delivery_events_outbox_idx on public.email_delivery_events (outbox_id, occurred_at desc);
create index if not exists donation_checkout_abandonment_idx on public.donation_checkout_sessions (status, started_at);
create index if not exists recurring_donor_active_idx on public.recurring_donor_preferences (active, stewardship_opt_in);

alter table public.email_automation_config enable row level security;
alter table public.email_contacts enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_delivery_events enable row level security;
alter table public.donation_checkout_sessions enable row level security;
alter table public.recurring_donor_preferences enable row level security;
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Service role manages email automation config" on public.email_automation_config;
create policy "Service role manages email automation config" on public.email_automation_config for all to service_role using (true) with check (true);
drop policy if exists "Service role manages email contacts" on public.email_contacts;
create policy "Service role manages email contacts" on public.email_contacts for all to service_role using (true) with check (true);
drop policy if exists "Service role manages email templates" on public.email_templates;
create policy "Service role manages email templates" on public.email_templates for all to service_role using (true) with check (true);
drop policy if exists "Service role manages email outbox" on public.email_outbox;
create policy "Service role manages email outbox" on public.email_outbox for all to service_role using (true) with check (true);
drop policy if exists "Service role manages email delivery events" on public.email_delivery_events;
create policy "Service role manages email delivery events" on public.email_delivery_events for all to service_role using (true) with check (true);
drop policy if exists "Service role manages donation checkout sessions" on public.donation_checkout_sessions;
create policy "Service role manages donation checkout sessions" on public.donation_checkout_sessions for all to service_role using (true) with check (true);
drop policy if exists "Service role manages recurring donor preferences" on public.recurring_donor_preferences;
create policy "Service role manages recurring donor preferences" on public.recurring_donor_preferences for all to service_role using (true) with check (true);

commit;
