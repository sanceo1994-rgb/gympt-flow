-- One-time SMS verification codes (Aligo). Only ever touched by server
-- functions using the service role, so no client-facing RLS policy is
-- granted. RLS stays enabled with zero policies, blocking anon/authenticated
-- access entirely.
create table if not exists public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists phone_otps_phone_created_idx
  on public.phone_otps (phone, created_at desc);

alter table public.phone_otps enable row level security;
