-- Previously only the trainer could create a weekly_schedules/time_slots row
-- (schedules_insert_own / slots_write_own). That means if a registered student
-- opens /booking before the trainer has ever opened /schedule for that week,
-- there is nothing to write their picks against. Add an additive insert-only
-- policy so a registered student can bootstrap the week's schedule + slot grid
-- too. Trainer-only update/delete/close behavior is unaffected.

drop policy if exists "schedules_insert_student" on public.weekly_schedules;
create policy "schedules_insert_student" on public.weekly_schedules
for insert to authenticated
with check (
  exists (
    select 1 from public.student_rosters r
    where r.trainer_id = trainer_id
      and lower(r.student_email) = lower(coalesce(auth.email(), ''))
  )
);

drop policy if exists "slots_insert_student" on public.time_slots;
create policy "slots_insert_student" on public.time_slots
for insert to authenticated
with check (
  exists (
    select 1 from public.weekly_schedules s
    join public.student_rosters r on r.trainer_id = s.trainer_id
    where s.id = schedule_id
      and lower(r.student_email) = lower(coalesce(auth.email(), ''))
  )
);
