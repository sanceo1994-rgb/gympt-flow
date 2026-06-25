-- The manual-move dialog has always promised "해당 시간에 다른 회원이 배정되어
-- 있다면 자동으로 비웁니다" (whoever else is in that slot gets bumped
-- automatically), but confirm_weekly_schedule only ever cleared the MOVING
-- student's own previous slot — it never evicted a *different* student
-- already confirmed at the destination slot. Two students could end up
-- confirmed at the same time, which is exactly what showed up as "2 people
-- in one cell" on the trainer's recommended-schedule view and on the
-- student-facing weekly timetable (both read from the same underlying rows,
-- so the bug was visible in both, not a sync issue between them).
drop function if exists public.confirm_weekly_schedule(uuid, jsonb, boolean);

create or replace function public.confirm_weekly_schedule(
  p_schedule_id uuid,
  p_assignments jsonb,
  p_mark_week_confirmed boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_week_start date;
  v_stale jsonb;
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

  -- Snapshot the confirmed slots about to be replaced *before* deleting them,
  -- so we can also clear their stale pt_sessions rows further down.
  select coalesce(jsonb_agg(jsonb_build_object(
           'student_user_id', sel.student_user_id,
           'slot_id', sel.slot_id
         )), '[]'::jsonb)
    into v_stale
  from public.student_selections sel
  join jsonb_array_elements(p_assignments) as rec
    on sel.student_user_id = (rec->>'student_user_id')::uuid
  where sel.schedule_id = p_schedule_id
    and sel.status = 'confirmed'
    and sel.slot_id is distinct from (rec->>'slot_id')::uuid;

  -- A moved student's old confirmed slot must be cleared first, otherwise
  -- they'd end up "confirmed" at both the old and new slot (inflating the
  -- demand heatmap and leaving a stale row pt_sessions can't reconcile).
  delete from public.student_selections sel
  using jsonb_array_elements(v_stale) as rec
  where sel.schedule_id = p_schedule_id
    and sel.student_user_id = (rec->>'student_user_id')::uuid
    and sel.slot_id = (rec->>'slot_id')::uuid;

  -- Evict whoever else is currently confirmed at a slot we're about to hand
  -- to a different student.
  with incoming0 as (
    select
      (rec->>'slot_id')::uuid as slot_id,
      (rec->>'student_user_id')::uuid as student_user_id
    from jsonb_array_elements(p_assignments) as rec
  )
  delete from public.student_selections sel
  using incoming0 i
  where sel.schedule_id = p_schedule_id
    and sel.slot_id = i.slot_id
    and sel.status = 'confirmed'
    and sel.student_user_id is distinct from i.student_user_id;

  -- Same eviction, but against pt_sessions directly by (trainer, time) — this
  -- is what actually catches an unregistered occupant, since they have no
  -- student_selections row for the delete above to find.
  with incoming1 as (
    select (rec->>'slot_id')::uuid as slot_id, (rec->>'student_user_id')::uuid as student_user_id
    from jsonb_array_elements(p_assignments) as rec
  ),
  target as (
    select
      r.id as incoming_roster_id,
      (v_week_start + ts.day_of_week * interval '1 day' + ts.hour * interval '1 hour') as scheduled_at
    from incoming1 i
    join public.time_slots ts on ts.id = i.slot_id
    join public.student_rosters r on r.trainer_id = v_trainer_id and r.student_user_id = i.student_user_id
  )
  delete from public.pt_sessions ps
  using target t
  where ps.trainer_id = v_trainer_id
    and ps.scheduled_at = t.scheduled_at
    and ps.status = 'scheduled'
    and ps.roster_id <> t.incoming_roster_id;

  with incoming as (
    select
      (rec->>'slot_id')::uuid as slot_id,
      (rec->>'student_user_id')::uuid as student_user_id,
      rec->>'student_name' as student_name,
      coalesce(rec->>'method', 'auto') as method
    from jsonb_array_elements(p_assignments) as rec
  ),
  upsert_selection as (
    update public.student_selections sel
    set status = 'confirmed', assigned_method = i.method
    from incoming i
    where sel.schedule_id = p_schedule_id
      and sel.slot_id = i.slot_id
      and sel.student_user_id = i.student_user_id
    returning sel.slot_id, sel.student_user_id
  ),
  missing as (
    select i.*
    from incoming i
    left join upsert_selection u
      on u.slot_id = i.slot_id and u.student_user_id = i.student_user_id
    where u.slot_id is null
  )
  insert into public.student_selections (
    schedule_id, slot_id, student_user_id, student_name, status, assigned_method
  )
  select p_schedule_id, slot_id, student_user_id, student_name, 'confirmed', method
  from missing;

  with incoming as (
    select
      (rec->>'slot_id')::uuid as slot_id,
      (rec->>'student_user_id')::uuid as student_user_id
    from jsonb_array_elements(p_assignments) as rec
  ),
  resolved as (
    select
      i.student_user_id,
      r.id as roster_id,
      (v_week_start + ts.day_of_week * interval '1 day' + ts.hour * interval '1 hour') as scheduled_at
    from incoming i
    join public.time_slots ts on ts.id = i.slot_id
    join public.student_rosters r on r.trainer_id = v_trainer_id and r.student_user_id = i.student_user_id
  )
  insert into public.pt_sessions (trainer_id, roster_id, student_user_id, scheduled_at, status)
  select v_trainer_id, roster_id, student_user_id, scheduled_at, 'scheduled'
  from resolved
  on conflict (roster_id, scheduled_at) do update set
    student_user_id = excluded.student_user_id,
    status = 'scheduled';

  -- Clear the ghost pt_sessions row left behind at the student's previous
  -- slot time, so the trainer's confirmed schedule and the student's PT
  -- history always agree.
  delete from public.pt_sessions ps
  using (
    select
      r.id as roster_id,
      (v_week_start + ts.day_of_week * interval '1 day' + ts.hour * interval '1 hour') as scheduled_at
    from jsonb_array_elements(v_stale) as rec
    join public.time_slots ts on ts.id = (rec->>'slot_id')::uuid
    join public.student_rosters r
      on r.trainer_id = v_trainer_id
      and r.student_user_id = (rec->>'student_user_id')::uuid
  ) old_sessions
  where ps.trainer_id = v_trainer_id
    and ps.roster_id = old_sessions.roster_id
    and ps.scheduled_at = old_sessions.scheduled_at
    and ps.status = 'scheduled';

  if p_mark_week_confirmed then
    update public.weekly_schedules set confirmed_at = now() where id = p_schedule_id;
  end if;
end;
$$;

revoke all on function public.confirm_weekly_schedule(uuid, jsonb, boolean) from public, anon;
grant execute on function public.confirm_weekly_schedule(uuid, jsonb, boolean) to authenticated;

-- Students with no linked auth account can't go through
-- confirm_weekly_schedule (it requires student_user_id), so the client wrote
-- directly to pt_sessions for them. That left the client trusting its own
-- (sometimes stale) idea of "their previous slot" to know what to clean up,
-- and never evicted a different occupant of the destination slot at all —
-- the other half of the same double-booking bug. Do both server-side instead.
create or replace function public.assign_unregistered_roster(
  p_schedule_id uuid,
  p_roster_id uuid,
  p_slot_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_week_start date;
  v_scheduled_at timestamptz;
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

  if not exists (
    select 1 from public.student_rosters r
    where r.id = p_roster_id and r.trainer_id = v_trainer_id
  ) then
    raise exception 'roster_not_found';
  end if;

  select (v_week_start + ts.day_of_week * interval '1 day' + ts.hour * interval '1 hour')
    into v_scheduled_at
  from public.time_slots ts
  where ts.id = p_slot_id and ts.schedule_id = p_schedule_id;

  if v_scheduled_at is null then
    raise exception 'slot_not_found';
  end if;

  -- Evict whoever else currently occupies the destination slot, registered
  -- or not.
  delete from public.student_selections sel
  where sel.schedule_id = p_schedule_id
    and sel.slot_id = p_slot_id
    and sel.status = 'confirmed';

  delete from public.pt_sessions ps
  where ps.trainer_id = v_trainer_id
    and ps.scheduled_at = v_scheduled_at
    and ps.status = 'scheduled'
    and ps.roster_id <> p_roster_id;

  -- Clear this roster's own previous slot anywhere in the current week —
  -- looked up directly against pt_sessions (not client-supplied state) since
  -- an unregistered roster has no student_selections row to drive this from.
  delete from public.pt_sessions ps
  where ps.trainer_id = v_trainer_id
    and ps.roster_id = p_roster_id
    and ps.status = 'scheduled'
    and ps.scheduled_at >= v_week_start
    and ps.scheduled_at < v_week_start + interval '7 days'
    and ps.scheduled_at <> v_scheduled_at;

  insert into public.pt_sessions (trainer_id, roster_id, student_user_id, scheduled_at, status)
  values (v_trainer_id, p_roster_id, null, v_scheduled_at, 'scheduled')
  on conflict (roster_id, scheduled_at) do update set status = 'scheduled';
end;
$$;

revoke all on function public.assign_unregistered_roster(uuid, uuid, uuid) from public, anon;
grant execute on function public.assign_unregistered_roster(uuid, uuid, uuid) to authenticated;

create or replace function public.cancel_unregistered_roster_assignment(
  p_schedule_id uuid,
  p_roster_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_week_start date;
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

  delete from public.pt_sessions ps
  where ps.trainer_id = v_trainer_id
    and ps.roster_id = p_roster_id
    and ps.status = 'scheduled'
    and ps.scheduled_at >= v_week_start
    and ps.scheduled_at < v_week_start + interval '7 days';
end;
$$;

revoke all on function public.cancel_unregistered_roster_assignment(uuid, uuid) from public, anon;
grant execute on function public.cancel_unregistered_roster_assignment(uuid, uuid) to authenticated;

-- One-time cleanup of existing double-bookings (two different rosters
-- confirmed at the exact same trainer+time) caused by the bug above. Keep
-- only the most recently updated occupant per (trainer, time).
with ranked_sessions as (
  select
    id,
    row_number() over (
      partition by trainer_id, scheduled_at
      order by updated_at desc, created_at desc
    ) as rn
  from public.pt_sessions
  where status = 'scheduled'
)
delete from public.pt_sessions ps
using ranked_sessions r
where ps.id = r.id
  and r.rn > 1;

-- Same cleanup on the student_selections side: two different students both
-- left "confirmed" against the same slot.
with ranked_selections as (
  select
    id,
    row_number() over (
      partition by schedule_id, slot_id
      order by created_at desc
    ) as rn
  from public.student_selections
  where status = 'confirmed' and slot_id is not null
)
delete from public.student_selections sel
using ranked_selections r
where sel.id = r.id
  and r.rn > 1;

select pg_notify('pgrst', 'reload schema');
