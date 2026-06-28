-- The original points table from 20260512065037 is recorded as applied in
-- migration history, but PostgREST returns PGRST205 ("could not find the
-- table 'public.points' in the schema cache") on the live database, meaning
-- the table itself never actually exists there. Recreate it idempotently so
-- student point accrual (booking.tsx, RightRail.tsx) stops failing.
create table if not exists public.points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  reason text not null,
  week_start date not null,
  created_at timestamptz not null default now()
);
alter table public.points enable row level security;
create index if not exists points_user_week_idx on public.points(user_id, week_start);

drop policy if exists "points_select_own" on public.points;
create policy "points_select_own" on public.points for select to authenticated using (auth.uid() = user_id);

drop policy if exists "points_insert_own" on public.points;
create policy "points_insert_own" on public.points for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.get_week_points(_user_id uuid, _week_start date)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::int from public.points where user_id = _user_id and week_start = _week_start;
$$;
