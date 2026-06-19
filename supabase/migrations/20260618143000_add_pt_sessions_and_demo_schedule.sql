create table if not exists public.pt_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  roster_id uuid not null references public.student_rosters(id) on delete cascade,
  student_user_id uuid,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (roster_id, scheduled_at)
);

alter table public.pt_sessions enable row level security;

drop policy if exists "pt_sessions_select_student_or_trainer" on public.pt_sessions;
create policy "pt_sessions_select_student_or_trainer" on public.pt_sessions
for select to authenticated using (
  auth.uid() = student_user_id
  or exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.user_id = auth.uid()
  )
);

drop policy if exists "pt_sessions_write_trainer" on public.pt_sessions;
create policy "pt_sessions_write_trainer" on public.pt_sessions
for all to authenticated using (
  exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.user_id = auth.uid()
  )
);

drop trigger if exists pt_sessions_touch on public.pt_sessions;
create trigger pt_sessions_touch before update on public.pt_sessions
for each row execute function public.touch_updated_at();

create index if not exists pt_sessions_student_idx on public.pt_sessions(student_user_id, scheduled_at);
create index if not exists pt_sessions_trainer_idx on public.pt_sessions(trainer_id, scheduled_at);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'selection_status') then
    create type public.selection_status as enum ('selected', 'unavailable', 'confirmed');
  end if;
end
$$;

create table if not exists public.student_selections (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.time_slots(id) on delete cascade,
  schedule_id uuid not null references public.weekly_schedules(id) on delete cascade,
  student_user_id uuid not null,
  student_name text not null,
  status public.selection_status not null default 'selected',
  created_at timestamptz not null default now()
);

alter table public.student_selections enable row level security;

drop policy if exists "selections_select_own_or_trainer" on public.student_selections;
create policy "selections_select_own_or_trainer" on public.student_selections
for select to authenticated using (
  auth.uid() = student_user_id
  or exists (
    select 1 from public.weekly_schedules s
    join public.trainer_profiles tp on tp.id = s.trainer_id
    where s.id = schedule_id and tp.user_id = auth.uid()
  )
);

drop policy if exists "selections_insert_own" on public.student_selections;
create policy "selections_insert_own" on public.student_selections
for insert to authenticated with check (auth.uid() = student_user_id);

drop policy if exists "selections_delete_own" on public.student_selections;
create policy "selections_delete_own" on public.student_selections
for delete to authenticated using (auth.uid() = student_user_id);

create index if not exists student_selections_schedule_idx on public.student_selections(schedule_id);
create index if not exists student_selections_slot_idx on public.student_selections(slot_id);

update public.student_rosters r
set student_user_id = u.id
from auth.users u
where lower(u.email) = lower(r.student_email)
  and r.student_user_id is distinct from u.id;

with rostered as (
  select r.*, row_number() over (order by r.student_name) as rn
  from public.student_rosters r
  where r.trainer_id = '0b8781ee-55af-489c-9737-a4b081f596f9'::uuid
    and r.student_name in ('김학생1', '김학생2', '김학생3', '김학생4', '김학생5')
), demo(day_offset, ordinal) as (
  values (-28, 1), (-14, 2), (7, 3), (14, 4)
)
insert into public.pt_sessions (
  trainer_id, roster_id, student_user_id, scheduled_at, status, note
)
select
  r.trainer_id,
  r.id,
  r.student_user_id,
  (current_date + demo.day_offset + make_interval(hours => 9 + ((r.rn::int + demo.ordinal) % 6) * 2))::timestamptz,
  case
    when demo.day_offset < 0 and r.rn = 3 and demo.ordinal = 2 then 'cancelled'
    when demo.day_offset < 0 then 'completed'
    else 'scheduled'
  end,
  case ((r.rn::int + demo.ordinal) % 5)
    when 0 then '상체: 가슴과 등'
    when 1 then '하체와 코어'
    when 2 then '자세 교정 및 스트레칭'
    when 3 then '유산소와 복근'
    else '전신 근력 루틴'
  end
from rostered r
cross join demo
on conflict (roster_id, scheduled_at) do update set
  student_user_id = excluded.student_user_id,
  status = excluded.status,
  note = excluded.note;

insert into public.trainer_profiles (user_id, display_name, gym_name, intro, instagram_url, avatar_url)
select user_id, name, gym, intro, instagram_url, avatar_url
from public.trainers
where id = '0b8781ee-55af-489c-9737-a4b081f596f9'::uuid
on conflict (user_id) do update set
  display_name = excluded.display_name,
  gym_name = excluded.gym_name,
  intro = excluded.intro,
  instagram_url = excluded.instagram_url,
  avatar_url = excluded.avatar_url;

insert into public.weekly_schedules (trainer_id, week_start, title, is_published)
select
  tp.id,
  date_trunc('week', current_date)::date + 7,
  '다음 주 PT 일정',
  true
from public.trainer_profiles tp
join public.trainers t on t.user_id = tp.user_id
where t.id = '0b8781ee-55af-489c-9737-a4b081f596f9'::uuid
on conflict (trainer_id, week_start) do nothing;

with target_schedule as (
  select id
  from public.weekly_schedules
  where trainer_id = (
      select tp.id from public.trainer_profiles tp
      join public.trainers t on t.user_id = tp.user_id
      where t.id = '0b8781ee-55af-489c-9737-a4b081f596f9'::uuid
    )
    and week_start = date_trunc('week', current_date)::date + 7
)
insert into public.time_slots (schedule_id, day_of_week, hour, capacity, is_available, is_closed)
select s.id, day_no, hour_no, 1, true, day_no = 6
from target_schedule s
cross join generate_series(0, 6) as day_no
cross join generate_series(6, 22) as hour_no
on conflict (schedule_id, day_of_week, hour) do nothing;

with target_schedule as (
  select id
  from public.weekly_schedules
  where trainer_id = (
      select tp.id from public.trainer_profiles tp
      join public.trainers t on t.user_id = tp.user_id
      where t.id = '0b8781ee-55af-489c-9737-a4b081f596f9'::uuid
    )
    and week_start = date_trunc('week', current_date)::date + 7
), rostered as (
  select r.*, row_number() over (order by r.student_name) as rn
  from public.student_rosters r
  where r.trainer_id = '0b8781ee-55af-489c-9737-a4b081f596f9'::uuid
    and r.student_name in ('김학생1', '김학생2', '김학생3', '김학생4', '김학생5')
    and r.student_user_id is not null
), choices(choice_no) as (values (1), (2), (3))
insert into public.student_selections (
  slot_id, schedule_id, student_user_id, student_name, status
)
select
  ts.id,
  s.id,
  r.student_user_id,
  r.student_name,
  'selected'::public.selection_status
from target_schedule s
cross join rostered r
cross join choices c
join public.time_slots ts on ts.schedule_id = s.id
  and ts.day_of_week = ((r.rn::int + c.choice_no * 2 - 1) % 6)
  and ts.hour = (array[7, 9, 11, 14, 17, 19, 20])[((r.rn::int + c.choice_no - 2) % 7) + 1]
where not exists (
  select 1 from public.student_selections existing
  where existing.schedule_id = s.id
    and existing.student_user_id = r.student_user_id
    and existing.slot_id = ts.id
);

select pg_notify('pgrst', 'reload schema');
