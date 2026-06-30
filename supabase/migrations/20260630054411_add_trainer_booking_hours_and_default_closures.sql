-- Trainer-configurable operating hours (everyone) and recurring default-
-- closed time slots (Basic plan and above). Both are applied once, at the
-- moment a week's time_slots grid is first created (schedule.tsx /
-- booking.tsx ensureBookingSchedule), so a trainer who sets these up never
-- has to re-close the same cells every time they send a new week's request.
alter table public.trainer_profiles
  add column if not exists booking_start_hour smallint not null default 6
    check (booking_start_hour >= 0 and booking_start_hour <= 24),
  add column if not exists booking_end_hour smallint not null default 22
    check (booking_end_hour >= 0 and booking_end_hour <= 24);

create table if not exists public.trainer_default_closed_slots (
  id uuid primary key default gen_random_uuid(),
  trainer_profile_id uuid not null references public.trainer_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  hour smallint not null check (hour between 0 and 23),
  created_at timestamptz not null default now(),
  unique (trainer_profile_id, day_of_week, hour)
);

alter table public.trainer_default_closed_slots enable row level security;

create index if not exists trainer_default_closed_slots_profile_idx
  on public.trainer_default_closed_slots(trainer_profile_id);

-- Students need to read this (via trainer_profiles) so booking.tsx can build
-- a new week's grid with the right cells pre-closed before the trainer has
-- ever visited /schedule for that week.
drop policy if exists "trainer_default_closed_slots_select_all" on public.trainer_default_closed_slots;
create policy "trainer_default_closed_slots_select_all" on public.trainer_default_closed_slots
  for select to authenticated
  using (true);

drop policy if exists "trainer_default_closed_slots_owner_write" on public.trainer_default_closed_slots;
create policy "trainer_default_closed_slots_owner_write" on public.trainer_default_closed_slots
  for all to authenticated
  using (
    exists (
      select 1 from public.trainer_profiles tp
      where tp.id = trainer_default_closed_slots.trainer_profile_id
        and tp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trainer_profiles tp
      where tp.id = trainer_default_closed_slots.trainer_profile_id
        and tp.user_id = auth.uid()
    )
  );
