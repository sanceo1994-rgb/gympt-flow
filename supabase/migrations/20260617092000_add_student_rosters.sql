create table if not exists public.student_rosters (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  student_user_id uuid,
  student_name text not null,
  student_email text not null,
  student_phone text,
  remaining_sessions smallint not null default 0,
  total_sessions smallint not null default 0,
  status text not null default 'pending' check (status in ('pending','active')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trainer_id, student_email)
);

alter table public.student_rosters enable row level security;

drop policy if exists "student_rosters_select_related" on public.student_rosters;
create policy "student_rosters_select_related" on public.student_rosters
  for select to authenticated
  using (
    student_user_id = auth.uid()
    or lower(student_email) = lower(coalesce(auth.email(), ''))
    or exists (
      select 1
      from public.trainers t
      where t.id = trainer_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "student_rosters_insert_trainer" on public.student_rosters;
create policy "student_rosters_insert_trainer" on public.student_rosters
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.trainers t
      where t.id = trainer_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "student_rosters_update_trainer_or_student" on public.student_rosters;
create policy "student_rosters_update_trainer_or_student" on public.student_rosters
  for update to authenticated
  using (
    exists (
      select 1
      from public.trainers t
      where t.id = trainer_id and t.user_id = auth.uid()
    )
    or lower(student_email) = lower(coalesce(auth.email(), ''))
  )
  with check (
    exists (
      select 1
      from public.trainers t
      where t.id = trainer_id and t.user_id = auth.uid()
    )
    or lower(student_email) = lower(coalesce(auth.email(), ''))
  );

drop policy if exists "student_rosters_delete_trainer" on public.student_rosters;
create policy "student_rosters_delete_trainer" on public.student_rosters
  for delete to authenticated
  using (
    exists (
      select 1
      from public.trainers t
      where t.id = trainer_id and t.user_id = auth.uid()
    )
  );

drop trigger if exists student_rosters_touch on public.student_rosters;
create trigger student_rosters_touch before update on public.student_rosters
  for each row execute function public.touch_updated_at();

create index if not exists student_rosters_trainer_idx on public.student_rosters(trainer_id);
create index if not exists student_rosters_student_user_idx on public.student_rosters(student_user_id);
create index if not exists student_rosters_student_email_idx on public.student_rosters(lower(student_email));
