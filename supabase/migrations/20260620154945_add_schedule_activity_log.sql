-- Trainer-side actions (bulk confirm notifications, manual moves) only ever
-- lived in React state, so the "최근 활동" feed lost them on every refresh.
-- Student-driven activity (picks/unavailable) survives because it's derived
-- live from student_selections; this table gives the trainer-driven half the
-- same durability.
create table if not exists public.schedule_activity_log (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.weekly_schedules(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  kind text not null check (kind in ('confirm', 'manual')),
  who text,
  day text,
  hour int,
  count int,
  created_at timestamptz not null default now()
);

alter table public.schedule_activity_log enable row level security;

drop policy if exists "activity_log_select_trainer" on public.schedule_activity_log;
create policy "activity_log_select_trainer" on public.schedule_activity_log
for select to authenticated using (
  exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.user_id = auth.uid()
  )
);

drop policy if exists "activity_log_insert_trainer" on public.schedule_activity_log;
create policy "activity_log_insert_trainer" on public.schedule_activity_log
for insert to authenticated with check (
  exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.user_id = auth.uid()
  )
);

create index if not exists schedule_activity_log_schedule_idx
  on public.schedule_activity_log(schedule_id, created_at desc);

select pg_notify('pgrst', 'reload schema');
