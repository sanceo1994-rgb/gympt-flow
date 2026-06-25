-- 20260619120000 added insert-only policies so a registered student could
-- bootstrap a missing weekly_schedules/time_slots row. Those policies compared
-- weekly_schedules.trainer_id directly against student_rosters.trainer_id, but
-- on the live schema weekly_schedules.trainer_id actually references
-- trainer_profiles(id), not trainers(id) — so the comparison could never match
-- and the policies were a silent no-op. Replace them with the correct join
-- through trainer_profiles.user_id -> trainers.user_id -> student_rosters.

drop policy if exists "schedules_insert_student" on public.weekly_schedules;
create policy "schedules_insert_student" on public.weekly_schedules
for insert to authenticated
with check (
  exists (
    select 1
    from public.trainer_profiles tp
    join public.trainers t on t.user_id = tp.user_id
    join public.student_rosters r on r.trainer_id = t.id
    where tp.id = trainer_id
      and lower(r.student_email) = lower(coalesce(auth.email(), ''))
  )
);

drop policy if exists "slots_insert_student" on public.time_slots;
create policy "slots_insert_student" on public.time_slots
for insert to authenticated
with check (
  exists (
    select 1
    from public.weekly_schedules s
    join public.trainer_profiles tp on tp.id = s.trainer_id
    join public.trainers t on t.user_id = tp.user_id
    join public.student_rosters r on r.trainer_id = t.id
    where s.id = schedule_id
      and lower(r.student_email) = lower(coalesce(auth.email(), ''))
  )
);
