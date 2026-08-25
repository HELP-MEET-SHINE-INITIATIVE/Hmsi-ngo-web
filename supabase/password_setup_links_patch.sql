create table if not exists public.password_setup_links (
  id uuid primary key default gen_random_uuid(),
  onboarding_invitation_id uuid not null references public.onboarding_invitations(id) on delete cascade,
  hmsi_id_card_id uuid not null references public.hmsi_id_cards(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  email_sent_at timestamptz,
  setup_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_setup_links_invitation_idx on public.password_setup_links(onboarding_invitation_id, expires_at desc);
alter table public.password_setup_links enable row level security;
