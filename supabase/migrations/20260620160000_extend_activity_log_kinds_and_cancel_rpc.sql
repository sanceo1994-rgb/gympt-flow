-- The activity feed needs to log a few more trainer-driven events than the
-- original "confirm"/"manual" pair covered: sending the initial weekly
-- availability request, and rescheduling/cancelling an already-confirmed
-- assignment. "completed" and same-day "cancelled" entries are deliberately
-- NOT stored here — they're derived live from pt_sessions.scheduled_at /
-- status, since that table is already the source of truth for session time
-- and survives independent of this log.
alter table public.schedule_activity_log
  add column if not exists from_day text,
  add column if not exists from_hour int;

alter table public.schedule_activity_log drop constraint if exists schedule_activity_log_kind_check;
alter table public.schedule_activity_log add constraint schedule_activity_log_kind_check
  check (kind in ('confirm', 'manual', 'reschedule', 'request', 'cancel_confirmed'));

-- Lets a trainer undo a confirmed assignment for an upcoming (not yet
-- started) week without deleting the student's underlying picks: the
-- selection reverts to 'selected' so it can be reassigned later, and the
-- now-stale pt_sessions row is removed the same way a manual move clears
-- its old slot (see 20260620153520_fix_stale_pt_sessions_on_move.sql).
create or replace function public.cancel_confirmed_assignment(
  p_schedule_id uuid,
  p_student_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_week_start date;
  v_slot_id uuid;
begin
  select t.id, s.week_start
    into v_trainer_id, v_week_start
  from public.weekly_schedules s
  join public.trainer_profiles tp on tp.id = s.trainer_id
  join public.trainers t on t.user_id = tp.user_id
  where s.id = p_schedule_id
    and tp.user_id = auth.uid();

  if v_trainer_id is null then
    raise exception 'not_authorized_or_not_found';
  end if;

  select sel.slot_id into v_slot_id
  from public.student_selections sel
  where sel.schedule_id = p_schedule_id
    and sel.student_user_id = p_student_user_id
    and sel.status = 'confirmed';

  if v_slot_id is null then
    raise exception 'no_confirmed_assignment';
  end if;

  update public.student_selections
  set status = 'selected'
  where schedule_id = p_schedule_id
    and student_user_id = p_student_user_id
    and status = 'confirmed';

  delete from public.pt_sessions ps
  using public.time_slots ts, public.student_rosters r
  where ts.id = v_slot_id
    and r.trainer_id = v_trainer_id
    and r.student_user_id = p_student_user_id
    and ps.trainer_id = v_trainer_id
    and ps.roster_id = r.id
    and ps.scheduled_at = (v_week_start + ts.day_of_week * interval '1 day' + ts.hour * interval '1 hour')
    and ps.status = 'scheduled';
end;
$$;

revoke all on function public.cancel_confirmed_assignment(uuid, uuid) from public, anon;
grant execute on function public.cancel_confirmed_assignment(uuid, uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
