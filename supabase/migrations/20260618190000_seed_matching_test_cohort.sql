-- Current symnrjcgtltcgizwbaax relationships:
-- auth.users -> trainers.user_id -> student_rosters.trainer_id
-- auth.users -> trainer_profiles.user_id -> weekly_schedules.trainer_id
--
-- This migration only upserts the dedicated @gympt.test cohort. It does not
-- delete or rewrite production trainers, rosters, schedules, or selections.

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
create index if not exists student_selections_schedule_idx on public.student_selections(schedule_id);
create index if not exists student_selections_slot_idx on public.student_selections(slot_id);

do $$
declare
  v_trainer_user_id uuid;
  v_trainer_id uuid;
  v_trainer_profile_id uuid;
  v_schedule_id uuid;
  v_week_start date := date_trunc('week', current_date)::date + 7;
begin
  select id into v_trainer_user_id
  from auth.users
  where lower(email) = 'trainer1@gympt.test'
  limit 1;

  if v_trainer_user_id is null then
    raise exception 'Matching test trainer account trainer1@gympt.test does not exist';
  end if;

  insert into public.trainers (
    user_id, name, gym, intro, theme_from, theme_to
  ) values (
    v_trainer_user_id,
    '김산',
    'GymPT 테스트 센터',
    '최대 인원 자동 배정 검증용 테스트 트레이너',
    '#FF008C',
    '#FF6FB1'
  )
  on conflict (user_id) do update set
    name = excluded.name,
    gym = excluded.gym,
    intro = excluded.intro,
    theme_from = excluded.theme_from,
    theme_to = excluded.theme_to
  returning id into v_trainer_id;

  insert into public.user_roles (user_id, role)
  values (v_trainer_user_id, 'trainer'::public.app_role)
  on conflict (user_id, role) do nothing;

  insert into public.trainer_profiles (
    user_id, display_name, gym_name, intro
  ) values (
    v_trainer_user_id,
    '김산',
    'GymPT 테스트 센터',
    '최대 인원 자동 배정 검증용 테스트 트레이너'
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    gym_name = excluded.gym_name,
    intro = excluded.intro
  returning id into v_trainer_profile_id;

  insert into public.weekly_schedules (trainer_id, week_start)
  values (v_trainer_profile_id, v_week_start)
  on conflict (trainer_id, week_start) do update set
    week_start = excluded.week_start
  returning id into v_schedule_id;

  insert into public.time_slots (
    schedule_id, day_of_week, hour, capacity, is_closed
  )
  select
    v_schedule_id,
    day_no,
    hour_no,
    1,
    day_no = 6
  from generate_series(0, 6) as day_no
  cross join generate_series(6, 22) as hour_no
  on conflict (schedule_id, day_of_week, hour) do update set
    capacity = excluded.capacity,
    is_closed = excluded.is_closed;

  -- Five responders, one unavailable student, and two pending students.
  -- The first five choices intentionally contain scarce-slot conflicts so the
  -- later maximum-matching test can distinguish it from a greedy assignment.
  insert into public.student_rosters (
    trainer_id,
    student_user_id,
    student_name,
    student_email,
    student_phone,
    remaining_sessions,
    total_sessions,
    status,
    memo
  )
  select
    v_trainer_id,
    u.id,
    seed.student_name,
    seed.student_email,
    seed.student_phone,
    seed.remaining_sessions,
    seed.total_sessions,
    'active',
    seed.memo
  from (
    values
      ('김지원', 'student1@gympt.test', '010-9000-0001', 14, 30, '복수 선택 · 유연한 회원'),
      ('박서윤', 'student2@gympt.test', '010-9000-0002', 7, 20, '월 19시만 가능한 희소 슬롯 회원'),
      ('최유나', 'student3@gympt.test', '010-9000-0003', 22, 40, '복수 선택 · 유연한 회원'),
      ('정수민', 'student4@gympt.test', '010-9000-0004', 3, 20, '화 7시만 가능한 희소 슬롯 회원'),
      ('한승호', 'student5@gympt.test', '010-9000-0005', 11, 24, '수 19시 또는 금 19시'),
      ('오지훈', 'student6@gympt.test', '010-9000-0006', 8, 20, '이번 주 PT 불가')
  ) as seed(student_name, student_email, student_phone, remaining_sessions, total_sessions, memo)
  join auth.users u on lower(u.email) = lower(seed.student_email)
  on conflict (trainer_id, student_email) do update set
    student_user_id = excluded.student_user_id,
    student_name = excluded.student_name,
    student_phone = excluded.student_phone,
    remaining_sessions = excluded.remaining_sessions,
    total_sessions = excluded.total_sessions,
    status = excluded.status,
    memo = excluded.memo;

  insert into public.student_rosters (
    trainer_id,
    student_user_id,
    student_name,
    student_email,
    student_phone,
    remaining_sessions,
    total_sessions,
    status,
    memo
  ) values
    (v_trainer_id, null, '김태현', 'pending.taehyun@gympt.test', null, 9, 20, 'pending', '응답 대기 시나리오'),
    (v_trainer_id, null, '윤서아', 'pending.seoa@gympt.test', null, 4, 10, 'pending', '응답 대기 시나리오')
  on conflict (trainer_id, student_email) do update set
    student_name = excluded.student_name,
    remaining_sessions = excluded.remaining_sessions,
    total_sessions = excluded.total_sessions,
    status = excluded.status,
    memo = excluded.memo;

  delete from public.student_selections
  where schedule_id = v_schedule_id
    and student_name in ('김지원', '박서윤', '최유나', '정수민', '한승호', '오지훈');

  with choices(student_email, student_name, day_of_week, hour) as (
    values
      ('student1@gympt.test', '김지원', 0, 19),
      ('student1@gympt.test', '김지원', 0, 20),
      ('student2@gympt.test', '박서윤', 0, 19),
      ('student3@gympt.test', '최유나', 1, 7),
      ('student3@gympt.test', '최유나', 2, 19),
      ('student4@gympt.test', '정수민', 1, 7),
      ('student5@gympt.test', '한승호', 2, 19),
      ('student5@gympt.test', '한승호', 4, 19)
  )
  insert into public.student_selections (
    slot_id, schedule_id, student_user_id, student_name, status
  )
  select
    slot.id,
    v_schedule_id,
    student.id,
    choice.student_name,
    'selected'::public.selection_status
  from choices choice
  join auth.users student on lower(student.email) = lower(choice.student_email)
  join public.time_slots slot
    on slot.schedule_id = v_schedule_id
   and slot.day_of_week = choice.day_of_week
   and slot.hour = choice.hour;

  insert into public.student_selections (
    slot_id, schedule_id, student_user_id, student_name, status
  )
  select
    null,
    v_schedule_id,
    student.id,
    '오지훈',
    'unavailable'::public.selection_status
  from auth.users student
  where lower(student.email) = 'student6@gympt.test';
end
$$;

-- Replace the profile-based policy from the earlier compatibility migration.
drop policy if exists "selections_select_own_or_trainer" on public.student_selections;
create policy "selections_select_own_or_trainer" on public.student_selections
for select to authenticated using (
  auth.uid() = student_user_id
  or exists (
    select 1
    from public.weekly_schedules schedule
    join public.trainer_profiles trainer on trainer.id = schedule.trainer_id
    where schedule.id = schedule_id
      and trainer.user_id = auth.uid()
  )
);

drop policy if exists "selections_insert_own" on public.student_selections;
create policy "selections_insert_own" on public.student_selections
for insert to authenticated with check (auth.uid() = student_user_id);

drop policy if exists "selections_delete_own" on public.student_selections;
create policy "selections_delete_own" on public.student_selections
for delete to authenticated using (auth.uid() = student_user_id);
