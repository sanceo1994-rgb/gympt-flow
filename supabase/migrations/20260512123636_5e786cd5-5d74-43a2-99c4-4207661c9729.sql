-- Trainers profile (one per trainer user)
create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  name text not null,
  gym text,
  intro text,
  instagram_url text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trainers enable row level security;

create policy "trainers_select_all" on public.trainers for select using (true);
create policy "trainers_insert_own" on public.trainers for insert to authenticated with check (auth.uid() = user_id);
create policy "trainers_update_own" on public.trainers for update to authenticated using (auth.uid() = user_id);
create policy "trainers_delete_own" on public.trainers for delete to authenticated using (auth.uid() = user_id);

create trigger trainers_touch before update on public.trainers
  for each row execute function public.touch_updated_at();

-- Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

create policy "announcements_select_all" on public.announcements for select using (true);
create policy "announcements_insert_own" on public.announcements for insert to authenticated
  with check (exists (select 1 from public.trainers t where t.id = trainer_id and t.user_id = auth.uid()));
create policy "announcements_update_own" on public.announcements for update to authenticated
  using (exists (select 1 from public.trainers t where t.id = trainer_id and t.user_id = auth.uid()));
create policy "announcements_delete_own" on public.announcements for delete to authenticated
  using (exists (select 1 from public.trainers t where t.id = trainer_id and t.user_id = auth.uid()));

-- Weekly schedules (one per trainer per week)
create table public.weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (trainer_id, week_start)
);
alter table public.weekly_schedules enable row level security;

create policy "schedules_select_all" on public.weekly_schedules for select using (true);
create policy "schedules_insert_own" on public.weekly_schedules for insert to authenticated
  with check (exists (select 1 from public.trainers t where t.id = trainer_id and t.user_id = auth.uid()));
create policy "schedules_update_own" on public.weekly_schedules for update to authenticated
  using (exists (select 1 from public.trainers t where t.id = trainer_id and t.user_id = auth.uid()));
create policy "schedules_delete_own" on public.weekly_schedules for delete to authenticated
  using (exists (select 1 from public.trainers t where t.id = trainer_id and t.user_id = auth.uid()));

-- Time slots
create table public.time_slots (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.weekly_schedules(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  hour smallint not null check (hour between 0 and 23),
  capacity smallint not null default 1,
  is_closed boolean not null default false,
  unique (schedule_id, day_of_week, hour)
);
alter table public.time_slots enable row level security;

create policy "slots_select_all" on public.time_slots for select using (true);
create policy "slots_write_own" on public.time_slots for all to authenticated
  using (exists (select 1 from public.weekly_schedules s join public.trainers t on t.id = s.trainer_id
    where s.id = schedule_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.weekly_schedules s join public.trainers t on t.id = s.trainer_id
    where s.id = schedule_id and t.user_id = auth.uid()));

-- Student selections
create type public.selection_status as enum ('selected','unavailable','confirmed');

create table public.student_selections (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.time_slots(id) on delete cascade,
  schedule_id uuid not null references public.weekly_schedules(id) on delete cascade,
  student_user_id uuid not null,
  student_name text not null,
  status public.selection_status not null default 'selected',
  created_at timestamptz not null default now()
);
alter table public.student_selections enable row level security;

create policy "selections_select_own_or_trainer" on public.student_selections for select to authenticated
  using (
    auth.uid() = student_user_id
    or exists (select 1 from public.weekly_schedules s join public.trainers t on t.id = s.trainer_id
      where s.id = schedule_id and t.user_id = auth.uid())
  );
create policy "selections_insert_own" on public.student_selections for insert to authenticated
  with check (auth.uid() = student_user_id);
create policy "selections_delete_own" on public.student_selections for delete to authenticated
  using (auth.uid() = student_user_id);

create index student_selections_schedule_idx on public.student_selections(schedule_id);
create index student_selections_slot_idx on public.student_selections(slot_id);
create index time_slots_schedule_idx on public.time_slots(schedule_id);