-- Additive notification metadata for assignment-triggered worker emails.
alter table public.work_assignments add column if not exists idempotency_key varchar(180);
alter table public.work_assignments add column if not exists notification_status varchar(24) not null default 'not_sent' check (notification_status in ('not_sent', 'sent', 'failed', 'not_configured'));
alter table public.work_assignments add column if not exists notification_message_id varchar(200);
alter table public.work_assignments add column if not exists notification_sent_at timestamptz;
alter table public.work_assignments add column if not exists notification_error text;
create unique index if not exists work_assignments_idempotency_key_uidx on public.work_assignments(idempotency_key) where idempotency_key is not null;
